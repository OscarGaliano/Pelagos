import { supabase } from '@/lib/supabase';

export const AUTH_CALLBACK_PATH = '/auth/callback';
export const AUTH_MODE_KEY = 'pelagos_auth_mode';

const getRedirectUrl = () => {
  return `${window.location.origin}${AUTH_CALLBACK_PATH}`;
};

export function setAuthMode(mode: 'register' | 'login') {
  localStorage.setItem(AUTH_MODE_KEY, mode);
}

export function getAuthMode(): 'register' | 'login' | null {
  return localStorage.getItem(AUTH_MODE_KEY) as 'register' | 'login' | null;
}

export function clearAuthMode() {
  localStorage.removeItem(AUTH_MODE_KEY);
}

export async function signInWithGoogle(mode: 'register' | 'login' = 'login') {
  setAuthMode(mode);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: getRedirectUrl() },
  });
  if (error) {
    console.error('Error con Google:', error);
    clearAuthMode();
    throw error;
  }
}

export async function signInWithFacebook() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo: getRedirectUrl() },
  });
  if (error) {
    console.error('Error con Facebook:', error);
    throw error;
  }
}

export async function exchangeCodeForSession(): Promise<boolean> {
  const search = window.location.search;
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(search || hash);
  const code = params.get('code');
  const errorParam = params.get('error');
  const errorDesc = params.get('error_description');
  if (errorParam) {
    console.error('OAuth error:', errorParam, errorDesc);
    window.history.replaceState({}, '', window.location.pathname || '/');
    return false;
  }
  if (!code) return false;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('Error al intercambiar código:', error);
    window.history.replaceState({}, '', window.location.pathname || '/');
    return false;
  }
  window.history.replaceState({}, '', '/');
  return true;
}
