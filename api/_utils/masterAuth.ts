import { createClient } from "@supabase/supabase-js";
import type { VercelRequest } from "@vercel/node";

const supabaseUrl =
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL não configurada.");
}

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function requireMaster(req: VercelRequest) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      allowed: false,
      status: 401,
      error: "Token de autenticação não enviado.",
      user: null,
    };
  }

  const token = authHeader.replace("Bearer ", "").trim();

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return {
      allowed: false,
      status: 401,
      error: "Usuário não autenticado.",
      user: null,
    };
  }

  const email = String(user.email || "").trim().toLowerCase();

  if (email !== "socialpilotpro.oficial@gmail.com") {
    return {
      allowed: false,
      status: 403,
      error: "Acesso negado. Apenas a conta oficial pode acessar o Master.",
      user,
    };
  }

  return {
    allowed: true,
    status: 200,
    error: null,
    user,
  };
}
