import { createClient } from "@supabase/supabase-js";
import { createAppUrl } from "./site-url.js";

const browserEnv = import.meta.env || {};
const url = String(browserEnv.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
const key = String(
  browserEnv.VITE_SUPABASE_PUBLISHABLE_KEY
  || browserEnv.VITE_SUPABASE_ANON_KEY
  || "",
).trim();

export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured
  ? createClient(url, key, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          "x-client-info": "ngeblogging-web-v140",
        },
      },
    })
  : null;

if (typeof document !== "undefined") {
  document.documentElement.dataset.supabaseTransport = supabaseConfigured ? "direct-v140" : "not-configured";
}

const configuredSiteUrl = browserEnv.VITE_PUBLIC_SITE_URL;
const currentOrigin = typeof window === "undefined" ? "" : window.location.origin;
const appUrl = (path = "/") => createAppUrl(path, configuredSiteUrl, currentOrigin);

function requireSupabase() {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi pada deployment ini.");
  return supabase;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export async function signInWithProvider(provider) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: appUrl("/?auth=callback"),
      skipBrowserRedirect: false,
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithMagicLink(email) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: {
      emailRedirectTo: appUrl("/?auth=callback"),
      shouldCreateUser: false,
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithPassword(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: normalizeEmail(email),
    password: String(password || ""),
  });
  if (error) throw error;
  if (!data?.session?.access_token) throw new Error("Sesi login tidak terbentuk. Silakan coba kembali.");
  return data;
}

export async function signUpWithPassword(email, password, fullName) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: normalizeEmail(email),
    password: String(password || ""),
    options: {
      emailRedirectTo: appUrl("/?auth=callback"),
      data: { full_name: String(fullName || "").trim() },
    },
  });
  if (error) throw error;
  return data;
}

export async function resendSignUpConfirmation(email) {
  const client = requireSupabase();
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("Masukkan email yang digunakan saat mendaftar.");
  const { data, error } = await client.auth.resend({
    type: "signup",
    email: normalizedEmail,
    options: { emailRedirectTo: appUrl("/?auth=callback") },
  });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email) {
  const client = requireSupabase();
  const { data, error } = await client.auth.resetPasswordForEmail(
    normalizeEmail(email),
    { redirectTo: appUrl("/?auth=recovery") },
  );
  if (error) throw error;
  return data;
}

export async function updatePassword(password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.updateUser({ password: String(password || "") });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) throw error;
}
