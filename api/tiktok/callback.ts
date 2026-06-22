import type { VercelRequest, VercelResponse } from "@vercel/node";
import https from "https";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type HttpResult = {
  status: number;
  ok: boolean;
  data: any;
  text: string;
};

type TikTokOAuthState = {
  state: string;
  company_id: string;
  expires_at: string;
};

function getSiteBaseUrl() {
  const configuredUrl =
    process.env.PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL ||
    "https://socialpilotpro.com.br";

  return configuredUrl.replace(/\/$/, "");
}

function redirectToSettings(
  res: VercelResponse,
  status: string,
  message?: string
) {
  const url = new URL("/settings", getSiteBaseUrl());

  url.searchParams.set("tiktok", status);

  if (message) {
    url.searchParams.set("message", message.slice(0, 120));
  }

  return res.redirect(302, url.toString());
}

function requestJson(
  urlString: string,
  options: {
    method?: HttpMethod;
    headers?: Record<string, string>;
    body?: any;
    formBody?: URLSearchParams;
    timeoutMs?: number;
  } = {}
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);

    let body: string | undefined;

    if (options.formBody) {
      body = options.formBody.toString();
    } else if (options.body !== undefined) {
      body = JSON.stringify(options.body);
    }

    const contentType = options.formBody
      ? "application/x-www-form-urlencoded"
      : "application/json";

    const timeoutMs = options.timeoutMs || 12000;

    const apiReq = https.request(
      {
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: options.method || "GET",
        headers: {
          "Content-Type": contentType,
          Accept: "application/json",
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

    apiReq.setTimeout(timeoutMs, () => {
      apiReq.destroy(new Error(`Request timeout: ${url.hostname}`));
    });

    apiReq.on("error", reject);

    if (body) {
      apiReq.write(body);
    }

    apiReq.end();
  });
}

function supabaseHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Prefer: "return=representation",
  };
}

function addSecondsToNow(seconds?: number | null) {
  if (!seconds || Number.isNaN(Number(seconds))) {
    return null;
  }

  return new Date(Date.now() + Number(seconds) * 1000).toISOString();
}

function isSafeOAuthState(state: string) {
  return /^[a-zA-Z0-9._-]{24,256}$/.test(state);
}

function isValidIsoDate(value?: string | null) {
  if (!value) return false;
  return Number.isFinite(new Date(value).getTime());
}

async function getTikTokUserInfo(accessToken: string) {
  const url = new URL("https://open.tiktokapis.com/v2/user/info/");

  url.searchParams.set(
    "fields",
    "open_id,union_id,avatar_url,display_name,username"
  );

  return requestJson(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    timeoutMs: 12000,
  });
}

async function deleteOAuthState(
  supabaseUrl: string,
  serviceRoleKey: string,
  state: string
) {
  const deleteStateUrl =
    `${supabaseUrl}/rest/v1/tiktok_oauth_states` +
    `?state=eq.${encodeURIComponent(state)}`;

  const result = await requestJson(deleteStateUrl, {
    method: "DELETE",
    headers: supabaseHeaders(serviceRoleKey),
    timeoutMs: 10000,
  });

  if (!result.ok) {
    console.error("Erro ao limpar state TikTok:", result.status);
  }
}

async function getOAuthState(
  supabaseUrl: string,
  serviceRoleKey: string,
  state: string
): Promise<TikTokOAuthState | null> {
  const stateUrl =
    `${supabaseUrl}/rest/v1/tiktok_oauth_states` +
    `?state=eq.${encodeURIComponent(state)}` +
    `&select=state,company_id,expires_at` +
    `&limit=1`;

  const result = await requestJson(stateUrl, {
    method: "GET",
    headers: supabaseHeaders(serviceRoleKey),
    timeoutMs: 10000,
  });

  if (!result.ok) {
    console.error("Erro ao buscar state TikTok:", result.status);
    return null;
  }

  const oauthState = Array.isArray(result.data) ? result.data[0] : null;

  if (!oauthState?.state || !oauthState?.company_id || !oauthState?.expires_at) {
    return null;
  }

  return oauthState;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const code = String(req.query.code || "").trim();
    const state = String(req.query.state || "").trim();
    const error = String(req.query.error || "").trim();
    const errorDescription = String(req.query.error_description || "").trim();

    const clientKey = String(process.env.TIKTOK_CLIENT_KEY || "").trim();
    const clientSecret = String(process.env.TIKTOK_CLIENT_SECRET || "").trim();
    const redirectUri = String(process.env.TIKTOK_REDIRECT_URI || "").trim();

    const supabaseUrl = String(
      process.env.SUPABASE_URL ||
        process.env.VITE_SUPABASE_URL ||
        ""
    ).replace(/\/$/, "");

    const serviceRoleKey = String(
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    ).trim();

    if (error) {
      console.error("TikTok retornou erro no callback:", error);
      return redirectToSettings(
        res,
        "error",
        errorDescription || "Autorização cancelada ou negada."
      );
    }

    if (!code || !state || !isSafeOAuthState(state)) {
      return redirectToSettings(res, "invalid_callback");
    }

    if (!clientKey || !clientSecret || !redirectUri) {
      console.error("Variáveis do TikTok ausentes no servidor.");
      return redirectToSettings(res, "server_config_error");
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Variáveis do Supabase ausentes no servidor.");
      return redirectToSettings(res, "supabase_config_error");
    }

    const oauthState = await getOAuthState(supabaseUrl, serviceRoleKey, state);

    if (!oauthState) {
      return redirectToSettings(res, "invalid_state");
    }

    if (
      !isValidIsoDate(oauthState.expires_at) ||
      new Date(oauthState.expires_at).getTime() < Date.now()
    ) {
      await deleteOAuthState(supabaseUrl, serviceRoleKey, state);
      return redirectToSettings(res, "expired_state");
    }

    const formBody = new URLSearchParams();

    formBody.set("client_key", clientKey);
    formBody.set("client_secret", clientSecret);
    formBody.set("code", code);
    formBody.set("grant_type", "authorization_code");
    formBody.set("redirect_uri", redirectUri);

    const tokenResult = await requestJson(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        formBody,
        timeoutMs: 15000,
      }
    );

    if (!tokenResult.ok || !tokenResult.data?.access_token) {
      console.error("Erro ao gerar token TikTok:", tokenResult.status);
      await deleteOAuthState(supabaseUrl, serviceRoleKey, state);
      return redirectToSettings(res, "token_error");
    }

    const accessToken = String(tokenResult.data.access_token);
    const refreshToken = tokenResult.data.refresh_token
      ? String(tokenResult.data.refresh_token)
      : null;

    const openId = tokenResult.data.open_id
      ? String(tokenResult.data.open_id)
      : null;

    const tokenExpiresAt = addSecondsToNow(tokenResult.data.expires_in);
    const refreshTokenExpiresAt = addSecondsToNow(
      tokenResult.data.refresh_expires_in
    );

    const userInfoResult = await getTikTokUserInfo(accessToken);

    let tiktokUser: any = null;

    if (userInfoResult.ok) {
      tiktokUser = userInfoResult.data?.data?.user || null;
    } else {
      console.error("Erro ao buscar dados da conta TikTok:", userInfoResult.status);
    }

    const accountName =
      tiktokUser?.username ||
      tiktokUser?.display_name ||
      openId ||
      "TikTok";

    const accountId = tiktokUser?.open_id || openId || accountName;

    const deleteUrl =
      `${supabaseUrl}/rest/v1/social_accounts` +
      `?company_id=eq.${encodeURIComponent(oauthState.company_id)}` +
      `&platform=eq.tiktok`;

    const deleteResult = await requestJson(deleteUrl, {
      method: "DELETE",
      headers: supabaseHeaders(serviceRoleKey),
      timeoutMs: 10000,
    });

    if (!deleteResult.ok) {
      console.error("Erro ao remover conexão TikTok antiga:", deleteResult.status);
      return redirectToSettings(res, "delete_error");
    }

    const insertUrl = `${supabaseUrl}/rest/v1/social_accounts`;

    const rowToInsert = {
      company_id: oauthState.company_id,
      platform: "tiktok",
      account_name: accountName,
      account_id: accountId,
      page_id: null,
      instagram_business_account_id: null,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: tokenExpiresAt,
      refresh_token_expires_at: refreshTokenExpiresAt,
      status: "connected",
      is_connected: true,
      updated_at: new Date().toISOString(),
    };

    const insertResult = await requestJson(insertUrl, {
      method: "POST",
      headers: supabaseHeaders(serviceRoleKey),
      body: rowToInsert,
      timeoutMs: 10000,
    });

    if (!insertResult.ok) {
      console.error("Erro ao salvar social_accounts TikTok:", insertResult.status);
      return redirectToSettings(res, "save_error");
    }

    await deleteOAuthState(supabaseUrl, serviceRoleKey, state);

    return redirectToSettings(res, "connected");
  } catch (error: any) {
    console.error("Erro inesperado no callback TikTok:", error?.message);
    return redirectToSettings(res, "unexpected_error");
  }
}
