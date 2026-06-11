import type { VercelRequest, VercelResponse } from "@vercel/node";
import https from "https";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type HttpResult = {
  status: number;
  ok: boolean;
  data: any;
  text: string;
};

function getBaseUrl(req: VercelRequest) {
  const host = req.headers.host || "socialpilotpro.com.br";
  const proto =
    String(req.headers["x-forwarded-proto"] || "").split(",")[0] || "https";

  return `${proto}://${host}`;
}

function redirectToSettings(
  req: VercelRequest,
  res: VercelResponse,
  status: string,
  message?: string
) {
  const baseUrl = getBaseUrl(req);
  const url = new URL("/settings", baseUrl);

  url.searchParams.set("tiktok", status);

  if (message) {
    url.searchParams.set("message", message.slice(0, 180));
  }

  return res.redirect(url.toString());
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

    const req = https.request(
      {
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: options.method || "GET",
        headers: {
          "Content-Type": contentType,
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

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout ao chamar ${url.hostname}`));
    });

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

function addSecondsToNow(seconds?: number | null) {
  if (!seconds || Number.isNaN(Number(seconds))) {
    return null;
  }

  return new Date(Date.now() + Number(seconds) * 1000).toISOString();
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
  const headers = supabaseHeaders(serviceRoleKey);

  const deleteStateUrl =
    `${supabaseUrl}/rest/v1/tiktok_oauth_states` +
    `?state=eq.${encodeURIComponent(state)}`;

  const result = await requestJson(deleteStateUrl, {
    method: "DELETE",
    headers,
    timeoutMs: 10000,
  });

  if (!result.ok) {
    console.error("Erro ao limpar state TikTok:", result.status, result.text);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log("Callback TikTok iniciado");

    const code = String(req.query.code || "").trim();
    const state = String(req.query.state || "").trim();
    const error = String(req.query.error || "").trim();
    const errorDescription = String(req.query.error_description || "").trim();

    const clientKey = String(process.env.TIKTOK_CLIENT_KEY || "").trim();
    const clientSecret = String(process.env.TIKTOK_CLIENT_SECRET || "").trim();
    const redirectUri = String(process.env.TIKTOK_REDIRECT_URI || "").trim();

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "";

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    console.log("Callback TikTok parâmetros:", {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      error: error || "nenhum",
      hasClientKey: Boolean(clientKey),
      hasClientSecret: Boolean(clientSecret),
      hasRedirectUri: Boolean(redirectUri),
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
      redirectUri,
    });

    if (error) {
      console.error("TikTok retornou erro:", {
        error,
        errorDescription,
      });

      return redirectToSettings(
        req,
        res,
        "error",
        errorDescription || error
      );
    }

    if (!code || !state) {
      return redirectToSettings(req, res, "invalid_callback");
    }

    if (!clientKey || !clientSecret || !redirectUri) {
      console.error("Variáveis do TikTok ausentes.");

      return redirectToSettings(req, res, "server_config_error");
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Variáveis do Supabase ausentes.");

      return redirectToSettings(req, res, "supabase_config_error");
    }

    const headers = supabaseHeaders(serviceRoleKey);

    const stateUrl =
      `${supabaseUrl}/rest/v1/tiktok_oauth_states` +
      `?state=eq.${encodeURIComponent(state)}` +
      `&select=*`;

    console.log("Buscando state do TikTok no Supabase");

    const stateResult = await requestJson(stateUrl, {
      method: "GET",
      headers,
      timeoutMs: 10000,
    });

    if (!stateResult.ok) {
      console.error(
        "Erro ao buscar state TikTok:",
        stateResult.status,
        stateResult.text
      );

      return redirectToSettings(req, res, "invalid_state");
    }

    const oauthState = Array.isArray(stateResult.data)
      ? stateResult.data[0]
      : null;

    if (!oauthState) {
      console.error("State TikTok não encontrado.");

      return redirectToSettings(req, res, "invalid_state");
    }

    if (new Date(oauthState.expires_at).getTime() < Date.now()) {
      console.error("State TikTok expirado.");

      await deleteOAuthState(supabaseUrl, serviceRoleKey, state);

      return redirectToSettings(req, res, "expired_state");
    }

    console.log("Trocando code por token TikTok");

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
      console.error(
        "Erro ao gerar token TikTok:",
        tokenResult.status,
        tokenResult.text
      );

      return redirectToSettings(req, res, "token_error");
    }

    const accessToken = tokenResult.data.access_token;
    const refreshToken = tokenResult.data.refresh_token || null;
    const openId = tokenResult.data.open_id || null;
    const scope = tokenResult.data.scope || null;

    const tokenExpiresAt = addSecondsToNow(tokenResult.data.expires_in);
    const refreshTokenExpiresAt = addSecondsToNow(
      tokenResult.data.refresh_expires_in
    );

    console.log("Token TikTok gerado com sucesso:", {
      hasOpenId: Boolean(openId),
      scope: scope || "não informado",
      hasRefreshToken: Boolean(refreshToken),
    });

    console.log("Buscando dados da conta TikTok");

    const userInfoResult = await getTikTokUserInfo(accessToken);

    let tiktokUser: any = null;

    if (userInfoResult.ok) {
      tiktokUser = userInfoResult.data?.data?.user || null;
    } else {
      console.error(
        "Erro ao buscar dados da conta TikTok:",
        userInfoResult.status,
        userInfoResult.text
      );
    }

    const accountName =
      tiktokUser?.username ||
      tiktokUser?.display_name ||
      openId ||
      "TikTok";

    const accountId = tiktokUser?.open_id || openId || accountName;

    console.log("Conta TikTok identificada:", {
      accountName,
      accountId,
    });

    console.log("Removendo conexão antiga do TikTok");

    const deleteUrl =
      `${supabaseUrl}/rest/v1/social_accounts` +
      `?company_id=eq.${encodeURIComponent(oauthState.company_id)}` +
      `&platform=eq.tiktok`;

    const deleteResult = await requestJson(deleteUrl, {
      method: "DELETE",
      headers,
      timeoutMs: 10000,
    });

    if (!deleteResult.ok) {
      console.error(
        "Erro ao remover conexão TikTok antiga:",
        deleteResult.status,
        deleteResult.text
      );

      return redirectToSettings(req, res, "delete_error");
    }

    console.log("Salvando conta TikTok conectada");

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
      headers,
      body: rowToInsert,
      timeoutMs: 10000,
    });

    if (!insertResult.ok) {
      console.error(
        "Erro ao salvar social_accounts TikTok:",
        insertResult.status,
        insertResult.text
      );

      return redirectToSettings(
        req,
        res,
        "save_error",
        insertResult.text || "Erro ao salvar TikTok."
      );
    }

    await deleteOAuthState(supabaseUrl, serviceRoleKey, state);

    console.log("Conta TikTok salva com sucesso");

    return redirectToSettings(req, res, "connected");
  } catch (error: any) {
    console.error("Erro inesperado no callback TikTok:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });

    return redirectToSettings(
      req,
      res,
      "unexpected_error",
      error?.message || "Erro inesperado no callback TikTok."
    );
  }
}
