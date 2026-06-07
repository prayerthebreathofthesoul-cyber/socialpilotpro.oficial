import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = process.env.META_REDIRECT_URI;

    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!code || !state) {
      return res.redirect("/settings?meta=error");
    }

    if (!appId || !appSecret || !redirectUri) {
      console.error("Variáveis da Meta ausentes.");
      return res.redirect("/settings?meta=server_config_error");
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Variáveis do Supabase Admin ausentes.");
      return res.redirect("/settings?meta=supabase_config_error");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: oauthState, error: stateError } = await supabaseAdmin
      .from("meta_oauth_states")
      .select("*")
      .eq("state", state)
      .eq("used", false)
      .single();

    if (stateError || !oauthState) {
      console.error("State inválido:", stateError);
      return res.redirect("/settings?meta=invalid_state");
    }

    if (new Date(oauthState.expires_at).getTime() < Date.now()) {
      return res.redirect("/settings?meta=expired_state");
    }

    await supabaseAdmin
      .from("meta_oauth_states")
      .update({ used: true })
      .eq("id", oauthState.id);

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
      console.error("Erro ao gerar token:", tokenData);
      return res.redirect("/settings?meta=token_error");
    }

    const accessToken = tokenData.access_token;

    const meUrl = new URL("https://graph.facebook.com/v20.0/me");
    meUrl.searchParams.set("fields", "id,name,email");
    meUrl.searchParams.set("access_token", accessToken);

    const meResponse = await fetch(meUrl.toString());
    const meData = await meResponse.json();

    if (!meResponse.ok || !meData.id) {
      console.error("Erro ao buscar perfil básico:", meData);
      return res.redirect("/settings?meta=profile_error");
    }

    await supabaseAdmin
      .from("social_accounts")
      .delete()
      .eq("company_id", oauthState.company_id)
      .eq("platform", "facebook");

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
      console.error("Erro ao salvar social_accounts:", insertError);
      return res.redirect("/settings?meta=save_error");
    }

    return res.redirect("/settings?meta=connected");
  } catch (error) {
    console.error("Erro inesperado no callback Meta:", error);
    return res.redirect("/settings?meta=unexpected_error");
  }
}
