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

const FREE_PLAN_POST_LIMIT = 3;

function sendJson(
  res: VercelResponse,
  status: number,
  body: Record<string, unknown>
) {
  return res.status(status).json(body);
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function getBody(req: VercelRequest) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body || {};
}

function getBearerToken(req: VercelRequest) {
  const authorization = String(req.headers.authorization || "");
  const parts = authorization.split(" ");

  if (parts[0]?.toLowerCase() !== "bearer" || !parts[1]) {
    return "";
  }

  return parts[1];
}

function getPayload(action: string) {
  if (action === "activate_premium") {
    return {
      plan: "premium",
      plan_status: "active",
      status: "active",
      is_blocked: false,
      posts_limit: null,
    };
  }

  if (action === "cancel_premium") {
    return {
      plan: "free",
      plan_status: "active",
      status: "active",
      is_blocked: false,
      posts_limit: FREE_PLAN_POST_LIMIT,
    };
  }

  if (action === "block") {
    return {
      plan_status: "blocked",
      status: "blocked",
      is_blocked: true,
    };
  }

  if (action === "unblock") {
    return {
      plan_status: "active",
      status: "active",
      is_blocked: false,
    };
  }

  if (action === "reset_usage") {
    return {
      posts_used: 0,
    };
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== "POST") {
      return sendJson(res, 405, {
        ok: false,
        error: "Método não permitido.",
      });
    }

    if (!supabaseUrl) {
      return sendJson(res, 500, {
        ok: false,
        error: "SUPABASE_URL ou VITE_SUPABASE_URL não está configurado.",
      });
    }

    if (!serviceRoleKey) {
      return sendJson(res, 500, {
        ok: false,
        error: "SUPABASE_SERVICE_ROLE_KEY não está configurado no Vercel.",
      });
    }

    const token = getBearerToken(req);

    if (!token) {
      return sendJson(res, 401, {
        ok: false,
        error: "Sessão inválida ou expirada.",
      });
    }

    const body = getBody(req);
    const companyId = String(body.companyId || "").trim();
    const action = String(body.action || "").trim();

    if (!companyId) {
      return sendJson(res, 400, {
        ok: false,
        error: "companyId é obrigatório.",
      });
    }

    const payload = getPayload(action);

    if (!payload) {
      return sendJson(res, 400, {
        ok: false,
        error: "Ação inválida.",
      });
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
      return sendJson(res, 401, {
        ok: false,
        error: "Sessão inválida ou expirada.",
        detail: userError?.message || null,
      });
    }

    if (normalizeEmail(user.email) !== normalizeEmail(officialEmail)) {
      return sendJson(res, 403, {
        ok: false,
        error: "Somente a conta oficial pode alterar empresas.",
        loggedEmail: user.email || null,
        officialEmail,
      });
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id,email")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError) {
      return sendJson(res, 500, {
        ok: false,
        error: companyError.message,
      });
    }

    if (!company) {
      return sendJson(res, 404, {
        ok: false,
        error: "Empresa não encontrada.",
      });
    }

    if (
      normalizeEmail(company.email) === normalizeEmail(officialEmail) &&
      (action === "cancel_premium" || action === "block")
    ) {
      return sendJson(res, 403, {
        ok: false,
        error: "A conta oficial não pode ser bloqueada nem voltar ao gratuito.",
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from("companies")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", companyId);

    if (updateError) {
      return sendJson(res, 500, {
        ok: false,
        error: updateError.message,
        code: updateError.code || null,
      });
    }

    return sendJson(res, 200, {
      ok: true,
      action,
      companyId,
      message: "Empresa atualizada com sucesso.",
    });
  } catch (error: any) {
    console.error("update-company fatal error:", error);

    return sendJson(res, 500, {
      ok: false,
      error: error?.message || "Erro interno ao atualizar empresa.",
      stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
    });
  }
}
