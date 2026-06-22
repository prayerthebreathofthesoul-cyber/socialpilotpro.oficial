import { createClient } from "@supabase/supabase-js";

function sendJson(res: any, status: number, body: Record<string, unknown>) {
  res.status(status).json(body);
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function getEnv(name: string) {
  return String(process.env[name] || "").trim();
}

function getBearerToken(req: any) {
  const authorization = String(req.headers?.authorization || "");
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token;
}

function getBody(req: any) {
  if (!req.body) return {};

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
}

function isIgnorableSupabaseError(error: any) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();

  return (
    code === "42P01" ||
    code === "42703" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find")
  );
}

async function deleteByCompanyId(
  supabaseAdmin: any,
  table: string,
  companyId: string
) {
  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .eq("company_id", companyId);

  if (error && !isIgnorableSupabaseError(error)) {
    throw new Error(`Erro ao limpar ${table}: ${error.message}`);
  }
}

export default async function handler(req: any, res: any) {
  try {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== "POST") {
      return sendJson(res, 405, {
        error: "Método não permitido.",
      });
    }

    const supabaseUrl =
      getEnv("SUPABASE_URL") ||
      getEnv("VITE_SUPABASE_URL") ||
      getEnv("NEXT_PUBLIC_SUPABASE_URL");

    const serviceRoleKey =
      getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
      getEnv("SUPABASE_SERVICE_KEY") ||
      getEnv("SUPABASE_SERVICE_ROLE");

    const officialEmail =
      getEnv("MASTER_OFFICIAL_EMAIL") || "socialpilotpro.oficial@gmail.com";

    if (!supabaseUrl) {
      return sendJson(res, 500, {
        error:
          "Falta configurar SUPABASE_URL ou VITE_SUPABASE_URL nas variáveis da Vercel.",
      });
    }

    if (!serviceRoleKey) {
      return sendJson(res, 500, {
        error:
          "Falta configurar SUPABASE_SERVICE_ROLE_KEY nas variáveis da Vercel.",
      });
    }

    const token = getBearerToken(req);

    if (!token) {
      return sendJson(res, 401, {
        error: "Sessão inválida ou expirada. Faça login novamente.",
      });
    }

    const body = getBody(req);

    const companyId = String(body.companyId || "").trim();
    let userId = String(body.userId || "").trim();
    const requestedEmail = normalizeEmail(body.email);
    const requestedOfficial = body.isOfficial === true;

    if (!companyId) {
      return sendJson(res, 400, {
        error: "companyId é obrigatório.",
      });
    }

    if (requestedOfficial || requestedEmail === normalizeEmail(officialEmail)) {
      return sendJson(res, 403, {
        error: "A conta oficial não pode ser excluída.",
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
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return sendJson(res, 401, {
        error: "Sessão inválida ou expirada. Entre novamente no painel master.",
        detalhe: authError?.message || null,
      });
    }

    if (normalizeEmail(user.email) !== normalizeEmail(officialEmail)) {
      return sendJson(res, 403, {
        error: "Somente a conta oficial pode excluir empresas.",
        usuarioLogado: user.email || null,
        contaPermitida: officialEmail,
      });
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError) {
      return sendJson(res, 500, {
        error: `Erro ao buscar empresa: ${companyError.message}`,
      });
    }

    if (!company) {
      return sendJson(res, 404, {
        error: "Empresa não encontrada.",
      });
    }

    if (normalizeEmail(company.email) === normalizeEmail(officialEmail)) {
      return sendJson(res, 403, {
        error: "A conta oficial não pode ser excluída.",
      });
    }

    if (!userId && company.user_id) {
      userId = String(company.user_id);
    }

    if (!userId) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("company_id", companyId)
        .maybeSingle();

      if (profileError && !isIgnorableSupabaseError(profileError)) {
        return sendJson(res, 500, {
          error: `Erro ao buscar perfil: ${profileError.message}`,
        });
      }

      if (profile?.user_id) {
        userId = String(profile.user_id);
      }
    }

    await deleteByCompanyId(supabaseAdmin, "social_accounts", companyId);
    await deleteByCompanyId(supabaseAdmin, "scheduled_posts", companyId);
    await deleteByCompanyId(supabaseAdmin, "posts", companyId);
    await deleteByCompanyId(supabaseAdmin, "post_media", companyId);
    await deleteByCompanyId(supabaseAdmin, "profiles", companyId);

    const { error: deleteCompanyError } = await supabaseAdmin
      .from("companies")
      .delete()
      .eq("id", companyId);

    if (deleteCompanyError) {
      return sendJson(res, 500, {
        error: `Erro ao excluir empresa: ${deleteCompanyError.message}`,
      });
    }

    if (userId) {
      const { error: deleteUserError } =
        await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteUserError) {
        return sendJson(res, 500, {
          error:
            "A empresa foi excluída, mas houve erro ao excluir o usuário do Auth.",
          detalhe: deleteUserError.message,
          deletedCompanyId: companyId,
          userId,
        });
      }
    }

    return sendJson(res, 200, {
      ok: true,
      message: "Empresa excluída com sucesso.",
      deletedCompanyId: companyId,
      deletedUserId: userId || null,
    });
  } catch (error: any) {
    console.error("Erro fatal em delete-company:", error);

    return sendJson(res, 500, {
      error: "Erro interno ao excluir empresa.",
      detalhe: error?.message || String(error),
    });
  }
}
