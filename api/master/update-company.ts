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

  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return json(res, 405, { error: "Método não permitido." });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return json(res, 500, {
      error: "Servidor sem SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.",
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
      error: "Somente a conta oficial pode alterar empresas.",
    });
  }

  const companyId = String(req.body?.companyId || "").trim();
  const payload = req.body?.payload;

  if (!companyId) {
    return json(res, 400, { error: "companyId é obrigatório." });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return json(res, 400, { error: "Payload inválido." });
  }

  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .select("id,email")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) {
    return json(res, 500, { error: companyError.message });
  }

  if (!company) {
    return json(res, 404, { error: "Empresa não encontrada." });
  }

  if (normalizeEmail(company.email) === normalizeEmail(officialEmail)) {
    return json(res, 403, {
      error: "A conta oficial não pode ser alterada por esta ação.",
    });
  }

  const allowedFields = [
    "plan",
    "plan_status",
    "status",
    "is_blocked",
    "posts_limit",
    "posts_used",
  ];

  const cleanPayload: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in payload) {
      cleanPayload[field] = payload[field];
    }
  }

  if (Object.keys(cleanPayload).length === 0) {
    return json(res, 400, {
      error: "Nenhum campo permitido foi enviado para atualização.",
    });
  }

  cleanPayload.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("companies")
    .update(cleanPayload)
    .eq("id", companyId)
    .select("*")
    .maybeSingle();

  if (error) {
    return json(res, 500, { error: error.message });
  }

  if (!data) {
    return json(res, 500, {
      error: "Nenhuma empresa foi alterada no banco.",
    });
  }

  return json(res, 200, {
    ok: true,
    company: data,
  });
}
