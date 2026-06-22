import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL não foi configurada.");
}

if (!supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_ANON_KEY não foi configurada.");
}

if (supabaseAnonKey.toLowerCase().includes("service_role")) {
  throw new Error(
    "A chave service_role não pode ser usada no frontend. Use apenas a anon key."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "socialpilotpro.auth",
  },
  global: {
    headers: {
      "X-Client-Info": "socialpilotpro-web",
    },
  },
});
