import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE;

const officialEmail =
  process.env.MASTER_OFFICIAL_EMAIL || "socialpilotpro.oficial@gmail.com";

function json(res: VercelResponse, status: number, body: Record<string, unknown>) {
  return res.status(status).json(body);
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function getBearerToken(req: VercelRequest) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function isMissingRelationError(error: any) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();

  return (
    code === "42P01" ||
    code === "42703" ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

async function selectOptionalTable(
  supabaseAdmin: ReturnType<typeof createClient>,
  table: string,
  columns = "*"
) {
  const { data, error } = await supabaseAdmin.from(table).select(columns);

  if (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }

  return data || [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "GET") {
    return json(res, 405, { error: "Método não permitido." });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return json(res, 500, {
      error:
        "Servidor sem SUPABASE_URL/VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY configurado.",
    });
  }

  const token = getBearerToken(req);

  if (!token) {
    return json(res, 401, { error: "Sessão inválida ou expirada." });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return json(res, 401, { error: "Sessão inválida ou expirada." });
  }

  if (normalizeEmail(user.email) !== normalizeEmail(officialEmail)) {
    return json(res, 403, {
      error: "Somente a conta oficial pode listar empresas.",
    });
  }

  try {
    const companies = await selectOptionalTable(supabaseAdmin, "companies", "*");
    const profiles = await selectOptionalTable(supabaseAdmin, "profiles", "*");
    const socialAccounts = await selectOptionalTable(
      supabaseAdmin,
      "social_accounts",
      "company_id,platform,status,is_connected"
    );

    return json(res, 200, {
      ok: true,
      companies,
      profiles,
      socialAccounts,
    });
  } catch (error: any) {
    console.error("Erro ao listar empresas:", error);

    return json(res, 500, {
      error: error?.message || "Erro ao listar empresas.",
    });
  }
}
