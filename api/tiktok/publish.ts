import type { VercelRequest, VercelResponse } from "@vercel/node";
import https from "https";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type HttpResult = {
  status: number;
  ok: boolean;
  data: any;
  text: string;
};

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function setCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;

  const allowedOrigins = [
    "https://socialpilotpro.com.br",
    "https://www.socialpilotpro.com.br",
    "https://socialpilotproficial.vercel.app",
  ];

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
}

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
          "Content-Type": "application/json; charset=UTF-8",
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

function downloadVideoBuffer(
  urlString: string,
  redirects = 0
): Promise<{ buffer: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error("Muitos redirecionamentos ao baixar o vídeo."));
      return;
    }

    const url = new URL(urlString);

    const req = https.request(
      {
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: {
          "User-Agent": "SocialPilotPro/1.0",
        },
      },
      (response) => {
        const status = response.statusCode || 500;

        if ([301, 302, 303, 307, 308].includes(status)) {
          const location = response.headers.location;

          if (!location) {
            reject(new Error("Redirecionamento do vídeo sem location."));
            return;
          }

          const nextUrl = new URL(location, urlString).toString();
          resolve(downloadVideoBuffer(nextUrl, redirects + 1));
          return;
        }

        if (status < 200 || status >= 300) {
          reject(new Error(`Erro ao baixar vídeo. Status ${status}.`));
          return;
        }

        const contentLength = Number(response.headers["content-length"] || 0);

        if (contentLength > MAX_VIDEO_BYTES) {
          reject(new Error("Vídeo maior que 50MB. Envie um vídeo menor."));
          return;
        }

        const chunks: Buffer[] = [];
        let total = 0;

        response.on("data", (chunk) => {
          const bufferChunk = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk);

          total += bufferChunk.length;

          if (total > MAX_VIDEO_BYTES) {
            req.destroy();
            reject(new Error("Vídeo maior que 50MB. Envie um vídeo menor."));
            return;
          }

          chunks.push(bufferChunk);
        });

        response.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const contentType =
            String(response.headers["content-type"] || "").split(";")[0] ||
            "video/mp4";

          resolve({
            buffer,
            contentType,
          });
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}

function uploadVideoToTikTok(params: {
  uploadUrl: string;
  videoBuffer: Buffer;
  contentType: string;
}): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const url = new URL(params.uploadUrl);
    const videoSize = params.videoBuffer.length;

    const req = https.request(
      {
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: "PUT",
        headers: {
          "Content-Type": params.contentType || "video/mp4",
          "Content-Length": videoSize.toString(),
          "Content-Range": `bytes 0-${videoSize - 1}/${videoSize}`,
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
    req.write(params.videoBuffer);
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

async function initializeDirectVideoFileUpload(params: {
  accessToken: string;
  title: string;
  privacyLevel: string;
  videoSize: number;
}) {
  const videoSize = params.videoSize;

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
          source: "FILE_UPLOAD",
          video_size: videoSize,
          chunk_size: videoSize,
          total_chunk_count: 1,
        },
      },
    }
  );
}

function choosePrivacyLevel(creatorInfo: any) {
  const options = creatorInfo?.data?.privacy_level_options;

  console.log("Opções de privacidade retornadas pelo TikTok:", {
    privacyLevelOptions: options,
  });

  // Em Sandbox / app não auditado, precisa ser privado.
  // Mesmo se o TikTok não listar SELF_ONLY, forçamos SELF_ONLY para evitar
  // o erro unaudited_client_can_only_post_to_private_accounts.
  return "SELF_ONLY";
}

function getTikTokErrorCode(data: any) {
  return data?.error?.code || data?.data?.error_code || null;
}

function getTikTokErrorMessage(data: any) {
  return data?.error?.message || data?.message || null;
}

function getFriendlyTikTokError(data: any, fallback: string) {
  const code = getTikTokErrorCode(data);
  const message = getTikTokErrorMessage(data);

  if (code === "unaudited_client_can_only_post_to_private_accounts") {
    return (
      "O TikTok bloqueou porque o app ainda está em Sandbox/não auditado. " +
      "Para testar Direct Post, use privacidade SELF_ONLY e, se continuar, " +
      "deixe a conta TikTok de teste como privada ou use o fluxo de rascunho/upload."
    );
  }

  if (code === "scope_not_authorized") {
    return (
      "O TikTok recusou por permissão não autorizada. Reconecte a conta e confira " +
      "se os escopos video.publish/video.upload estão habilitados no TikTok Developers."
    );
  }

  if (code === "url_ownership_unverified") {
    return (
      "O TikTok recusou a URL do vídeo por domínio não verificado. " +
      "A rota já usa FILE_UPLOAD, então confirme se o deploy novo está ativo."
    );
  }

  return message || code || fallback;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

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

    console.log("Baixando vídeo para envio FILE_UPLOAD:", {
      postId,
      mediaUrl,
    });

    const downloadedVideo = await downloadVideoBuffer(mediaUrl);

    if (!downloadedVideo.buffer.length) {
      throw new Error("Não foi possível baixar o vídeo da postagem.");
    }

    if (downloadedVideo.buffer.length > MAX_VIDEO_BYTES) {
      throw new Error("Vídeo maior que 50MB. Envie um vídeo menor.");
    }

    console.log("Vídeo baixado com sucesso:", {
      postId,
      videoSize: downloadedVideo.buffer.length,
      contentType: downloadedVideo.contentType,
    });

    console.log("Consultando creator_info do TikTok");

    const creatorInfoResult = await queryCreatorInfo(accessToken);

    if (!creatorInfoResult.ok) {
      console.error(
        "Erro creator_info TikTok:",
        creatorInfoResult.status,
        creatorInfoResult.text
      );

      const friendlyError = getFriendlyTikTokError(
        creatorInfoResult.data,
        "TikTok recusou creator_info. Verifique as permissões e reconecte a conta."
      );

      await updatePostStatus(supabaseUrl, serviceRoleKey, postId, {
        status: "failed",
        error_message: friendlyError,
      });

      return res.status(400).json({
        error: friendlyError,
        details: creatorInfoResult.data || creatorInfoResult.text,
      });
    }

    const privacyLevel = choosePrivacyLevel(creatorInfoResult.data);
    const title = normalizeCaption(post.caption, post.hashtags);

    console.log("Inicializando FILE_UPLOAD no TikTok", {
      postId,
      privacyLevel,
      videoSize: downloadedVideo.buffer.length,
    });

    const initResult = await initializeDirectVideoFileUpload({
      accessToken,
      title,
      privacyLevel,
      videoSize: downloadedVideo.buffer.length,
    });

    const publishId = initResult.data?.data?.publish_id;
    const uploadUrl = initResult.data?.data?.upload_url;

    if (!initResult.ok || !publishId || !uploadUrl) {
      console.error(
        "Erro ao inicializar FILE_UPLOAD TikTok:",
        initResult.status,
        initResult.text
      );

      const friendlyError = getFriendlyTikTokError(
        initResult.data,
        "Erro ao inicializar envio do vídeo no TikTok."
      );

      await updatePostStatus(supabaseUrl, serviceRoleKey, postId, {
        status: "failed",
        error_message: friendlyError,
      });

      return res.status(400).json({
        error: friendlyError,
        details: initResult.data || initResult.text,
      });
    }

    console.log("Enviando arquivo para upload_url do TikTok", {
      postId,
      publishId,
    });

    const uploadResult = await uploadVideoToTikTok({
      uploadUrl,
      videoBuffer: downloadedVideo.buffer,
      contentType: downloadedVideo.contentType || "video/mp4",
    });

    if (!uploadResult.ok) {
      console.error(
        "Erro ao enviar arquivo para TikTok:",
        uploadResult.status,
        uploadResult.text
      );

      const friendlyError = getFriendlyTikTokError(
        uploadResult.data,
        "Erro ao enviar vídeo para o TikTok."
      );

      await updatePostStatus(supabaseUrl, serviceRoleKey, postId, {
        status: "failed",
        error_message: friendlyError,
      });

      return res.status(400).json({
        error: friendlyError,
        details: uploadResult.data || uploadResult.text,
      });
    }

    await updatePostStatus(supabaseUrl, serviceRoleKey, postId, {
      status: "published",
      published_at: new Date().toISOString(),
      error_message: null,
    });

    console.log("Publicação TikTok enviada com sucesso:", {
      postId,
      publishId,
    });

    return res.status(200).json({
      success: true,
      platform: "tiktok",
      publishId,
      message:
        "Vídeo enviado para o TikTok com privacidade SELF_ONLY. O processamento pode levar alguns instantes.",
      result: initResult.data,
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
