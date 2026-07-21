import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured
  ? createClient(url, key, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export async function signInWithProvider(provider) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/` },
  });
  if (error) throw error;
}

export async function signInWithMagicLink(email) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/` },
  });
  if (error) throw error;
}
