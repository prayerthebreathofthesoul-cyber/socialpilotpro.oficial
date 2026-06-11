import type { VercelRequest, VercelResponse } from "@vercel/node";
import https from "https";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type HttpResult = {
  status: number;
  ok: boolean;
  data: any;
  text: string;
};

function requestJson(
  urlString: string,
  options: {
    method?: HttpMethod;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);

    const body =
      options.body !== undefined ? JSON.stringify(options.body) : undefined;

    const req = https.request(
      {
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(body
            ? { "Content-Length": Buffer.byteLength(body).toString() }
            : {}),
          ...(options.headers || {}),
        },
      },
      (response) => {
        let responseText = "";

        response.on("data", (chunk) => {
          responseText += chunk;
        });

        response.on("end", () => {
          let data: any = null;

          try {
            data = responseText ? JSON.parse(responseText) : null;
          } catch {
            data = responseText;
          }

          const status = response.statusCode || 500;

          resolve({
            status,
            ok: status >= 200 && status < 300,
            data,
            text: responseText,
          });
        });
      }
    );

    req.on("error", reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

function supabaseHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Prefer: "return=representation",
  };
}

function normalizeCaption(caption?: string | null, hashtags?: string | null) {
  const cleanCaption = String(caption || "").trim();
  const cleanHashtags = String(hashtags || "").trim();

  const fullText = [cleanCaption, cleanHashtags].filter(Boolean).join("\n\n");

  if (!fullText) {
    return "Publicado pelo SocialPilot Pro";
  }

  return fullText.slice(0, 2200);
}

function isVideoUrl(url?: string | null) {
  if (!url) return false;

  const cleanUrl = url.split("?")[0].toLowerCase();

  return (
    cleanUrl.endsWith(".mp4") ||
    cleanUrl.endsWith(".mov") ||
    cleanUrl.endsWith(".m4v") ||
    cleanUrl.endsWith(".webm")
  );
}

function getPrimaryMediaUrl(post: any) {
  const mediaUrls = Array.isArray(post?.media_urls)
    ? post.media_urls.filter(Boolean)
    : [];

  return mediaUrls[0] || post?.media_url || null;
}

async function getPostById(
  supabaseUrl: string,
  serviceRoleKey: string,
  postId: string
) {
  const headers = supabaseHeaders(serviceRoleKey);

  const url =
    `${supabaseUrl}/rest/v1/posts` +
    `?id=eq.${encodeURIComponent(postId)}` +
    `&select=*`;

  const result = await requestJson(url, {
    method: "GET",
    headers,
  });

  if (!result.ok) {
    throw new Error(`Erro ao buscar post: ${result.text}`);
  }

  const post = Array.isArray(result.data) ? result.data[0] : null;

  if (!post) {
    throw new Error("Post não encontrado.");
  }

  return post;
}

async function getTikTokAccount(
  supabaseUrl: string,
  serviceRoleKey: string,
  companyId: string
) {
  const headers = supabaseHeaders(serviceRoleKey);

  const url =
    `${supabaseUrl}/rest/v1/social_accounts` +
    `?company_id=eq.${encodeURIComponent(companyId)}` +
    `&platform=eq.tiktok` +
    `&status=eq.connected` +
    `&is_connected=eq.true` +
    `&select=*`;

  const result = await requestJson(url, {
    method: "GET",
    headers,
  });

  if (!result.ok) {
    throw new Error(`Erro ao buscar conta TikTok: ${result.text}`);
  }

  const account = Array.isArray(result.data) ? result.data[0] : null;

  if (!account?.access_token) {
    throw new Error(
      "Conta TikTok conectada não encontrada. Reconecte o TikTok nas configurações."
    );
  }

  return account;
}

async function updatePostStatus(
  supabaseUrl: string,
  serviceRoleKey: string,
  postId: string,
  payload: Record<string, any>
) {
  const headers = supabaseHeaders(serviceRoleKey);

  const url =
    `${supabaseUrl}/rest/v1/posts` + `?id=eq.${encodeURIComponent(postId)}`;

  const result = await requestJson(url, {
    method: "PATCH",
    headers,
    body: {
      ...payload,
      updated_at: new Date().toISOString(),
    },
  });

  if (!result.ok) {
    console.error("Erro ao atualizar post:", result.status, result.text);
  }

  return result;
}

async function queryCreatorInfo(accessToken: string) {
  return requestJson(
    "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {},
    }
  );
}

async function initializeDirectVideoPost(params: {
  accessToken: string;
  videoUrl: string;
  title: string;
  privacyLevel: string;
}) {
  return requestJson(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
      body: {
        post_info: {
          title: params.title,
          privacy_level: params.privacyLevel,
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: params.videoUrl,
        },
      },
    }
  );
}

function choosePrivacyLevel(creatorInfo: any) {
  const options = creatorInfo?.data?.privacy_level_options;

  if (Array.isArray(options) && options.includes("SELF_ONLY")) {
    return "SELF_ONLY";
  }

  if (Array.isArray(options) && options.length > 0) {
    return options[0];
  }

  return "SELF_ONLY";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Método não permitido. Use POST.",
      });
    }

    const postId = String(req.body?.postId || "").trim();

    if (!postId) {
      return res.status(400).json({
        error: "postId é obrigatório.",
      });
    }

    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error: "Configuração do Supabase ausente.",
      });
    }

    console.log("Publicação TikTok iniciada:", { postId });

    const post = await getPostById(supabaseUrl, serviceRoleKey, postId);

    if (!Array.isArray(post.platforms) || !post.platforms.includes("tiktok")) {
      return res.status(400).json({
        error: "Este post não está marcado para TikTok.",
      });
    }

    const mediaUrl = getPrimaryMediaUrl(post);

    if (!mediaUrl) {
      return res.status(400).json({
        error: "Post sem mídia para publicar no TikTok.",
      });
    }

    if (!String(mediaUrl).startsWith("https://")) {
      return res.status(400).json({
        error: "A mídia do TikTok precisa ser uma URL pública HTTPS.",
      });
    }

    if (!isVideoUrl(mediaUrl)) {
      return res.status(400).json({
        error: "O TikTok aceita vídeo nesta integração. Envie MP4/MOV/WebM.",
      });
    }

    const tiktokAccount = await getTikTokAccount(
      supabaseUrl,
      serviceRoleKey,
      post.company_id
    );

    const accessToken = tiktokAccount.access_token;

    await updatePostStatus(supabaseUrl, serviceRoleKey, postId, {
      status: "publishing",
      error_message: null,
    });

    console.log("Consultando creator_info do TikTok");

    const creatorInfoResult = await queryCreatorInfo(accessToken);

    if (!creatorInfoResult.ok) {
      console.error(
        "Erro creator_info TikTok:",
        creatorInfoResult.status,
        creatorInfoResult.text
      );

      await updatePostStatus(supabaseUrl, serviceRoleKey, postId, {
        status: "failed",
        error_message:
          "TikTok recusou creator_info. Verifique se video.publish está aprovado e reconecte a conta.",
      });

      return res.status(400).json({
        error:
          "TikTok recusou a consulta creator_info. Verifique os escopos video.publish/video.upload e reconecte a conta.",
        details: creatorInfoResult.data || creatorInfoResult.text,
      });
    }

    const privacyLevel = choosePrivacyLevel(creatorInfoResult.data);

    const title = normalizeCaption(post.caption, post.hashtags);

    console.log("Iniciando direct post no TikTok", {
      postId,
      privacyLevel,
      hasVideoUrl: Boolean(mediaUrl),
    });

    const publishResult = await initializeDirectVideoPost({
      accessToken,
      videoUrl: mediaUrl,
      title,
      privacyLevel,
    });

    if (!publishResult.ok || !publishResult.data?.data?.publish_id) {
      console.error(
        "Erro ao iniciar publicação TikTok:",
        publishResult.status,
        publishResult.text
      );

      await updatePostStatus(supabaseUrl, serviceRoleKey, postId, {
        status: "failed",
        error_message:
          publishResult.data?.error?.message ||
          publishResult.data?.error?.code ||
          "Erro ao iniciar publicação no TikTok.",
      });

      return res.status(400).json({
        error: "Erro ao iniciar publicação no TikTok.",
        details: publishResult.data || publishResult.text,
      });
    }

    const publishId = publishResult.data.data.publish_id;

    await updatePostStatus(supabaseUrl, serviceRoleKey, postId, {
      status: "published",
      published_at: new Date().toISOString(),
      error_message: null,
    });

    console.log("Publicação TikTok iniciada com sucesso:", {
      postId,
      publishId,
    });

    return res.status(200).json({
      success: true,
      platform: "tiktok",
      publishId,
      message:
        "Publicação enviada para o TikTok. O processamento pode levar alguns instantes.",
      result: publishResult.data,
    });
  } catch (error: any) {
    console.error("Erro inesperado ao publicar TikTok:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });

    return res.status(500).json({
      error: error?.message || "Erro inesperado ao publicar no TikTok.",
    });
  }
}
