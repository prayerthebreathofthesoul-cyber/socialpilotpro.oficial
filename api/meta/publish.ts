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

function normalizePlatforms(value: any): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.toLowerCase());
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((item) => item.toLowerCase());
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
    }
  }

  return [];
}

function buildCaption(post: any) {
  const caption = post.caption || post.legenda || post.description || "";
  const hashtags = post.hashtags || "";

  return [caption, hashtags].filter(Boolean).join("\n\n").trim();
}

function getMediaUrl(post: any) {
  return (
    post.media_url ||
    post.image_url ||
    post.mediaUrl ||
    post.imageUrl ||
    post.media ||
    ""
  );
}

function isPublicHttpsUrl(url: string) {
  return /^https:\/\/.+/i.test(url);
}

async function updatePostStatus(params: {
  supabaseUrl: string;
  headers: Record<string, string>;
  postId: string;
  status: string;
  errorMessage?: string | null;
}) {
  const { supabaseUrl, headers, postId, status, errorMessage } = params;

  const updateUrl =
    `${supabaseUrl}/rest/v1/posts` + `?id=eq.${encodeURIComponent(postId)}`;

  const body: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "published") {
    body.published_at = new Date().toISOString();
    body.error_message = null;
  }

  if (status === "failed") {
    body.error_message = errorMessage || "Erro ao publicar.";
  }

  return requestJson(updateUrl, {
    method: "PATCH",
    headers,
    body,
  });
}

async function publishToFacebookPage(params: {
  pageId: string;
  pageAccessToken: string;
  imageUrl: string;
  caption: string;
}) {
  const { pageId, pageAccessToken, imageUrl, caption } = params;

  const url = new URL(`https://graph.facebook.com/v20.0/${pageId}/photos`);

  url.searchParams.set("url", imageUrl);
  url.searchParams.set("caption", caption);
  url.searchParams.set("published", "true");
  url.searchParams.set("access_token", pageAccessToken);

  return requestJson(url.toString(), {
    method: "POST",
  });
}

async function publishToInstagramFeed(params: {
  instagramBusinessAccountId: string;
  pageAccessToken: string;
  imageUrl: string;
  caption: string;
}) {
  const {
    instagramBusinessAccountId,
    pageAccessToken,
    imageUrl,
    caption,
  } = params;

  const createContainerUrl = new URL(
    `https://graph.facebook.com/v20.0/${instagramBusinessAccountId}/media`
  );

  createContainerUrl.searchParams.set("image_url", imageUrl);
  createContainerUrl.searchParams.set("caption", caption);
  createContainerUrl.searchParams.set("access_token", pageAccessToken);

  const containerResult = await requestJson(createContainerUrl.toString(), {
    method: "POST",
  });

  if (!containerResult.ok || !containerResult.data?.id) {
    return {
      ok: false,
      step: "create_container",
      result: containerResult,
    };
  }

  const creationId = containerResult.data.id;

  const publishUrl = new URL(
    `https://graph.facebook.com/v20.0/${instagramBusinessAccountId}/media_publish`
  );

  publishUrl.searchParams.set("creation_id", creationId);
  publishUrl.searchParams.set("access_token", pageAccessToken);

  const publishResult = await requestJson(publishUrl.toString(), {
    method: "POST",
  });

  return {
    ok: publishResult.ok && Boolean(publishResult.data?.id),
    step: "publish_container",
    creationId,
    result: publishResult,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Método não permitido. Use POST.",
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

    const headers = supabaseHeaders(serviceRoleKey);

    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;

    const postId = String(body?.postId || body?.id || "");

    if (!postId) {
      return res.status(400).json({
        error: "postId é obrigatório.",
      });
    }

    console.log("Publicação Meta iniciada para post:", postId);

    const postUrl =
      `${supabaseUrl}/rest/v1/posts` +
      `?id=eq.${encodeURIComponent(postId)}` +
      `&select=*`;

    const postResult = await requestJson(postUrl, {
      method: "GET",
      headers,
    });

    if (!postResult.ok) {
      console.error("Erro ao buscar post:", postResult.status, postResult.text);
      return res.status(500).json({
        error: "Erro ao buscar post.",
        details: postResult.text,
      });
    }

    const post = Array.isArray(postResult.data) ? postResult.data[0] : null;

    if (!post) {
      return res.status(404).json({
        error: "Post não encontrado.",
      });
    }

    const companyId = post.company_id;

    if (!companyId) {
      return res.status(400).json({
        error: "Post sem company_id.",
      });
    }

    const imageUrl = getMediaUrl(post);
    const caption = buildCaption(post);
    const platforms = normalizePlatforms(post.platforms);

    if (!imageUrl) {
      await updatePostStatus({
        supabaseUrl,
        headers,
        postId,
        status: "failed",
        errorMessage: "Post sem imagem.",
      });

      return res.status(400).json({
        error: "Post sem imagem.",
      });
    }

    if (!isPublicHttpsUrl(imageUrl)) {
      await updatePostStatus({
        supabaseUrl,
        headers,
        postId,
        status: "failed",
        errorMessage:
          "A imagem precisa ser uma URL pública https. Base64/data:image não funciona na API da Meta.",
      });

      return res.status(400).json({
        error:
          "A imagem precisa ser uma URL pública https. Base64/data:image não funciona na API da Meta.",
        currentMediaUrlStartsWith: imageUrl.slice(0, 40),
      });
    }

    const accountsUrl =
      `${supabaseUrl}/rest/v1/social_accounts` +
      `?company_id=eq.${encodeURIComponent(companyId)}` +
      `&status=eq.connected` +
      `&is_connected=eq.true` +
      `&select=*`;

    const accountsResult = await requestJson(accountsUrl, {
      method: "GET",
      headers,
    });

    if (!accountsResult.ok) {
      console.error(
        "Erro ao buscar contas sociais:",
        accountsResult.status,
        accountsResult.text
      );

      return res.status(500).json({
        error: "Erro ao buscar contas sociais.",
        details: accountsResult.text,
      });
    }

    const accounts = Array.isArray(accountsResult.data)
      ? accountsResult.data
      : [];

    const facebookAccount = accounts.find(
      (account: any) => account.platform === "facebook"
    );

    const instagramAccount = accounts.find(
      (account: any) => account.platform === "instagram"
    );

    if (!facebookAccount?.page_id || !facebookAccount?.access_token) {
      await updatePostStatus({
        supabaseUrl,
        headers,
        postId,
        status: "failed",
        errorMessage: "Página do Facebook não conectada corretamente.",
      });

      return res.status(400).json({
        error: "Página do Facebook não conectada corretamente.",
      });
    }

    const selectedPlatforms =
      platforms.length > 0 ? platforms : ["facebook", "instagram"];

    const results: Record<string, any> = {};

    if (selectedPlatforms.includes("facebook")) {
      console.log("Publicando no Facebook:", facebookAccount.page_id);

      const facebookResult = await publishToFacebookPage({
        pageId: facebookAccount.page_id,
        pageAccessToken: facebookAccount.access_token,
        imageUrl,
        caption,
      });

      results.facebook = {
        ok: facebookResult.ok,
        status: facebookResult.status,
        data: facebookResult.data,
        text: facebookResult.text,
      };
    }

    if (selectedPlatforms.includes("instagram")) {
      const instagramBusinessAccountId =
        instagramAccount?.instagram_business_account_id ||
        facebookAccount?.instagram_business_account_id;

      if (!instagramBusinessAccountId) {
        results.instagram = {
          ok: false,
          error: "Instagram não conectado corretamente.",
        };
      } else {
        console.log("Publicando no Instagram:", instagramBusinessAccountId);

        const instagramResult = await publishToInstagramFeed({
          instagramBusinessAccountId,
          pageAccessToken:
            instagramAccount?.access_token || facebookAccount.access_token,
          imageUrl,
          caption,
        });

        results.instagram = {
          ok: instagramResult.ok,
          step: instagramResult.step,
          creationId: instagramResult.creationId,
          status: instagramResult.result.status,
          data: instagramResult.result.data,
          text: instagramResult.result.text,
        };
      }
    }

    const hasFailure = Object.values(results).some(
      (result: any) => !result?.ok
    );

    if (hasFailure) {
      console.error("Falha em uma ou mais plataformas:", JSON.stringify(results));

      await updatePostStatus({
        supabaseUrl,
        headers,
        postId,
        status: "failed",
        errorMessage: JSON.stringify(results),
      });

      return res.status(400).json({
        error: "Falha ao publicar em uma ou mais plataformas.",
        results,
      });
    }

    await updatePostStatus({
      supabaseUrl,
      headers,
      postId,
      status: "published",
    });

    console.log("Post publicado com sucesso:", JSON.stringify(results));

    return res.status(200).json({
      success: true,
      message: "Post publicado com sucesso.",
      results,
    });
  } catch (error: any) {
    console.error("Erro inesperado ao publicar:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });

    return res.status(500).json({
      error: "Erro inesperado ao publicar.",
      details: error?.message || String(error),
    });
  }
}
