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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log("Callback Meta iniciado - Página e Instagram");

    const code = String(req.query.code || "");
    const state = String(req.query.state || "");

    const appId = process.env.META_APP_ID || "";
    const appSecret = process.env.META_APP_SECRET || "";
    const redirectUri = process.env.META_REDIRECT_URI || "";

    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    console.log("Code recebido:", Boolean(code));
    console.log("State recebido:", Boolean(state));
    console.log("META_APP_ID existe:", Boolean(appId));
    console.log("META_APP_SECRET existe:", Boolean(appSecret));
    console.log("META_REDIRECT_URI existe:", Boolean(redirectUri));
    console.log("SUPABASE_URL existe:", Boolean(supabaseUrl));
    console.log("SUPABASE_SERVICE_ROLE_KEY existe:", Boolean(serviceRoleKey));

    if (!code || !state) {
      return res.redirect("/settings?meta=error");
    }

    if (!appId || !appSecret || !redirectUri) {
      console.error("Variáveis da Meta ausentes.");
      return res.redirect("/settings?meta=server_config_error");
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Variáveis do Supabase ausentes.");
      return res.redirect("/settings?meta=supabase_config_error");
    }

    const headers = supabaseHeaders(serviceRoleKey);

    const stateUrl =
      `${supabaseUrl}/rest/v1/meta_oauth_states` +
      `?state=eq.${encodeURIComponent(state)}` +
      `&used=eq.false` +
      `&select=*`;

    console.log("Buscando state no Supabase");

    const stateResult = await requestJson(stateUrl, {
      method: "GET",
      headers,
    });

    if (!stateResult.ok) {
      console.error("Erro ao buscar state:", stateResult.status, stateResult.text);
      return res.redirect("/settings?meta=invalid_state");
    }

    const oauthState = Array.isArray(stateResult.data)
      ? stateResult.data[0]
      : null;

    if (!oauthState) {
      console.error("State não encontrado ou já usado.");
      return res.redirect("/settings?meta=invalid_state");
    }

    if (new Date(oauthState.expires_at).getTime() < Date.now()) {
      console.error("State expirado.");
      return res.redirect("/settings?meta=expired_state");
    }

    console.log("Trocando code por token");

    const tokenUrl = new URL(
      "https://graph.facebook.com/v20.0/oauth/access_token"
    );

    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenResult = await requestJson(tokenUrl.toString());

    if (!tokenResult.ok || !tokenResult.data?.access_token) {
      console.error("Erro ao gerar token:", tokenResult.status, tokenResult.text);
      return res.redirect("/settings?meta=token_error");
    }

    const userAccessToken = tokenResult.data.access_token;

    console.log("Buscando páginas e Instagram vinculado");

    const pagesUrl = new URL("https://graph.facebook.com/v20.0/me/accounts");

    pagesUrl.searchParams.set(
      "fields",
      "id,name,access_token,instagram_business_account{id,username,name}"
    );

    pagesUrl.searchParams.set("access_token", userAccessToken);

    const pagesResult = await requestJson(pagesUrl.toString());

    if (!pagesResult.ok) {
      console.error("Erro ao buscar páginas:", pagesResult.status, pagesResult.text);
      return res.redirect("/settings?meta=pages_error");
    }

    console.log("Resposta de páginas:", JSON.stringify(pagesResult.data));

    const pages = Array.isArray(pagesResult.data?.data)
      ? pagesResult.data.data
      : [];

    if (pages.length === 0) {
      console.error("Nenhuma página encontrada.");
      return res.redirect("/settings?meta=no_pages");
    }

    const selectedPage =
      pages.find((page: any) =>
        String(page.name || "").toLowerCase().includes("social pilot")
      ) || pages[0];

    const instagramAccount = selectedPage.instagram_business_account || null;

    console.log("Página selecionada:", selectedPage?.name);
    console.log("Page ID:", selectedPage?.id);
    console.log(
      "Instagram encontrado:",
      instagramAccount ? JSON.stringify(instagramAccount) : "não encontrado"
    );

    console.log("Marcando state como usado");

    const updateStateUrl =
      `${supabaseUrl}/rest/v1/meta_oauth_states` +
      `?id=eq.${encodeURIComponent(oauthState.id)}`;

    const updateResult = await requestJson(updateStateUrl, {
      method: "PATCH",
      headers,
      body: {
        used: true,
      },
    });

    if (!updateResult.ok) {
      console.error(
        "Erro ao marcar state usado:",
        updateResult.status,
        updateResult.text
      );
      return res.redirect("/settings?meta=state_update_error");
    }

    console.log("Removendo conexões antigas da empresa");

    const deleteUrl =
      `${supabaseUrl}/rest/v1/social_accounts` +
      `?company_id=eq.${encodeURIComponent(oauthState.company_id)}`;

    const deleteResult = await requestJson(deleteUrl, {
      method: "DELETE",
      headers,
    });

    if (!deleteResult.ok) {
      console.error(
        "Erro ao remover conexões antigas:",
        deleteResult.status,
        deleteResult.text
      );
      return res.redirect("/settings?meta=delete_error");
    }

    console.log("Preparando registros para inserir");

    const rowsToInsert: any[] = [
      {
        company_id: oauthState.company_id,
        platform: "facebook",
        account_name: selectedPage.name || "Facebook Page",
        account_id: selectedPage.id,
        page_id: selectedPage.id,
        instagram_business_account_id: instagramAccount?.id || null,
        access_token: selectedPage.access_token || userAccessToken,
        refresh_token: null,
        token_expires_at: null,
        status: "connected",
        is_connected: true,
        updated_at: new Date().toISOString(),
      },
    ];

    if (instagramAccount?.id) {
      rowsToInsert.push({
        company_id: oauthState.company_id,
        platform: "instagram",
        account_name:
          instagramAccount.username || instagramAccount.name || "Instagram",
        account_id: instagramAccount.id,
        page_id: selectedPage.id,
        instagram_business_account_id: instagramAccount.id,
        access_token: selectedPage.access_token || userAccessToken,
        refresh_token: null,
        token_expires_at: null,
        status: "connected",
        is_connected: true,
        updated_at: new Date().toISOString(),
      });
    }

    console.log("Registros para inserir:", JSON.stringify(rowsToInsert));

    const insertUrl = `${supabaseUrl}/rest/v1/social_accounts`;

    const insertResult = await requestJson(insertUrl, {
      method: "POST",
      headers,
      body: rowsToInsert,
    });

    if (!insertResult.ok) {
      console.error(
        "Erro ao salvar social_accounts:",
        insertResult.status,
        insertResult.text
      );
      return res.redirect("/settings?meta=save_error");
    }

    console.log("Página e Instagram salvos com sucesso");

    return res.redirect("/settings?meta=connected");
  } catch (error: any) {
    console.error("Erro inesperado no callback Meta:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });

    return res.redirect("/settings?meta=unexpected_error");
  }
}
