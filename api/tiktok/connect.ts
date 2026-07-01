import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
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
    timeoutMs?: number;
  } = {}
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);

    const body =
      options.body !== undefined ? JSON.stringify(options.body) : undefined;

    const timeoutMs = options.timeoutMs || 10000;

    const apiReq = https.request(
      {
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
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

function createOAuthState() {
  return crypto.randomBytes(32).toString("base64url");
}

function getBearerToken(req: VercelRequest) {
  const authorization = String(req.headers.authorization || "");
  const [type, token] = authorization.split(" ");

  if (type?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

function isSafeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function getAuthenticatedUser(
  supabaseUrl: string,
  anonKey: string,
  accessToken: string
) {
  const result = await requestJson(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    timeoutMs: 10000,
  });

  if (!result.ok || !result.data?.id) {
    return null;
  }

  return result.data;
}

async function getCompanyIdFromProfile(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string
) {
  const url =
    `${supabaseUrl}/rest/v1/profiles` +
    `?select=id,user_id,company_id,email,role` +
    `&user_id=eq.${encodeURIComponent(userId)}` +
    `&limit=1`;

  const result = await requestJson(url, {
    method: "GET",
    headers: supabaseHeaders(serviceRoleKey),
    timeoutMs: 10000,
  });

  if (!result.ok) {
    console.error("Erro ao buscar profile:", result.status, result.text);
    return null;
  }

  const profile = Array.isArray(result.data) ? result.data[0] : null;

  if (!profile?.company_id) {
    return null;
  }

  return String(profile.company_id);
}

async function validateCompany(
  supabaseUrl: string,
  serviceRoleKey: string,
  companyId: string
) {
  const url =
    `${supabaseUrl}/rest/v1/companies` +
    `?select=id,email,plan,plan_status,status,is_blocked` +
    `&id=eq.${encodeURIComponent(companyId)}` +
    `&limit=1`;

  const result = await requestJson(url, {
    method: "GET",
    headers: supabaseHeaders(serviceRoleKey),
    timeoutMs: 10000,
  });

  if (!result.ok) {
    console.error("Erro ao validar empresa:", result.status, result.text);
    return null;
  }

  const company = Array.isArray(result.data) ? result.data[0] : null;

  if (!company?.id) {
    return null;
  }

  if (
    company.is_blocked === true ||
    company.status !== "active" ||
    company.plan_status !== "active"
  ) {
    return null;
  }

  return company;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed. Use POST from the authenticated app.",
    });
  }

  try {
    const clientKey = String(process.env.TIKTOK_CLIENT_KEY || "").trim();
    const redirectUri = String(process.env.TIKTOK_REDIRECT_URI || "").trim();

    const supabaseUrl = String(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ""
    ).replace(/\/$/, "");

    const supabaseAnonKey = String(
      process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        ""
    ).trim();

    const serviceRoleKey = String(
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    ).trim();

    if (!clientKey || !redirectUri) {
      console.error("Configuração do TikTok ausente.");
      return res.status(500).json({ error: "TikTok config missing" });
    }

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error("Configuração do Supabase ausente.");
      return res.status(500).json({ error: "Supabase config missing" });
    }

    const accessToken = getBearerToken(req);

    if (!accessToken) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await getAuthenticatedUser(
      supabaseUrl,
      supabaseAnonKey,
      accessToken
    );

    if (!user?.id) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const companyId = await getCompanyIdFromProfile(
      supabaseUrl,
      serviceRoleKey,
      String(user.id)
    );

    if (!companyId || !isSafeUuid(companyId)) {
      return res.status(403).json({ error: "Company not found for user" });
    }

    const company = await validateCompany(
      supabaseUrl,
      serviceRoleKey,
      companyId
    );

    if (!company) {
      return res.status(403).json({
        error: "Company inactive, blocked or not found",
      });
    }

    const state = createOAuthState();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const insertStateUrl = `${supabaseUrl}/rest/v1/tiktok_oauth_states`;

    const insertResult = await requestJson(insertStateUrl, {
      method: "POST",
      headers: supabaseHeaders(serviceRoleKey),
      body: {
        state,
        company_id: companyId,
        user_id: user.id,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      },
      timeoutMs: 10000,
    });

    if (!insertResult.ok) {
      console.error(
        "Erro ao salvar state TikTok:",
        insertResult.status,
        insertResult.text
      );

      return res.status(500).json({ error: "Could not create OAuth state" });
    }

    const scopes = ["user.info.basic", "video.upload", "video.publish"].join(
      ","
    );

    const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");

    authUrl.searchParams.set("client_key", clientKey);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("response_type", "code");

    return res.status(200).json({
      url: authUrl.toString(),
    });
  } catch (error: any) {
    console.error("Erro ao iniciar conexão com o TikTok:", error?.message);

    return res.status(500).json({
      error: "Could not start TikTok connection",
    });
  }
}
