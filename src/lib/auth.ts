import { supabase } from "@/lib/supabase";

export const AUTH_KEY = "spm_auth";

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

export const isAuthenticated = () => {
  return !!getAuthToken();
};

/**
 * Login real com Supabase
 */
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (data.session?.access_token) {
    setAuthToken(data.session.access_token);
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
  }
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
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

  return data;
};

/**
 * Sair da conta
 */
export const signOut = async () => {
  await supabase.auth.signOut();
  clearAuthToken();
};

/**
 * Buscar usuário logado no Supabase
 */
export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
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

  if (error) {
    return null;
  }

  if (session?.access_token) {
    setAuthToken(session.access_token);
  }

  return session;
};
