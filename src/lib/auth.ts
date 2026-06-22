import { supabase } from "@/lib/supabase";

export const AUTH_KEY = "spm_auth";
export const USER_EMAIL_KEY = "socialpilot_user_email";

/**
 * Marcador simples para o layout saber se existe usuário logado.
 * Importante: não armazenamos access_token aqui.
 */
export const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_KEY);
};

export const setAuthToken = () => {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_KEY, "authenticated");
};

export const clearAuthToken = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
};

export const setLoggedUserEmail = (email: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_EMAIL_KEY, email.trim().toLowerCase());
};

export const getLoggedUserEmail = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_EMAIL_KEY);
};

export const clearLoggedUserEmail = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_EMAIL_KEY);
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

/**
 * Use esta função quando alguma API precisar do Bearer token.
 * Ela busca o token direto da sessão atual do Supabase, sem duplicar em localStorage.
 */
export const getAccessToken = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    return null;
  }

  return session.access_token;
};

/**
 * Login real com Supabase
 */
export const signInWithEmail = async (email: string, password: string) => {
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    throw error;
  }

  if (data.session) {
    setAuthToken();
  }

  if (data.user?.email) {
    setLoggedUserEmail(data.user.email);
  } else {
    setLoggedUserEmail(cleanEmail);
  }

  return data;
};

/**
 * Cadastro real com Supabase
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  metadata?: Record<string, unknown>
) => {
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: metadata || {},
    },
  });

  if (error) {
    throw error;
  }

  if (data.session) {
    setAuthToken();
  }

  if (data.user?.email) {
    setLoggedUserEmail(data.user.email);
  } else {
    setLoggedUserEmail(cleanEmail);
  }

  return data;
};

/**
 * Sair da conta
 */
export const signOut = async () => {
  await supabase.auth.signOut();

  clearAuthToken();
  clearLoggedUserEmail();

  if (typeof window !== "undefined") {
    localStorage.removeItem("spm_company_id");
    localStorage.removeItem("spm_user");
    localStorage.removeItem("spm_current_company");
    localStorage.removeItem("socialpilot_current_company");
    localStorage.removeItem("socialpilot_demo_stores");
  }
};

/**
 * Buscar usuário logado no Supabase
 */
export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    clearAuthToken();
    return null;
  }

  setAuthToken();

  if (user.email) {
    setLoggedUserEmail(user.email);
  }

  return user;
};

/**
 * Recuperar sessão atual do Supabase
 */
export const getCurrentSession = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    clearAuthToken();
    return null;
  }

  setAuthToken();

  if (session.user?.email) {
    setLoggedUserEmail(session.user.email);
  }

  return session;
};
