import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { listUserSites } from "./lib/studio-data.js";

export const STUDIO_STARTUP_RELEASE_V292 = "studio-startup-direct-data-v292-20260805";
export const AUTH_SESSION_HANDOFF_RELEASE_V292 = "auth-session-handoff-v292-20260805";
export const STARTUP_DATA_RELEASE_V292 = "startup-membership-direct-first-v292-20260805";
export const STARTUP_SITE_UNION_RELEASE_V305 = "startup-membership-plus-owned-sites-v305-20260805";

const DIRECT_TIMEOUT_MS = 4_500;
const FALLBACK_TIMEOUT_MS = 5_500;
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
    if (event === "SIGNED_OUT") window.__ngebloggingVerifiedSession = null;
  });
  authSubscription = data?.subscription || null;
  return () => {};
}

function membershipSite(record) {
  if (!record?.sites) return null;
  return { ...record.sites, role: record.role };
}

function mergeSiteCollections(...collections) {
  const merged = new Map();
  collections.flat().filter(Boolean).forEach((site) => {
    if (!site?.id) return;
    const key = String(site.id);
    const current = merged.get(key) || {};
    const next = { ...current, ...site };
    if (String(current.role || "").toLowerCase() === "owner" || String(site.role || "").toLowerCase() === "owner") next.role = "owner";
    merged.set(key, next);
  });
  return [...merged.values()];
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

function responseError(response, label) {
  const error = new Error(`${label} gagal (${response.status}).`);
  error.status = response.status;
  error.code = response.status === 401
    ? "SESSION_REAUTH_REQUIRED"
    : response.status === 403
      ? "STARTUP_DATA_FORBIDDEN"
      : "STARTUP_DATA_DIRECT_FAILED";
  return error;
}

async function directMembership(userId) {
  const { url, key } = publicConfig();
  if (!url || !key || !supabaseConfigured || !supabase) throw new Error("Konfigurasi data Studio belum tersedia.");
  const session = await currentSessionForUser(userId);
  const siteFields = "id,name,slug,description,status,is_public,blueprint,theme_key,settings,published_at,created_at,updated_at";
  const membershipEndpoint = new URL(`${url}/rest/v1/site_members`);
  membershipEndpoint.searchParams.set("select", `site_id,role,joined_at,sites(${siteFields})`);
  membershipEndpoint.searchParams.set("user_id", `eq.${userId}`);
  membershipEndpoint.searchParams.set("order", "joined_at.asc");
  membershipEndpoint.searchParams.set("limit", "100");

  const ownedEndpoint = new URL(`${url}/rest/v1/sites`);
  ownedEndpoint.searchParams.set("select", siteFields);
  ownedEndpoint.searchParams.set("owner_id", `eq.${userId}`);
  ownedEndpoint.searchParams.set("order", "created_at.asc");
  ownedEndpoint.searchParams.set("limit", "100");

  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort("studio-startup-direct-timeout-v305"), DIRECT_TIMEOUT_MS);
  const headers = {
    accept: "application/json",
    apikey: key,
    authorization: `Bearer ${session.access_token}`,
    "cache-control": "no-cache",
    "x-client-info": "ngeblogging-startup-v305-site-union",
  };
  try {
    const [membershipResponse, ownedResponse] = await Promise.all([
      fetch(membershipEndpoint.toString(), { method: "GET", headers, cache: "no-store", signal: controller.signal }),
      fetch(ownedEndpoint.toString(), { method: "GET", headers, cache: "no-store", signal: controller.signal }),
    ]);
    if (!membershipResponse.ok) throw responseError(membershipResponse, "Pembacaan membership situs langsung");
    if (!ownedResponse.ok) throw responseError(ownedResponse, "Pembacaan situs milik akun langsung");

    const [membershipRows, ownedRows] = await Promise.all([membershipResponse.json(), ownedResponse.json()]);
    const membershipSites = (Array.isArray(membershipRows) ? membershipRows : []).map(membershipSite).filter(Boolean);
    const ownedSites = (Array.isArray(ownedRows) ? ownedRows : []).map((site) => ({ ...site, role: "owner" }));
    const result = mergeSiteCollections(membershipSites, ownedSites);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.studioStartupDataV292 = "direct-supabase-primary";
      document.documentElement.dataset.studioStartupReleaseV292 = STUDIO_STARTUP_RELEASE_V292;
      document.documentElement.dataset.studioStartupSiteUnionV305 = STARTUP_SITE_UNION_RELEASE_V305;
      document.documentElement.dataset.studioStartupSiteCountV305 = String(result.length);
    }
    return result;
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
    if (status === 401 || directError?.code === "SESSION_REAUTH_REQUIRED") throw directError;
    if (typeof document !== "undefined") document.documentElement.dataset.studioStartupDataV292 = "gateway-client-fallback";
    return deadline(
      listUserSites(userId),
      FALLBACK_TIMEOUT_MS,
      "Jalur data cadangan Studio melewati batas waktu.",
    );
  }
}

if (typeof window !== "undefined") installAuthSessionHandoffV292();