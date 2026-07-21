import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured
  ? createClient(url, key, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

const configuredSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL;
const appUrl = (path = "/") => new URL(path, configuredSiteUrl || window.location.origin).toString();

function requireSupabase() {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  return supabase;
}

export async function signInWithProvider(provider) {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo: appUrl("/?auth=callback") },
  });
  if (error) throw error;
}

export async function signInWithMagicLink(email) {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: appUrl("/?auth=callback"),
      shouldCreateUser: true,
    },
  });
  if (error) throw error;
}

export async function signInWithPassword(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(email, password, fullName) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: appUrl("/?auth=callback"),
      data: { full_name: fullName.trim() },
    },
  });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email) {
  const client = requireSupabase();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: appUrl("/?auth=recovery"),
  });
  if (error) throw error;
}

export async function updatePassword(password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.updateUser({ password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}
