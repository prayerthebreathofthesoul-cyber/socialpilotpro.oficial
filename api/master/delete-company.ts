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

function json(res: any, status: number, body: Record<string, unknown>) {
  return res.status(status).json(body);
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function getBearerToken(req: any) {
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

async function deleteFromTable(
  supabaseAdmin: ReturnType<typeof createClient>,
  table: string,
  column: string,
  value: string
) {
  const { error } = await supabaseAdmin.from(table).delete().eq(column, value);

  if (error && !isMissingRelationError(error)) {
    throw error;
  }
}

export default async function handler(req: any, res: any) {
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
      error: "Somente a conta oficial pode excluir empresas.",
    });
  }

  const companyId = String(req.body?.companyId || "").trim();
  let userId = String(req.body?.userId || "").trim();
  const requestedEmail = normalizeEmail(req.body?.email);
  const isOfficial = req.body?.isOfficial === true;

  if (!companyId) {
    return json(res, 400, { error: "companyId é obrigatório." });
  }

  if (isOfficial || requestedEmail === normalizeEmail(officialEmail)) {
    return json(res, 403, {
      error: "A conta oficial não pode ser excluída.",
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

  if (normalizeEmail(company.email) === normalizeEmail(officialEmail)) {
    return json(res, 403, {
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

    if (profileError && !isMissingRelationError(profileError)) {
      return json(res, 500, { error: profileError.message });
    }

    if (profile?.user_id) {
      userId = String(profile.user_id);
    }
  }

  try {
    await deleteFromTable(
      supabaseAdmin,
      "social_accounts",
      "company_id",
      companyId
    );

    await deleteFromTable(
      supabaseAdmin,
      "scheduled_posts",
      "company_id",
      companyId
    );

    await deleteFromTable(
      supabaseAdmin,
      "posts",
      "company_id",
      companyId
    );

    await deleteFromTable(
      supabaseAdmin,
      "post_media",
      "company_id",
      companyId
    );

    await deleteFromTable(
      supabaseAdmin,
      "profiles",
      "company_id",
      companyId
    );

    const { error: deleteCompanyError } = await supabaseAdmin
      .from("companies")
      .delete()
      .eq("id", companyId);

    if (deleteCompanyError) {
      throw deleteCompanyError;
    }

    if (userId) {
      const { error: deleteUserError } =
        await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteUserError) {
        throw deleteUserError;
      }
    }

    return json(res, 200, {
      ok: true,
      deletedCompanyId: companyId,
      deletedUserId: userId || null,
    });
  } catch (error: any) {
    console.error("Erro ao excluir empresa:", error);

    return json(res, 500, {
      error: error?.message || "Erro ao excluir empresa.",
    });
  }
}
