import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { listUserSites } from "./lib/studio-data.js";

export const STUDIO_STARTUP_RELEASE_V292 = "studio-startup-direct-data-v292-20260805";
export const AUTH_SESSION_HANDOFF_RELEASE_V292 = "auth-session-handoff-v292-20260805";
export const STARTUP_DATA_RELEASE_V292 = "startup-membership-direct-first-v292-20260805";

const DIRECT_TIMEOUT_MS = 6_500;
const FALLBACK_TIMEOUT_MS = 7_500;
const browserEnv = import.meta.env || {};
const PRODUCTION_SUPABASE_URL = "https://polvmlrhqoiflumibfqs.supabase.co";
const PRODUCTION_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Jqz6qDzX4IKSunPoDT5zyQ_sk6EK4W-";
let authSubscription = null;

function productionHost() {
  if (typeof window === "undefined") return false;
  const hostname = String(window.location?.hostname || "").toLowerCase();
  return hostname === "ngeblogging.com"
    || hostname === "www.ngeblogging.com"
    || hostname.endsWith(".ngeblogging.com");
}

function publicConfig() {
  const configuredUrl = String(browserEnv.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const configuredKey = String(browserEnv.VITE_SUPABASE_PUBLISHABLE_KEY || browserEnv.VITE_SUPABASE_ANON_KEY || "").trim();
  const allowFallback = productionHost();
  return {
    url: configuredUrl || (allowFallback ? PRODUCTION_SUPABASE_URL : ""),
    key: configuredKey || (allowFallback ? PRODUCTION_SUPABASE_PUBLISHABLE_KEY : ""),
  };
}

function deadline(promise, milliseconds, message) {
  let timer = 0;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = globalThis.setTimeout(() => {
        const error = new Error(message);
        error.name = "TimeoutError";
        error.code = "STUDIO_STARTUP_TIMEOUT";
        reject(error);
      }, milliseconds);
    }),
  ]).finally(() => globalThis.clearTimeout(timer));
}

function usableSession(session) {
  return Boolean(session?.access_token && session?.refresh_token && session?.user?.id);
}

export function publishVerifiedSessionV292(session, source = "auth-state") {
  if (!usableSession(session) || typeof window === "undefined") return null;
  const verified = {
    session,
    user: session.user,
    verification: AUTH_SESSION_HANDOFF_RELEASE_V292,
    source,
    handedOffAt: Date.now(),
  };
  window.__ngebloggingVerifiedSession = verified;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.authSessionHandoffV292 = AUTH_SESSION_HANDOFF_RELEASE_V292;
    document.documentElement.dataset.authSessionHandoffSourceV292 = source;
  }
  window.dispatchEvent(new CustomEvent("ngeblogging:auth-session-ready", {
    detail: {
      release: AUTH_SESSION_HANDOFF_RELEASE_V292,
      source,
      userId: session.user.id,
    },
  }));
  return verified;
}

export function installAuthSessionHandoffV292() {
  if (!supabaseConfigured || !supabase?.auth || typeof window === "undefined") return () => {};
  if (authSubscription) return () => {};

  supabase.auth.getSession().then(({ data, error }) => {
    if (!error && usableSession(data?.session)) publishVerifiedSessionV292(data.session, "initial-session");
  }).catch(() => {});

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (["SIGNED_IN", "TOKEN_REFRESHED", "INITIAL_SESSION", "USER_UPDATED"].includes(event) && usableSession(session)) {
      publishVerifiedSessionV292(session, event.toLowerCase());
    }
    if (event === "SIGNED_OUT") {
      window.__ngebloggingVerifiedSession = null;
    }
  });
  authSubscription = data?.subscription || null;
  return () => {};
}

function membershipSite(record) {
  if (!record?.sites) return null;
  return { ...record.sites, role: record.role };
}

async function currentSessionForUser(userId) {
  const handed = window.__ngebloggingVerifiedSession;
  if (handed?.user?.id === userId && usableSession(handed.session)) return handed.session;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!usableSession(data?.session) || data.session.user.id !== userId) {
    const missing = new Error("Sesi pengguna belum tersedia untuk membaca situs.");
    missing.code = "SESSION_REAUTH_REQUIRED";
    missing.status = 401;
    throw missing;
  }
  publishVerifiedSessionV292(data.session, "startup-get-session");
  return data.session;
}

async function directMembership(userId) {
  const { url, key } = publicConfig();
  if (!url || !key || !supabaseConfigured || !supabase) throw new Error("Konfigurasi data Studio belum tersedia.");
  const session = await currentSessionForUser(userId);
  const select = "site_id,role,joined_at,sites(id,name,slug,description,status,is_public,blueprint,theme_key,settings,published_at,created_at,updated_at)";
  const endpoint = new URL(`${url}/rest/v1/site_members`);
  endpoint.searchParams.set("select", select);
  endpoint.searchParams.set("user_id", `eq.${userId}`);
  endpoint.searchParams.set("order", "joined_at.asc");
  endpoint.searchParams.set("limit", "100");

  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort("studio-startup-direct-timeout-v292"), DIRECT_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        apikey: key,
        authorization: `Bearer ${session.access_token}`,
        "cache-control": "no-cache",
        "x-client-info": "ngeblogging-startup-v292",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = new Error(`Pembacaan situs langsung gagal (${response.status}).`);
      error.status = response.status;
      error.code = response.status === 401 || response.status === 403 ? "SESSION_REAUTH_REQUIRED" : "STARTUP_DATA_DIRECT_FAILED";
      throw error;
    }
    const rows = await response.json();
    if (typeof document !== "undefined") {
      document.documentElement.dataset.studioStartupDataV292 = "direct-supabase-primary";
      document.documentElement.dataset.studioStartupReleaseV292 = STUDIO_STARTUP_RELEASE_V292;
    }
    return (Array.isArray(rows) ? rows : []).map(membershipSite).filter(Boolean);
  } finally {
    globalThis.clearTimeout(timer);
  }
}

export async function listUserSitesStartupV292(userId) {
  if (!userId) throw new Error("Akun pengguna tidak ditemukan.");
  try {
    return await directMembership(userId);
  } catch (directError) {
    const status = Number(directError?.status || 0);
    if (status === 401 || status === 403 || directError?.code === "SESSION_REAUTH_REQUIRED") throw directError;
    if (typeof document !== "undefined") document.documentElement.dataset.studioStartupDataV292 = "gateway-client-fallback";
    return deadline(
      listUserSites(userId),
      FALLBACK_TIMEOUT_MS,
      "Jalur data cadangan Studio melewati batas waktu.",
    );
  }
}

if (typeof window !== "undefined") installAuthSessionHandoffV292();
