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

function getBaseUrl(req: VercelRequest) {
  const appUrl = process.env.APP_URL;

  if (appUrl) {
    return appUrl.replace(/\/$/, "");
  }

  const host = req.headers.host;

  if (host) {
    return `https://${host}`.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL;

  if (vercelUrl) {
    return `https://${vercelUrl}`.replace(/\/$/, "");
  }

  return "";
}

function getVercelBypassHeaders() {
  const bypassSecret =
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
    process.env.VERCEL_PROTECTION_BYPASS_SECRET ||
    "";

  if (!bypassSecret) {
    return {};
  }

  return {
    "x-vercel-protection-bypass": bypassSecret,
  };
}

function getPublishHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getVercelBypassHeaders(),
  };

  const publishSecret = process.env.PUBLISH_SECRET;

  if (publishSecret) {
    headers.Authorization = `Bearer ${publishSecret}`;
  }

  return headers;
}

async function markPostFailed(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  postId: string;
  errorMessage: string;
}) {
  const { supabaseUrl, serviceRoleKey, postId, errorMessage } = params;

  const updateUrl =
    `${supabaseUrl}/rest/v1/posts` + `?id=eq.${encodeURIComponent(postId)}`;

  return requestJson(updateUrl, {
    method: "PATCH",
    headers: supabaseHeaders(serviceRoleKey),
    body: {
      status: "failed",
      error_message: errorMessage.slice(0, 1000),
      updated_at: new Date().toISOString(),
    },
  });
}

function cleanErrorMessage(text: string) {
  if (!text) {
    return "Falha ao publicar post agendado automaticamente.";
  }

  if (
    text.includes("Authentication Required") ||
    text.includes("Deployment Protection")
  ) {
    return "Falha ao publicar: a rota /api/meta/publish está protegida pela Vercel. Configure VERCEL_AUTOMATION_BYPASS_SECRET ou desative a proteção do deploy.";
  }

  return text.slice(0, 1000);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({
        error: "Método não permitido.",
      });
    }

    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const authorization = req.headers.authorization || "";

      if (authorization !== `Bearer ${cronSecret}`) {
        return res.status(401).json({
          error: "Não autorizado.",
        });
      }
    }

    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error: "Configuração do Supabase ausente.",
        missing: {
          supabaseUrl: !supabaseUrl,
          serviceRoleKey: !serviceRoleKey,
        },
      });
    }

    const baseUrl = getBaseUrl(req);

    if (!baseUrl) {
      return res.status(500).json({
        error:
          "APP_URL ausente. Configure APP_URL nas variáveis de ambiente da Vercel.",
      });
    }

    const nowIso = new Date().toISOString();

    const scheduledUrl =
      `${supabaseUrl}/rest/v1/posts` +
      `?status=eq.scheduled` +
      `&scheduled_at=lte.${encodeURIComponent(nowIso)}` +
      `&select=id,title,scheduled_at,status` +
      `&order=scheduled_at.asc` +
      `&limit=10`;

    const scheduledResult = await requestJson(scheduledUrl, {
      method: "GET",
      headers: supabaseHeaders(serviceRoleKey),
    });

    if (!scheduledResult.ok) {
      return res.status(500).json({
        error: "Erro ao buscar posts agendados.",
        status: scheduledResult.status,
        details: scheduledResult.text,
      });
    }

    const scheduledPosts = Array.isArray(scheduledResult.data)
      ? scheduledResult.data
      : [];

    if (scheduledPosts.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Nenhum post agendado para publicar agora.",
        checkedAt: nowIso,
        published: 0,
        failed: 0,
      });
    }

    const results: any[] = [];

    for (const post of scheduledPosts) {
      try {
        const publishUrl = `${baseUrl}/api/meta/publish`;

        const publishResult = await requestJson(publishUrl, {
          method: "POST",
          headers: getPublishHeaders(),
          body: {
            postId: post.id,
          },
        });

        results.push({
          postId: post.id,
          title: post.title,
          ok: publishResult.ok,
          status: publishResult.status,
          response: publishResult.data,
        });

        if (!publishResult.ok) {
          await markPostFailed({
            supabaseUrl,
            serviceRoleKey,
            postId: post.id,
            errorMessage: cleanErrorMessage(publishResult.text),
          });
        }
      } catch (error: any) {
        const message =
          error?.message || "Erro inesperado ao publicar post agendado.";

        await markPostFailed({
          supabaseUrl,
          serviceRoleKey,
          postId: post.id,
          errorMessage: message,
        });

        results.push({
          postId: post.id,
          title: post.title,
          ok: false,
          error: message,
        });
      }
    }

    const published = results.filter((item) => item.ok).length;
    const failed = results.filter((item) => !item.ok).length;

    return res.status(200).json({
      success: true,
      message: "Verificação de posts agendados concluída.",
      checkedAt: nowIso,
      baseUrl,
      total: results.length,
      published,
      failed,
      results,
    });
  } catch (error: any) {
    console.error("Erro no cron de posts agendados:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });

    return res.status(500).json({
      error: "Erro inesperado no cron de posts agendados.",
      details: error?.message || String(error),
    });
  }
}
