import { createClient } from "@supabase/supabase-js";
import { createAppUrl } from "./site-url.js";

const browserEnv = import.meta.env || {};
const url = browserEnv.VITE_SUPABASE_URL;
const key =
  browserEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  browserEnv.VITE_SUPABASE_ANON_KEY;
const nativeFetch = typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null;
const AUTH_GATEWAY_RELEASE = "same-origin-auth-gateway-v108-20260728";

function ngebloggingOrigin() {
  if (typeof window === "undefined") return "";
  const hostname = window.location.hostname.toLowerCase();
  if (hostname === "ngeblogging.com" || hostname.endsWith(".ngeblogging.com")) {
    return window.location.origin;
  }
  return "";
}

function authTarget(value) {
  try {
    const target = new URL(value instanceof Request ? value.url : String(value));
    const project = new URL(String(url || ""));
    return target.origin === project.origin && target.pathname.startsWith("/auth/v1/") ? target : null;
  } catch {
    return null;
  }
}

async function copyRequest(input, init, nextUrl = "") {
  const source = input instanceof Request ? new Request(input, init) : new Request(input, init);
  if (!nextUrl) return source;
  const headers = new Headers(source.headers);
  const hasBody = !["GET", "HEAD"].includes(source.method);
  const body = hasBody ? await source.clone().arrayBuffer() : undefined;
  return new Request(nextUrl, {
    method: source.method,
    headers,
    body,
    cache: "no-store",
    credentials: "same-origin",
    redirect: "follow",
    signal: source.signal,
  });
}

async function resilientAuthFetch(input, init) {
  if (!nativeFetch) throw new Error("Fetch API tidak tersedia pada perangkat ini.");
  const source = await copyRequest(input, init);
  const target = authTarget(source);
  const origin = ngebloggingOrigin();
  if (!target || !origin) return nativeFetch(source);

  const gateway = new URL(`/api/auth-proxy${target.pathname}${target.search}`, origin);
  try {
    const response = await nativeFetch(await copyRequest(source.clone(), undefined, gateway.href));
    if (![502, 503, 504].includes(response.status)) {
      if (typeof document !== "undefined") {
        document.documentElement.dataset.authTransportV108 = "same-origin";
      }
      return response;
    }
  } catch (gatewayError) {
    if (typeof window !== "undefined") window.__ngebloggingAuthGatewayErrorV108 = gatewayError;
  }

  try {
    const response = await nativeFetch(source.clone());
    if (typeof document !== "undefined") {
      document.documentElement.dataset.authTransportV108 = "direct-fallback";
    }
    return response;
  } catch (directError) {
    const error = new Error("Layanan login belum dapat dijangkau. Sesi yang sudah tersimpan tetap dipertahankan; coba kembali saat jaringan stabil.");
    error.name = "AuthTransportError";
    error.code = "AUTH_NETWORK_UNAVAILABLE";
    error.cause = directError;
    error.gatewayRelease = AUTH_GATEWAY_RELEASE;
    throw error;
  }
}

export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured
  ? createClient(url, key, {
      global: {
        fetch: resilientAuthFetch,
      },
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

const configuredSiteUrl = browserEnv.VITE_PUBLIC_SITE_URL;
const currentOrigin = typeof window === "undefined" ? "" : window.location.origin;
const appUrl = (path = "/") => createAppUrl(path, configuredSiteUrl, currentOrigin);

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
    email: String(email || "").trim().toLowerCase(),
    options: {
      emailRedirectTo: appUrl("/?auth=callback"),
      shouldCreateUser: false,
    },
  });
  if (error) throw error;
}

export async function signInWithPassword(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: String(email || "").trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(email, password, fullName) {
  const client = requireSupabase();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const { data, error } = await client.auth.signUp({
    email: normalizedEmail,
    password,
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
  const normalizedEmail = String(email || "").trim().toLowerCase();
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
  const { error } = await client.auth.resetPasswordForEmail(
    String(email || "").trim().toLowerCase(),
    { redirectTo: appUrl("/?auth=recovery") },
  );
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
