import { createClient } from "@supabase/supabase-js";
import { createAppUrl } from "./site-url.js";

const AUTH_RELEASE = "auth-production-v153-20260730";
const AUTH_GATEWAY_PREFIX = "/api/auth-proxy";
const OAUTH_PROVIDERS = new Set(["google", "github", "linkedin_oidc"]);
const browserEnv = import.meta.env || {};
const url = String(browserEnv.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
const key = String(
  browserEnv.VITE_SUPABASE_PUBLISHABLE_KEY
  || browserEnv.VITE_SUPABASE_ANON_KEY
  || "",
).trim();
const nativeFetch = typeof globalThis.fetch === "function"
  ? globalThis.fetch.bind(globalThis)
  : null;

export const supabaseConfigured = Boolean(url && key);

function supabaseOrigin() {
  try { return url ? new URL(url).origin : ""; } catch { return ""; }
}

function gatewayHost() {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname.toLowerCase();
  return hostname === "ngeblogging.com"
    || hostname === "www.ngeblogging.com"
    || hostname.endsWith(".ngeblogging.com")
    || hostname.endsWith(".workers.dev");
}

function proxiedAuthUrl(value) {
  if (!gatewayHost() || typeof window === "undefined") return null;
  let target;
  try {
    target = new URL(value instanceof Request ? value.url : String(value), window.location.origin);
  } catch {
    return null;
  }
  if (target.origin !== supabaseOrigin() || !target.pathname.startsWith("/auth/v1/")) return null;
  return new URL(`${AUTH_GATEWAY_PREFIX}${target.pathname}${target.search}`, window.location.origin);
}

async function authAwareFetch(input, init) {
  if (!nativeFetch) throw new Error("Fetch API tidak tersedia pada browser ini.");
  const proxy = proxiedAuthUrl(input);
  if (!proxy) return nativeFetch(input, init);

  const request = input instanceof Request
    ? new Request(proxy.toString(), input)
    : proxy.toString();
  const response = await nativeFetch(request, init);
  if (typeof document !== "undefined") {
    document.documentElement.dataset.authTransportV153 = response.headers.get("x-ngeblogging-auth-gateway")
      ? "same-origin-gateway"
      : "same-origin-response";
  }
  return response;
}

export const supabase = supabaseConfigured
  ? createClient(url, key, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        fetch: authAwareFetch,
        headers: {
          "x-client-info": "ngeblogging-web-v153",
        },
      },
    })
  : null;

if (typeof document !== "undefined") {
  document.documentElement.dataset.supabaseTransport = supabaseConfigured ? "auth-gateway-v153" : "not-configured";
  document.documentElement.dataset.authProductionRelease = AUTH_RELEASE;
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

function providerDestination(value) {
  const direct = new URL(value);
  const proxy = proxiedAuthUrl(direct.toString());
  return proxy?.toString() || direct.toString();
}

export async function signInWithProvider(provider) {
  const client = requireSupabase();
  const normalizedProvider = String(provider || "").trim();
  if (!OAUTH_PROVIDERS.has(normalizedProvider)) throw new Error("Provider login tidak didukung.");

  const { data, error } = await client.auth.signInWithOAuth({
    provider: normalizedProvider,
    options: {
      redirectTo: appUrl("/?auth=callback"),
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Alamat login provider tidak terbentuk.");

  const destination = providerDestination(data.url);
  if (typeof window !== "undefined") {
    document.documentElement.dataset.authProviderV153 = normalizedProvider;
    window.location.assign(destination);
  }
  return { ...data, url: destination };
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
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("Masukkan email yang valid.");
  if (!String(password || "")) throw new Error("Masukkan password.");

  const { data, error } = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password: String(password || ""),
  });
  if (error) throw error;
  if (!data?.session?.access_token || !data?.session?.refresh_token) {
    throw new Error("Sesi login tidak terbentuk. Silakan coba kembali.");
  }
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

export { AUTH_RELEASE, AUTH_GATEWAY_PREFIX, authAwareFetch };
