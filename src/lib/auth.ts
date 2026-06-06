export const AUTH_KEY = "spm_auth";

export const getAuthToken = () => {
  return localStorage.getItem(AUTH_KEY);
};

export const setAuthToken = (token: string) => {
  localStorage.setItem(AUTH_KEY, token);
};

export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_KEY);
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};