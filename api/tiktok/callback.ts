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
    formBody?: URLSearchParams;
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
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log("Callback TikTok iniciado");

    const code = String(req.query.code || "").trim();
    const state = String(req.query.state || "").trim();
    const error = String(req.query.error || "").trim();

    const clientKey = String(process.env.TIKTOK_CLIENT_KEY || "").trim();
    const clientSecret = String(process.env.TIKTOK_CLIENT_SECRET || "").trim();
    const redirectUri = String(process.env.TIKTOK_REDIRECT_URI || "").trim();

    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    console.log("Code recebido:", Boolean(code));
    console.log("State recebido:", Boolean(state));
    console.log("Erro TikTok recebido:", error || "nenhum");
    console.log("TIKTOK_CLIENT_KEY existe:", Boolean(clientKey));
    console.log("TIKTOK_CLIENT_SECRET existe:", Boolean(clientSecret));
    console.log("TIKTOK_REDIRECT_URI existe:", Boolean(redirectUri));
    console.log("SUPABASE_URL existe:", Boolean(supabaseUrl));
    console.log("SUPABASE_SERVICE_ROLE_KEY existe:", Boolean(serviceRoleKey));

    if (error) {
      console.error("TikTok retornou erro:", error);
      return res.redirect("/settings?tiktok=error");
    }

    if (!code || !state) {
      return res.redirect("/settings?tiktok=error");
    }

    if (!clientKey || !clientSecret || !redirectUri) {
      console.error("Variáveis do TikTok ausentes.");
      return res.redirect("/settings?tiktok=server_config_error");
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Variáveis do Supabase ausentes.");
      return res.redirect("/settings?tiktok=supabase_config_error");
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
    });

    if (!stateResult.ok) {
      console.error(
        "Erro ao buscar state TikTok:",
        stateResult.status,
        stateResult.text
      );

      return res.redirect("/settings?tiktok=invalid_state");
    }

    const oauthState = Array.isArray(stateResult.data)
      ? stateResult.data[0]
      : null;

    if (!oauthState) {
      console.error("State TikTok não encontrado.");
      return res.redirect("/settings?tiktok=invalid_state");
    }

    if (new Date(oauthState.expires_at).getTime() < Date.now()) {
      console.error("State TikTok expirado.");
      return res.redirect("/settings?tiktok=expired_state");
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
      }
    );

    if (!tokenResult.ok || !tokenResult.data?.access_token) {
      console.error(
        "Erro ao gerar token TikTok:",
        tokenResult.status,
        tokenResult.text
      );

      return res.redirect("/settings?tiktok=token_error");
    }

    const accessToken = tokenResult.data.access_token;
    const refreshToken = tokenResult.data.refresh_token || null;
    const openId = tokenResult.data.open_id || null;
    const scope = tokenResult.data.scope || null;

    const tokenExpiresAt = addSecondsToNow(tokenResult.data.expires_in);
    const refreshTokenExpiresAt = addSecondsToNow(
      tokenResult.data.refresh_expires_in
    );

    console.log("Token TikTok gerado com sucesso");
    console.log("Open ID recebido:", Boolean(openId));
    console.log("Scope recebido:", scope || "não informado");

    console.log("Buscando dados da conta TikTok");

    const userInfoResult = await getTikTokUserInfo(accessToken);

    let tiktokUser: any = null;

    if (userInfoResult.ok) {
      tiktokUser = userInfoResult.data?.data?.user || null;
    } else {
      console.error(
        "Erro ao buscar dados do criador TikTok:",
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

    console.log("Conta TikTok:", accountName);

    console.log("Removendo conexão antiga do TikTok");

    const deleteUrl =
      `${supabaseUrl}/rest/v1/social_accounts` +
      `?company_id=eq.${encodeURIComponent(oauthState.company_id)}` +
      `&platform=eq.tiktok`;

    const deleteResult = await requestJson(deleteUrl, {
      method: "DELETE",
      headers,
    });

    if (!deleteResult.ok) {
      console.error(
        "Erro ao remover conexão TikTok antiga:",
        deleteResult.status,
        deleteResult.text
      );

      return res.redirect("/settings?tiktok=delete_error");
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
    });

    if (!insertResult.ok) {
      console.error(
        "Erro ao salvar social_accounts TikTok:",
        insertResult.status,
        insertResult.text
      );

      return res.redirect("/settings?tiktok=save_error");
    }

    console.log("Conta TikTok salva com sucesso");

    return res.redirect("/settings?tiktok=connected");
  } catch (error: any) {
    console.error("Erro inesperado no callback TikTok:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });

    return res.redirect("/settings?tiktok=unexpected_error");
  }
}
