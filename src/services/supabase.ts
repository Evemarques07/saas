import { createClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// Auth Types
// ============================================

export type { User, Session, AuthChangeEvent };

// ============================================
// Auth Functions
// ============================================

export async function supabaseSignIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function supabaseSignUp(
  email: string,
  password: string,
  metadata?: { full_name?: string }
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
  if (error) throw error;
  return data;
}

export async function supabaseSignInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}

export async function supabaseSignOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function supabaseResetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  if (error) throw error;
  return data;
}

export async function supabaseUpdatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
  return data;
}

export async function supabaseUpdateUser(updates: {
  email?: string;
  password?: string;
  data?: Record<string, unknown>;
}) {
  const { data, error } = await supabase.auth.updateUser(updates);
  if (error) throw error;
  return data;
}

export async function supabaseGetSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function supabaseGetUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export function supabaseOnAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}

// Helper to get access token for Edge Functions
export async function supabaseGetAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;
    return data.session.access_token;
  } catch {
    return null;
  }
}
