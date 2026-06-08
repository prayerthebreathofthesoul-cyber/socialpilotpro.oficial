import { supabase } from "@/lib/supabase";

export const AUTH_KEY = "spm_auth";
export const USER_EMAIL_KEY = "socialpilot_user_email";

/**
 * Mantemos esse marcador local para o Layout atual saber se o usuário está logado.
 * Depois que todo o sistema estiver no Supabase, podemos remover isso.
 */
export const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_KEY);
};

export const setAuthToken = (token: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_KEY, token);
};

export const clearAuthToken = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
};

export const setLoggedUserEmail = (email: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_EMAIL_KEY, email);
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

  if (data.session?.access_token) {
    setAuthToken(data.session.access_token);
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
  metadata?: {
    name?: string;
    companyName?: string;
    cnpj?: string;
    cpf?: string;
  }
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

  if (data.session?.access_token) {
    setAuthToken(data.session.access_token);
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
    return null;
  }

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
    return null;
  }

  if (session.access_token) {
    setAuthToken(session.access_token);
  }

  if (session.user?.email) {
    setLoggedUserEmail(session.user.email);
  }

  return session;
};
