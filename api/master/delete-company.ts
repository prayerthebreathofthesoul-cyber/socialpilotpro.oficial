function sendJson(res: any, status: number, body: Record<string, unknown>) {
  return res.status(status).json(body);
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

  if (scheme?.toLowerCase() !== "bearer" || !token) return "";

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

async function readSupabaseResponse(response: Response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function buildSupabaseHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

async function supabaseGet(
  supabaseUrl: string,
  serviceRoleKey: string,
  path: string
) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method: "GET",
    headers: buildSupabaseHeaders(serviceRoleKey),
  });

  const data = await readSupabaseResponse(response);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Erro ao consultar Supabase.");
  }

  return data;
}

async function supabaseDelete(
  supabaseUrl: string,
  serviceRoleKey: string,
  table: string,
  filter: string
) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?${filter}`,
    {
      method: "DELETE",
      headers: {
        ...buildSupabaseHeaders(serviceRoleKey),
        Prefer: "return=minimal",
      },
    }
  );

  const data = await readSupabaseResponse(response);

  if (!response.ok && !isIgnorableSupabaseError(data)) {
    throw new Error(
      data?.message || data?.error || `Erro ao excluir dados de ${table}.`
    );
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
        error: "Sessão expirada. Faça login novamente.",
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

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${token}`,
      },
    });

    const userData = await readSupabaseResponse(userResponse);

    if (!userResponse.ok || !userData?.email) {
      return sendJson(res, 401, {
        error: "Sessão inválida ou expirada. Entre novamente no painel master.",
        detalhe: userData?.message || userData?.error || null,
      });
    }

    if (normalizeEmail(userData.email) !== normalizeEmail(officialEmail)) {
      return sendJson(res, 403, {
        error: "Somente a conta oficial pode excluir empresas.",
        usuarioLogado: userData.email,
        contaPermitida: officialEmail,
      });
    }

    const companyRows = await supabaseGet(
      supabaseUrl,
      serviceRoleKey,
      `/rest/v1/companies?id=eq.${encodeURIComponent(companyId)}&select=*&limit=1`
    );

    const company = Array.isArray(companyRows) ? companyRows[0] : null;

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
      try {
        const profileRows = await supabaseGet(
          supabaseUrl,
          serviceRoleKey,
          `/rest/v1/profiles?company_id=eq.${encodeURIComponent(
            companyId
          )}&select=user_id&limit=1`
        );

        const profile = Array.isArray(profileRows) ? profileRows[0] : null;

        if (profile?.user_id) {
          userId = String(profile.user_id);
        }
      } catch {
        userId = "";
      }
    }

    const companyFilter = `company_id=eq.${encodeURIComponent(companyId)}`;

    await supabaseDelete(supabaseUrl, serviceRoleKey, "social_accounts", companyFilter);
    await supabaseDelete(supabaseUrl, serviceRoleKey, "scheduled_posts", companyFilter);
    await supabaseDelete(supabaseUrl, serviceRoleKey, "posts", companyFilter);
    await supabaseDelete(supabaseUrl, serviceRoleKey, "post_media", companyFilter);
    await supabaseDelete(supabaseUrl, serviceRoleKey, "profiles", companyFilter);

    await supabaseDelete(
      supabaseUrl,
      serviceRoleKey,
      "companies",
      `id=eq.${encodeURIComponent(companyId)}`
    );

    if (userId) {
      const deleteUserResponse = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
          headers: buildSupabaseHeaders(serviceRoleKey),
        }
      );

      const deleteUserData = await readSupabaseResponse(deleteUserResponse);

      if (!deleteUserResponse.ok) {
        return sendJson(res, 500, {
          error:
            "A empresa foi excluída, mas houve erro ao excluir o usuário do Auth.",
          detalhe:
            deleteUserData?.message ||
            deleteUserData?.error ||
            "Erro desconhecido ao excluir usuário.",
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
