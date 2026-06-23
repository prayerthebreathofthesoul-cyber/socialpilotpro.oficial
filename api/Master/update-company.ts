import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

type MasterAction =
  | "activate_premium"
  | "cancel_premium"
  | "block"
  | "unblock"
  | "reset_usage";

const FREE_PLAN_POST_LIMIT = 3;

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

function isMissingColumnError(error: any) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();

  return (
    code === "42703" ||
    message.includes("column") ||
    message.includes("could not find") ||
    message.includes("schema cache")
  );
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

function getPostsUsed(company: any) {
  return Number(company?.posts_used ?? company?.postsUsed ?? 0);
}

function assertActionApplied(action: MasterAction, updatedCompany: any) {
  if (!updatedCompany?.id) {
    throw new Error("O Supabase não retornou a empresa atualizada.");
  }

  if (action === "activate_premium" && updatedCompany.plan !== "premium") {
    throw new Error("O Premium não foi salvo no banco de dados.");
  }

  if (action === "cancel_premium" && updatedCompany.plan !== "free") {
    throw new Error("O plano gratuito não foi salvo no banco de dados.");
  }

  if (action === "block") {
    const blocked =
      updatedCompany.is_blocked === true ||
      updatedCompany.plan_status === "blocked" ||
      updatedCompany.status === "blocked";

    if (!blocked) {
      throw new Error("O bloqueio não foi salvo no banco de dados.");
    }
  }

  if (action === "unblock") {
    const active =
      updatedCompany.is_blocked === false ||
      updatedCompany.plan_status === "active" ||
      updatedCompany.status === "active";

    if (!active) {
      throw new Error("A ativação do usuário não foi salva no banco de dados.");
    }
  }

  if (action === "reset_usage" && getPostsUsed(updatedCompany) !== 0) {
    throw new Error("O uso mensal não foi zerado no banco de dados.");
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      error: "Somente a conta oficial pode alterar empresas no painel master.",
    });
  }

  const companyId = String(req.body?.companyId || "").trim();
  const action = String(req.body?.action || "").trim() as MasterAction;
  const requestedEmail = normalizeEmail(req.body?.email);
  const isOfficial = req.body?.isOfficial === true;

  const validActions: MasterAction[] = [
    "activate_premium",
    "cancel_premium",
    "block",
    "unblock",
    "reset_usage",
  ];

  if (!companyId) {
    return json(res, 400, { error: "companyId é obrigatório." });
  }

  if (!validActions.includes(action)) {
    return json(res, 400, { error: "Ação master inválida." });
  }

  const isProtectedOfficial =
    isOfficial ||
    requestedEmail === normalizeEmail(officialEmail) ||
    normalizeEmail(user.email) === requestedEmail;

  if (isProtectedOfficial && action !== "reset_usage") {
    return json(res, 403, {
      error: "A conta oficial não pode ser alterada por esta ação.",
    });
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

  if (
    normalizeEmail(company.email) === normalizeEmail(officialEmail) &&
    action !== "reset_usage"
  ) {
    return json(res, 403, { error: "A conta oficial não pode ser alterada." });
  }

  let lastError: any = null;

  try {
    const canUpdateTimestamp = Object.prototype.hasOwnProperty.call(
      company,
      "updated_at"
    );

    for (const payload of getActionPayloads(action)) {
      const updatePayload = canUpdateTimestamp
        ? {
            ...payload,
            updated_at: new Date().toISOString(),
          }
        : payload;

      const { data: updatedCompany, error } = await supabaseAdmin
        .from("companies")
        .update(updatePayload)
        .eq("id", companyId)
        .select("*")
        .maybeSingle();

      if (!error && updatedCompany) {
        assertActionApplied(action, updatedCompany);

        return json(res, 200, {
          ok: true,
          action,
          company: updatedCompany,
        });
      }

      lastError = error;

      if (!isMissingColumnError(error)) {
        break;
      }
    }

    throw lastError || new Error("A ação não alterou nenhuma empresa.");
  } catch (error: any) {
    console.error("Erro na ação master:", error);
    return json(res, 500, {
      error: error?.message || "Erro ao alterar empresa.",
    });
  }
}
