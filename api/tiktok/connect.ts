import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const clientKey = String(process.env.TIKTOK_CLIENT_KEY || "").trim();
    const redirectUri = String(process.env.TIKTOK_REDIRECT_URI || "").trim();
    const state = String(req.query.state || "").trim();

    if (!clientKey || !redirectUri) {
      return res.status(500).send("Configuração do TikTok ausente.");
    }

    if (!state) {
      return res.status(400).send("State ausente.");
    }

    const scopes = [
      "user.info.basic",
      "video.upload",
      "video.publish",
    ].join(",");

    const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");

    authUrl.searchParams.set("client_key", clientKey);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("response_type", "code");

    return res.redirect(authUrl.toString());
  } catch (error) {
    console.error("Erro ao iniciar conexão com o TikTok:", error);
    return res.status(500).send("Erro ao iniciar conexão com o TikTok.");
  }
}
