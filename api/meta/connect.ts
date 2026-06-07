import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const appId = process.env.META_APP_ID;
    const redirectUri = process.env.META_REDIRECT_URI;
    const state = String(req.query.state || "");

    if (!appId || !redirectUri) {
      return res.status(500).send("Configuração da Meta ausente.");
    }

    if (!state) {
      return res.status(400).send("State ausente.");
    }

    const scopes = ["public_profile", "email"].join(",");

    const authUrl = new URL("https://www.facebook.com/v20.0/dialog/oauth");

    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("response_type", "code");

    return res.redirect(authUrl.toString());
  } catch (error) {
    console.error(error);
    return res.status(500).send("Erro ao iniciar conexão com a Meta.");
  }
}
