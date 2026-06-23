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

type MasterAction =
  | "activate_premium"
  | "cancel_premium"
  | "block"
  | "unblock"
  | "reset_usage";

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

function getRequestBody(req: VercelRequest) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body || {};
}

function isMissingColumnError(error: any) {
  const message = String(error?.message || "").toLowerCase();

  return (
    error?.code === "42703" ||
    message.includes("column") ||
    message.includes("schema cache")
  );
}

async function updateCompanyWithFallbacks(
  supabaseAdmin: ReturnType<typeof createClient>,
  companyId: string,
  payloads: Record<string, unknown>[]
) {
  let lastError: any = null;

  for (const payload of payloads) {
    const payloadWithUpdatedAt = {
      ...payload,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("companies")
      .update(payloadWithUpdatedAt)
      .eq("id", companyId);

    if (!error) {
      const { data } = await supabaseAdmin
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();

      return data;
    }

    lastError = error;

    if (!isMissingColumnError(error)) {
      break;
    }

    const { error: retryError } = await supabaseAdmin
      .from("companies")
      .update(payload)
      .eq("id", companyId);

    if (!retryError) {
      const { data } = await supabaseAdmin
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();

      return data;
    }

    lastError = retryError;

    if (!isMissingColumnError(retryError)) {
      break;
    }
  }

  throw lastError || new Error("Não foi possível atualizar a empresa.");
}

function getActionPayloads(action: MasterAction) {
  if (action === "activate_premium") {
    return [
      {
        plan: "premium",
        plan_status: "active",
        status: "active",
        is_blocked: false,
        posts_limit: null,
      },
      {
        plan: "premium",
        plan_status: "active",
        posts_limit: null,
      },
      {
        plan: "premium",
      },
    ];
  }

  if (action === "cancel_premium") {
    return [
      {
        plan: "free",
        plan_status: "active",
        status: "active",
        is_blocked: false,
        posts_limit: FREE_PLAN_POST_LIMIT,
      },
      {
        plan: "free",
        plan_status: "active",
        posts_limit: FREE_PLAN_POST_LIMIT,
      },
      {
        plan: "free",
      },
    ];
  }

  if (action === "block") {
    return [
      {
        plan_status: "blocked",
        status: "blocked",
        is_blocked: true,
      },
      {
        plan_status: "blocked",
      },
      {
        status: "blocked",
      },
      {
        is_blocked: true,
      },
    ];
  }

  if (action === "unblock") {
    return [
      {
        plan_status: "active",
        status: "active",
        is_blocked: false,
      },
      {
        plan_status: "active",
      },
      {
        status: "active",
      },
      {
        is_blocked: false,
      },
    ];
  }

  return [
    {
      posts_used: 0,
    },
    {
      postsUsed: 0,
    },
  ];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== "POST") {
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
        error: "Somente a conta oficial pode alterar empresas.",
      });
    }

    const body = getRequestBody(req);
    const companyId = String(body?.companyId || "").trim();
    const action = String(body?.action || "").trim() as MasterAction;

    if (!companyId) {
      return json(res, 400, { error: "companyId é obrigatório." });
    }

    if (
      ![
        "activate_premium",
        "cancel_premium",
        "block",
        "unblock",
        "reset_usage",
      ].includes(action)
    ) {
      return json(res, 400, { error: "Ação inválida." });
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError) {
      return json(res, 500, { error: companyError.message });
    }

    if (!company) {
      return json(res, 404, { error: "Empresa não encontrada." });
    }

    const companyEmail = normalizeEmail(company.email);

    if (
      companyEmail === normalizeEmail(officialEmail) &&
      ["cancel_premium", "block"].includes(action)
    ) {
      return json(res, 403, {
        error: "A conta oficial não pode ser bloqueada nem voltar ao gratuito.",
      });
    }

    const updatedCompany = await updateCompanyWithFallbacks(
      supabaseAdmin,
      companyId,
      getActionPayloads(action)
    );

    return json(res, 200, {
      ok: true,
      action,
      company: updatedCompany,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar empresa:", error);

    return json(res, 500, {
      error: error?.message || "Erro ao atualizar empresa.",
    });
  }
}
