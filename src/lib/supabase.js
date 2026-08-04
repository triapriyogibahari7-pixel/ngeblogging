import { createClient } from "@supabase/supabase-js";
import { createAppUrl } from "./site-url.js";

const AUTH_RELEASE = "auth-resilience-v190-20260801";
const AUTH_LEGACY_RELEASE = "auth-production-v153-20260730";
const AUTH_PRODUCTION_READINESS_V245 = "auth-production-readiness-v245-20260803";
const AUTH_NETWORK_RELEASE_V256 = "auth-network-fallback-v256-20260804";
const AUTH_GATEWAY_PREFIX = "/api/auth-proxy";
const DATA_GATEWAY_PREFIX = "/api/data-proxy";
const DATA_TRANSPORT_RELEASE_V190 = "studio-data-gateway-v256-20260804";
const DATA_GATEWAY_PATHS_V190 = ["/rest/v1/", "/storage/v1/"];
const OAUTH_PROVIDERS = new Set(["google", "github", "linkedin_oidc"]);
const GATEWAY_FALLBACK_STATUSES = new Set([404, 502, 503, 504]);
const AUTH_GATEWAY_DEADLINE_MS = 8_000;
/* Historical build-patch compatibility markers. v190 implements these behaviors
   natively, so v186 must not replace the transport during production builds. */
const AUTH_V186_COMPAT = "direct-fallback-v186 direct-supabase-oauth-v186";
const browserEnv = import.meta.env || {};

// Public browser client configuration only. Explicit VITE_* values are preferred.
// The official-host fallback prevents production login buttons from becoming disabled
// if a deployment path forgets to expose Vite variables. No privileged key is embedded.
const PRODUCTION_SUPABASE_URL_V245 = "https://polvmlrhqoiflumibfqs.supabase.co";
const PRODUCTION_SUPABASE_PUBLISHABLE_KEY_V245 = "sb_publishable_Jqz6qDzX4IKSunPoDT5zyQ_sk6EK4W-";

function productionClientHostV245() {
  if (typeof window === "undefined") return false;
  const hostname = String(window.location?.hostname || "").toLowerCase();
  return hostname === "ngeblogging.com"
    || hostname === "www.ngeblogging.com"
    || hostname.endsWith(".ngeblogging.com");
}

const configuredUrlV245 = String(browserEnv.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
const configuredKeyV245 = String(
  browserEnv.VITE_SUPABASE_PUBLISHABLE_KEY
  || browserEnv.VITE_SUPABASE_ANON_KEY
  || "",
).trim();
const productionFallbackAllowedV245 = productionClientHostV245();
const url = configuredUrlV245 || (productionFallbackAllowedV245 ? PRODUCTION_SUPABASE_URL_V245 : "");
const key = configuredKeyV245 || (productionFallbackAllowedV245 ? PRODUCTION_SUPABASE_PUBLISHABLE_KEY_V245 : "");
const authConfigSourceV245 = configuredUrlV245 && configuredKeyV245
  ? "vite-env"
  : url && key && productionFallbackAllowedV245
    ? "production-public-fallback"
    : "missing";

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

function requestUrlV190(value) {
  try {
    return new URL(
      value instanceof Request ? value.url : String(value),
      typeof window === "undefined" ? undefined : window.location.origin,
    );
  } catch {
    return null;
  }
}

function proxiedAuthUrl(value) {
  if (!gatewayHost() || typeof window === "undefined") return null;
  const target = requestUrlV190(value);
  if (!target || target.origin !== supabaseOrigin() || !target.pathname.startsWith("/auth/v1/")) return null;
  return new URL(`${AUTH_GATEWAY_PREFIX}${target.pathname}${target.search}`, window.location.origin);
}

function proxiedDataUrlV190(value) {
  if (!gatewayHost() || typeof window === "undefined") return null;
  const target = requestUrlV190(value);
  if (!target || target.origin !== supabaseOrigin()) return null;
  if (!DATA_GATEWAY_PATHS_V190.some((prefix) => target.pathname.startsWith(prefix))) return null;
  return new URL(`${DATA_GATEWAY_PREFIX}${target.pathname}${target.search}`, window.location.origin);
}

function proxyRequestV190(input, target) {
  return input instanceof Request ? new Request(target.toString(), input.clone()) : target.toString();
}

function directRequestV190(input) {
  return input instanceof Request ? input.clone() : input;
}

function gatewayResponseHasAuthority(response, kind) {
  if (!response) return false;
  return Boolean(response.headers.get(kind === "auth"
    ? "x-ngeblogging-auth-gateway"
    : "x-ngeblogging-data-gateway"));
}

function shouldFallbackGateway(response, kind) {
  if (!response) return true;
  if (GATEWAY_FALLBACK_STATUSES.has(response.status) || response.status >= 500) return true;
  // A 2xx/4xx response without the gateway authority header can be a stale HTML
  // shell or proxy mismatch, not a Supabase result. Do not trust it as auth/data.
  if (!gatewayResponseHasAuthority(response, kind)) return true;
  return false;
}

async function fetchAuthGatewayWithDeadline(input, init) {
  let timer = 0;
  return Promise.race([
    nativeFetch(input, init),
    new Promise((_, reject) => {
      timer = globalThis.setTimeout(() => reject(Object.assign(
        new Error("Gateway autentikasi melewati batas waktu; mencoba jalur langsung."),
        { name: "AuthTransportError", code: "AUTH_GATEWAY_TIMEOUT" },
      )), AUTH_GATEWAY_DEADLINE_MS);
    }),
  ]).finally(() => globalThis.clearTimeout(timer));
}

async function gatewayFirstV190(input, init, proxy, kind) {
  const directInput = directRequestV190(input);
  try {
    const proxyInput = proxyRequestV190(input, proxy);
    const response = kind === "auth"
      ? await fetchAuthGatewayWithDeadline(proxyInput, init)
      : await nativeFetch(proxyInput, init);
    if (!shouldFallbackGateway(response, kind)) {
      if (typeof document !== "undefined") {
        if (kind === "auth") document.documentElement.dataset.authTransportV190 = "same-origin-gateway";
        else document.documentElement.dataset.dataTransportV190 = "same-origin-data-gateway";
      }
      return response;
    }
    console.warn(`Gateway ${kind} tidak memberi respons authority yang sehat (${response.status}); mencoba Supabase langsung.`);
  } catch (error) {
    console.warn(`Gateway ${kind} tidak terjangkau; mencoba Supabase langsung.`, error);
  }
  if (typeof document !== "undefined") {
    if (kind === "auth") document.documentElement.dataset.authTransportV190 = "direct-supabase-fallback";
    else document.documentElement.dataset.dataTransportV190 = "direct-supabase-fallback";
  }
  return nativeFetch(directInput, init);
}

async function authAwareFetch(input, init) {
  if (!nativeFetch) throw new Error("Fetch API tidak tersedia pada browser ini.");
  const dataProxyV190 = proxiedDataUrlV190(input);
  if (dataProxyV190) return gatewayFirstV190(input, init, dataProxyV190, "data");
  const authProxyV190 = proxiedAuthUrl(input);
  if (authProxyV190) return gatewayFirstV190(input, init, authProxyV190, "auth");
  return nativeFetch(input, init);
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
          "x-client-info": "ngeblogging-web-v256",
        },
      },
    })
  : null;

if (typeof document !== "undefined") {
  document.documentElement.dataset.authProductionReadinessV245 = AUTH_PRODUCTION_READINESS_V245;
  document.documentElement.dataset.supabaseConfigSourceV245 = authConfigSourceV245;
  document.documentElement.dataset.supabaseTransport = supabaseConfigured ? "auth-data-resilience-v256" : "not-configured";
  document.documentElement.dataset.authProductionRelease = AUTH_RELEASE;
  document.documentElement.dataset.authNetworkReleaseV256 = AUTH_NETWORK_RELEASE_V256;
  document.documentElement.dataset.authLegacyRelease = AUTH_LEGACY_RELEASE;
  document.documentElement.dataset.dataTransportReleaseV190 = DATA_TRANSPORT_RELEASE_V190;
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
  if (typeof document !== "undefined") {
    document.documentElement.dataset.authProviderTransportV189 = "direct-supabase-oauth";
    document.documentElement.dataset.authProviderTransportV190 = "direct-supabase-oauth";
  }
  return direct.toString();
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
    document.documentElement.dataset.authProviderV189 = normalizedProvider;
    document.documentElement.dataset.authProviderV190 = normalizedProvider;
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

function requestedAuthMode() {
  if (typeof window === "undefined") return "";
  const current = new URL(window.location.href);
  const path = current.pathname.replace(/\/+$/, "") || "/";
  const routeMode = path === "/signup" ? "signup" : ["/login", "/signin"].includes(path) ? "signin" : "";
  const queryMode = current.searchParams.get("auth") || "";
  const mode = routeMode || (["signin", "signup", "session-expired", "callback-error"].includes(queryMode) ? (queryMode === "signup" ? "signup" : "signin") : "");
  if (routeMode) {
    current.pathname = "/";
    current.searchParams.set("auth", routeMode);
    window.history.replaceState(window.history.state, "", `${current.pathname}${current.search}${current.hash}`);
  }
  return mode;
}

function installAuthEntryBridge() {
  if (typeof document === "undefined") return;
  const requested = requestedAuthMode();
  if (!requested) return;
  document.documentElement.dataset.authEntryV189 = requested;
  document.documentElement.dataset.authEntryV190 = requested;
  let opened = false;
  let switched = false;
  let observer;
  const started = Date.now();

  const scan = () => {
    const modal = document.querySelector(".auth-modal");
    if (!modal && !opened) {
      const trigger = document.querySelector("button.nav-cta,.actions button.primary,.future button.primary");
      if (trigger) {
        opened = true;
        trigger.click();
      }
    }

    if (modal) {
      const heading = modal.querySelector("h2")?.textContent || "";
      const signupVisible = /Buat akun/i.test(heading);
      if (requested === "signup" && !signupVisible && !switched) {
        const button = [...modal.querySelectorAll(".auth-switch button")].find((node) => /Daftar/i.test(node.textContent || ""));
        if (button) { switched = true; button.click(); }
      } else if (requested === "signin" && signupVisible && !switched) {
        const button = [...modal.querySelectorAll(".auth-switch button")].find((node) => /Masuk/i.test(node.textContent || ""));
        if (button) { switched = true; button.click(); }
      } else if ((requested === "signup" && signupVisible) || (requested === "signin" && !signupVisible)) {
        observer?.disconnect();
      }
    }

    if (Date.now() - started > 12_000) observer?.disconnect();
  };

  observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan, { once: true });
  else scan();
}

installAuthEntryBridge();

export {
  AUTH_RELEASE,
  AUTH_LEGACY_RELEASE,
  AUTH_PRODUCTION_READINESS_V245,
  AUTH_NETWORK_RELEASE_V256,
  AUTH_GATEWAY_PREFIX,
  DATA_GATEWAY_PREFIX,
  DATA_TRANSPORT_RELEASE_V190,
  AUTH_V186_COMPAT,
  PRODUCTION_SUPABASE_URL_V245,
  PRODUCTION_SUPABASE_PUBLISHABLE_KEY_V245,
  authAwareFetch,
  installAuthEntryBridge,
};
