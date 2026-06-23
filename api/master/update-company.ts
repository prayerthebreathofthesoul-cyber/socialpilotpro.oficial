import type { VercelRequest, VercelResponse } from "@vercel/node";

function json(res: VercelResponse, status: number, body: Record<string, unknown>) {
  return res.status(status).json(body);
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function getBearerToken(req: VercelRequest) {
  const authorization = String(req.headers.authorization || "");
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

function getBody(req: VercelRequest) {
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

async function readJson(response: Response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== "POST") {
      return json(res, 405, { error: "Método não permitido." });
    }

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

    if (!supabaseUrl || !serviceRoleKey) {
      return json(res, 500, {
        error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurada na Vercel.",
      });
    }

    const userToken = getBearerToken(req);

    if (!userToken) {
      return json(res, 401, { error: "Sessão inválida ou expirada." });
    }

    const body = getBody(req);
    const companyId = String(body?.companyId || "").trim();
    const payload = body?.payload;

    if (!companyId) {
      return json(res, 400, { error: "companyId é obrigatório." });
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return json(res, 400, { error: "Payload inválido." });
    }

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${userToken}`,
      },
    });

    const userData = await readJson(userResponse);

    if (!userResponse.ok || !userData?.email) {
      return json(res, 401, {
        error: "Sessão inválida ou expirada.",
      });
    }

    if (normalizeEmail(userData.email) !== normalizeEmail(officialEmail)) {
      return json(res, 403, {
        error: "Somente a conta oficial pode alterar empresas.",
      });
    }

    const companyResponse = await fetch(
      `${supabaseUrl}/rest/v1/companies?id=eq.${encodeURIComponent(
        companyId
      )}&select=id,email`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const companies = await readJson(companyResponse);

    if (!companyResponse.ok) {
      return json(res, 500, {
        error: companies?.message || companies?.error || "Erro ao buscar empresa.",
      });
    }

    const company = Array.isArray(companies) ? companies[0] : null;

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
        error: "Nenhum campo permitido foi enviado.",
      });
    }

    cleanPayload.updated_at = new Date().toISOString();

    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/companies?id=eq.${encodeURIComponent(
        companyId
      )}&select=*`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(cleanPayload),
      }
    );

    const updatedCompanies = await readJson(updateResponse);

    if (!updateResponse.ok) {
      return json(res, 500, {
        error:
          updatedCompanies?.message ||
          updatedCompanies?.error ||
          "Erro ao atualizar empresa.",
      });
    }

    const updatedCompany = Array.isArray(updatedCompanies)
      ? updatedCompanies[0]
      : null;

    if (!updatedCompany) {
      return json(res, 500, {
        error: "Nenhuma empresa foi alterada no banco.",
      });
    }

    return json(res, 200, {
      ok: true,
      company: updatedCompany,
    });
  } catch (error: any) {
    console.error("Erro em /api/master/update-company:", error);

    return json(res, 500, {
      error: error?.message || "Erro interno ao atualizar empresa.",
    });
  }
}
