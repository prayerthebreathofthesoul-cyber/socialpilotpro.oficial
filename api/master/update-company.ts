import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  "";

const OFFICIAL_EMAIL =
  process.env.MASTER_OFFICIAL_EMAIL || "socialpilotpro.oficial@gmail.com";

const FREE_PLAN_POST_LIMIT = 3;

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function send(res: VercelResponse, status: number, body: Record<string, unknown>) {
  res.setHeader("Content-Type", "application/json");
  return res.status(status).json(body);
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

function getToken(req: VercelRequest) {
  const authorization = String(req.headers.authorization || "");
  const [type, token] = authorization.split(" ");

  if (type?.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token;
}

function getUpdatePayload(action: string) {
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
    if (req.method !== "POST") {
      return send(res, 405, {
        ok: false,
        error: "Método não permitido.",
      });
    }

    if (!SUPABASE_URL) {
      return send(res, 500, {
        ok: false,
        error: "SUPABASE_URL/VITE_SUPABASE_URL não configurado no Vercel.",
      });
    }

    if (!SERVICE_ROLE_KEY) {
      return send(res, 500, {
        ok: false,
        error: "SUPABASE_SERVICE_ROLE_KEY não configurado no Vercel.",
      });
    }

    const token = getToken(req);

    if (!token) {
      return send(res, 401, {
        ok: false,
        error: "Sessão inválida ou expirada.",
      });
    }

    const body = getBody(req);
    const companyId = String(body.companyId || "").trim();
    const action = String(body.action || "").trim();

    if (!companyId) {
      return send(res, 400, {
        ok: false,
        error: "companyId é obrigatório.",
      });
    }

    const payload = getUpdatePayload(action);

    if (!payload) {
      return send(res, 400, {
        ok: false,
        error: "Ação inválida.",
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
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
      return send(res, 401, {
        ok: false,
        error: "Sessão inválida ou expirada.",
        detail: userError?.message || null,
      });
    }

    if (normalizeEmail(user.email) !== normalizeEmail(OFFICIAL_EMAIL)) {
      return send(res, 403, {
        ok: false,
        error: "Somente a conta oficial pode alterar empresas.",
        loggedEmail: user.email || null,
        officialEmail: OFFICIAL_EMAIL,
      });
    }

    const { data: company, error: findError } = await supabaseAdmin
      .from("companies")
      .select("id,email")
      .eq("id", companyId)
      .maybeSingle();

    if (findError) {
      return send(res, 500, {
        ok: false,
        error: findError.message,
        code: findError.code || null,
      });
    }

    if (!company) {
      return send(res, 404, {
        ok: false,
        error: "Empresa não encontrada.",
      });
    }

    if (
      normalizeEmail(company.email) === normalizeEmail(OFFICIAL_EMAIL) &&
      (action === "cancel_premium" || action === "block")
    ) {
      return send(res, 403, {
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
      return send(res, 500, {
        ok: false,
        error: updateError.message,
        code: updateError.code || null,
      });
    }

    return send(res, 200, {
      ok: true,
      action,
      companyId,
      message: "Empresa atualizada com sucesso.",
    });
  } catch (error: any) {
    return send(res, 500, {
      ok: false,
      error: error?.message || "Erro interno ao atualizar empresa.",
    });
  }
}
