import { createClient } from "@supabase/supabase-js";
import { createAppUrl } from "./site-url.js";

const browserEnv = import.meta.env || {};
const url = browserEnv.VITE_SUPABASE_URL;
const key =
  browserEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  browserEnv.VITE_SUPABASE_ANON_KEY;
const nativeFetch = typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null;
const AUTH_GATEWAY_RELEASE = "login-data-gateway-v140-20260729";
const DATA_GATEWAY_RELEASE = "login-data-gateway-v140-20260729";
const DEFAULT_API_ORIGIN = "https://ngeblogging.triapriyogibahari7.workers.dev";
const AUTH_DIRECT_TIMEOUT_MS = 8_000;
const GATEWAY_TIMEOUT_MS = 6_500;
const DATA_DIRECT_TIMEOUT_MS = 10_000;

function ngebloggingOrigin() {
  if (typeof window === "undefined") return "";
  const hostname = window.location.hostname.toLowerCase();
  if (hostname === "ngeblogging.com" || hostname.endsWith(".ngeblogging.com")) {
    return window.location.origin;
  }
  return "";
}

function configuredApiOrigin() {
  if (typeof window === "undefined") return "";
  const metaOrigin = document.querySelector('meta[name="ngeblogging-api-origin"]')?.getAttribute("content") || "";
  const candidate = String(
    browserEnv.VITE_NGEBLOGGING_API_ORIGIN
    || browserEnv.VITE_API_ORIGIN
    || metaOrigin
    || DEFAULT_API_ORIGIN,
  ).trim().replace(/\/$/, "");
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" ? parsed.origin : "";
  } catch {
    return "";
  }
}

function gatewayOrigins() {
  const values = [ngebloggingOrigin(), configuredApiOrigin()].filter(Boolean);
  return [...new Set(values)];
}

function supabaseTarget(value) {
  try {
    const target = new URL(value instanceof Request ? value.url : String(value));
    const project = new URL(String(url || ""));
    if (target.origin !== project.origin) return null;
    if (target.pathname.startsWith("/auth/v1/")) {
      return {
        target,
        service: "auth",
        gatewayPrefix: "/api/auth-proxy",
        release: AUTH_GATEWAY_RELEASE,
        marker: "x-ngeblogging-auth-gateway",
      };
    }
    if (target.pathname.startsWith("/rest/v1/") || target.pathname.startsWith("/storage/v1/")) {
      return {
        target,
        service: "data",
        gatewayPrefix: "/api/data-proxy",
        release: DATA_GATEWAY_RELEASE,
        marker: "x-ngeblogging-data-gateway",
      };
    }
    return null;
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

function timeoutReason(label, milliseconds) {
  const message = `${label} tidak merespons dalam ${Math.round(milliseconds / 1000)} detik.`;
  try {
    return new DOMException(message, "TimeoutError");
  } catch {
    return Object.assign(new Error(message), { name: "TimeoutError" });
  }
}

async function timedNativeFetch(request, milliseconds, label) {
  const controller = new AbortController();
  const sourceSignal = request.signal;
  const relayAbort = () => controller.abort(sourceSignal?.reason);
  if (sourceSignal?.aborted) relayAbort();
  else sourceSignal?.addEventListener("abort", relayAbort, { once: true });
  const timer = globalThis.setTimeout(
    () => controller.abort(timeoutReason(label, milliseconds)),
    milliseconds,
  );
  try {
    return await nativeFetch(new Request(request, {
      signal: controller.signal,
      cache: "no-store",
    }));
  } finally {
    globalThis.clearTimeout(timer);
    sourceSignal?.removeEventListener("abort", relayAbort);
  }
}

function markTransport(service, value) {
  if (typeof document === "undefined") return;
  if (service === "auth") document.documentElement.dataset.authTransportV140 = value;
  else document.documentElement.dataset.dataTransportV140 = value;
}

function rememberGatewayError(service, error) {
  if (typeof window === "undefined") return;
  if (service === "auth") window.__ngebloggingAuthGatewayErrorV140 = error;
  else window.__ngebloggingDataGatewayErrorV140 = error;
}

function networkUnavailableError(service, cause, release) {
  const dataService = service === "data";
  const error = new Error(dataService
    ? "Data Studio belum dapat dijangkau. Sesi akun tetap tersimpan; coba kembali saat jaringan stabil."
    : "Layanan login belum dapat dijangkau. Sesi yang sudah tersimpan tetap dipertahankan; coba kembali saat jaringan stabil.");
  error.name = dataService ? "DataTransportError" : "AuthTransportError";
  error.code = dataService ? "DATA_NETWORK_UNAVAILABLE" : "AUTH_NETWORK_UNAVAILABLE";
  error.cause = cause;
  error.gatewayRelease = release;
  return error;
}

function gatewayResponseAccepted(response, descriptor) {
  if (!(response instanceof Response)) return false;
  const marker = response.headers.get(descriptor.marker) || "";
  if (!marker) return false;
  return ![502, 503, 504].includes(response.status);
}

function gatewayMismatchError(response, descriptor, gatewayUrl) {
  const contentType = response?.headers?.get("content-type") || "";
  const error = new Error(
    `Jalur ${descriptor.service} tidak mengembalikan respons gateway Ngeblogging yang sah.`,
  );
  error.name = "GatewayResponseMismatchError";
  error.code = "GATEWAY_RESPONSE_MISMATCH";
  error.status = Number(response?.status || 0);
  error.contentType = contentType;
  error.gatewayUrl = gatewayUrl;
  return error;
}

async function tryGateways(source, descriptor) {
  let lastError = null;
  for (const origin of gatewayOrigins()) {
    const gateway = new URL(`${descriptor.gatewayPrefix}${descriptor.target.pathname}${descriptor.target.search}`, origin);
    try {
      const request = await copyRequest(source.clone(), undefined, gateway.href);
      const response = await timedNativeFetch(
        request,
        GATEWAY_TIMEOUT_MS,
        `${descriptor.service === "auth" ? "Gateway login" : "Gateway data"} Ngeblogging`,
      );
      if (gatewayResponseAccepted(response, descriptor)) {
        markTransport(descriptor.service, origin === window.location.origin ? "same-origin-gateway" : "api-worker-gateway");
        return { response, lastError: null };
      }
      lastError = gatewayMismatchError(response, descriptor, gateway.href);
      rememberGatewayError(descriptor.service, lastError);
    } catch (gatewayError) {
      lastError = gatewayError;
      rememberGatewayError(descriptor.service, gatewayError);
    }
  }
  return { response: null, lastError };
}

async function resilientSupabaseFetch(input, init) {
  if (!nativeFetch) throw new Error("Fetch API tidak tersedia pada perangkat ini.");
  const source = await copyRequest(input, init);
  const descriptor = supabaseTarget(source);
  if (!descriptor || typeof window === "undefined") return nativeFetch(source);

  let lastError = null;

  // Authentication must never wait for the Ngeblogging domain API. Supabase is
  // the source of truth, so use its HTTPS endpoint first with a strict deadline.
  if (descriptor.service === "auth") {
    try {
      const response = await timedNativeFetch(
        source.clone(),
        AUTH_DIRECT_TIMEOUT_MS,
        "Layanan login Supabase",
      );
      markTransport("auth", "direct-primary");
      return response;
    } catch (directError) {
      lastError = directError;
      rememberGatewayError("auth", directError);
    }

    const gatewayResult = await tryGateways(source, descriptor);
    if (gatewayResult.response) return gatewayResult.response;
    throw networkUnavailableError("auth", gatewayResult.lastError || lastError, descriptor.release);
  }

  const gatewayResult = await tryGateways(source, descriptor);
  if (gatewayResult.response) return gatewayResult.response;
  lastError = gatewayResult.lastError;

  try {
    const response = await timedNativeFetch(
      source.clone(),
      DATA_DIRECT_TIMEOUT_MS,
      "Layanan data Supabase",
    );
    markTransport("data", "direct-fallback");
    return response;
  } catch (directError) {
    throw networkUnavailableError("data", directError || lastError, descriptor.release);
  }
}

export const supabaseConfigured = Boolean(url && key);
export const supabase = supabaseConfigured
  ? createClient(url, key, {
      global: {
        fetch: resilientSupabaseFetch,
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
