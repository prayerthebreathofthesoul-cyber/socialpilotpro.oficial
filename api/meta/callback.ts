import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log("Callback Meta iniciado");

    const code = String(req.query.code || "");
    const state = String(req.query.state || "");

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = process.env.META_REDIRECT_URI;

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
      console.error("Code ou state ausente");
      return res.redirect("/settings?meta=error");
    }

    if (!appId || !appSecret || !redirectUri) {
      console.error("Variáveis da Meta ausentes");
      return res.redirect("/settings?meta=server_config_error");
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Variáveis do Supabase Admin ausentes");
      return res.redirect("/settings?meta=supabase_config_error");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    console.log("Buscando state no Supabase");

    const { data: oauthState, error: stateError } = await supabaseAdmin
      .from("meta_oauth_states")
      .select("*")
      .eq("state", state)
      .eq("used", false)
      .single();

    if (stateError || !oauthState) {
      console.error("State inválido:", JSON.stringify(stateError));
      return res.redirect("/settings?meta=invalid_state");
    }

    if (new Date(oauthState.expires_at).getTime() < Date.now()) {
      console.error("State expirado");
      return res.redirect("/settings?meta=expired_state");
    }

    console.log("Trocando code por access token");

    const tokenUrl = new URL(
      "https://graph.facebook.com/v20.0/oauth/access_token"
    );

    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Erro ao gerar token:", JSON.stringify(tokenData));
      return res.redirect("/settings?meta=token_error");
    }

    const accessToken = tokenData.access_token;

    console.log("Buscando perfil básico do Facebook");

    const meUrl = new URL("https://graph.facebook.com/v20.0/me");
    meUrl.searchParams.set("fields", "id,name,email");
    meUrl.searchParams.set("access_token", accessToken);

    const meResponse = await fetch(meUrl.toString());
    const meData = await meResponse.json();

    if (!meResponse.ok || !meData.id) {
      console.error("Erro ao buscar perfil básico:", JSON.stringify(meData));
      return res.redirect("/settings?meta=profile_error");
    }

    console.log("Marcando state como usado");

    await supabaseAdmin
      .from("meta_oauth_states")
      .update({ used: true })
      .eq("id", oauthState.id);

    console.log("Removendo conexão antiga");

    await supabaseAdmin
      .from("social_accounts")
      .delete()
      .eq("company_id", oauthState.company_id)
      .eq("platform", "facebook");

    console.log("Salvando conexão básica do Facebook");

    const { error: insertError } = await supabaseAdmin
      .from("social_accounts")
      .insert({
        company_id: oauthState.company_id,
        platform: "facebook",
        account_name: meData.name || "Facebook",
        account_id: meData.id,
        page_id: null,
        instagram_business_account_id: null,
        access_token: accessToken,
        token_expires_at: null,
        status: "connected",
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error(
        "Erro ao salvar social_accounts:",
        JSON.stringify(insertError)
      );
      return res.redirect("/settings?meta=save_error");
    }

    console.log("Conexão Meta salva com sucesso");

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
