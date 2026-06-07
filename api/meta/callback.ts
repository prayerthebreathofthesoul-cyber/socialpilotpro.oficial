import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = process.env.META_REDIRECT_URI;

    if (!code || !state) {
      return res.redirect("/settings?meta=error");
    }

    if (!appId || !appSecret || !redirectUri || !supabaseUrl || !serviceRoleKey) {
      return res.status(500).send("Configuração do servidor incompleta.");
    }

    const { data: oauthState, error: stateError } = await supabaseAdmin
      .from("meta_oauth_states")
      .select("*")
      .eq("state", state)
      .eq("used", false)
      .single();

    if (stateError || !oauthState) {
      console.error(stateError);
      return res.redirect("/settings?meta=invalid_state");
    }

    if (new Date(oauthState.expires_at).getTime() < Date.now()) {
      return res.redirect("/settings?meta=expired_state");
    }

    await supabaseAdmin
      .from("meta_oauth_states")
      .update({ used: true })
      .eq("id", oauthState.id);

    const tokenUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const shortTokenResponse = await fetch(tokenUrl.toString());
    const shortTokenData = await shortTokenResponse.json();

    if (!shortTokenResponse.ok || !shortTokenData.access_token) {
      console.error(shortTokenData);
      return res.redirect("/settings?meta=token_error");
    }

    const longTokenUrl = new URL(
      "https://graph.facebook.com/v20.0/oauth/access_token"
    );
    longTokenUrl.searchParams.set("grant_type", "fb_exchange_token");
    longTokenUrl.searchParams.set("client_id", appId);
    longTokenUrl.searchParams.set("client_secret", appSecret);
    longTokenUrl.searchParams.set("fb_exchange_token", shortTokenData.access_token);

    const longTokenResponse = await fetch(longTokenUrl.toString());
    const longTokenData = await longTokenResponse.json();

    if (!longTokenResponse.ok || !longTokenData.access_token) {
      console.error(longTokenData);
      return res.redirect("/settings?meta=long_token_error");
    }

    const userAccessToken = longTokenData.access_token;
    const expiresInSeconds = Number(longTokenData.expires_in || 5184000);

    const tokenExpiresAt = new Date(
      Date.now() + expiresInSeconds * 1000
    ).toISOString();

    const pagesUrl = new URL("https://graph.facebook.com/v20.0/me/accounts");
    pagesUrl.searchParams.set(
      "fields",
      "id,name,access_token,instagram_business_account{id,username,name}"
    );
    pagesUrl.searchParams.set("access_token", userAccessToken);

    const pagesResponse = await fetch(pagesUrl.toString());
    const pagesData = await pagesResponse.json();

    if (!pagesResponse.ok) {
      console.error(pagesData);
      return res.redirect("/settings?meta=pages_error");
    }

    const pages = Array.isArray(pagesData.data) ? pagesData.data : [];

    if (pages.length === 0) {
      return res.redirect("/settings?meta=no_pages");
    }

    await supabaseAdmin
      .from("social_accounts")
      .delete()
      .eq("company_id", oauthState.company_id)
      .in("platform", ["facebook", "instagram"]);

    const rowsToInsert: any[] = [];

    for (const page of pages) {
      rowsToInsert.push({
        company_id: oauthState.company_id,
        platform: "facebook",
        account_name: page.name,
        account_id: page.id,
        page_id: page.id,
        instagram_business_account_id: page.instagram_business_account?.id || null,
        access_token: page.access_token,
        token_expires_at: tokenExpiresAt,
        status: "connected",
        updated_at: new Date().toISOString(),
      });

      if (page.instagram_business_account?.id) {
        rowsToInsert.push({
          company_id: oauthState.company_id,
          platform: "instagram",
          account_name:
            page.instagram_business_account.username ||
            page.instagram_business_account.name ||
            page.name,
          account_id: page.instagram_business_account.id,
          page_id: page.id,
          instagram_business_account_id: page.instagram_business_account.id,
          access_token: page.access_token,
          token_expires_at: tokenExpiresAt,
          status: "connected",
          updated_at: new Date().toISOString(),
        });
      }
    }

    const { error: insertError } = await supabaseAdmin
      .from("social_accounts")
      .insert(rowsToInsert);

    if (insertError) {
      console.error(insertError);
      return res.redirect("/settings?meta=save_error");
    }

    return res.redirect("/settings?meta=connected");
  } catch (error) {
    console.error(error);
    return res.redirect("/settings?meta=unexpected_error");
  }
}
