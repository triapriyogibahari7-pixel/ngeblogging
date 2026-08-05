import "./studio-production-v206.css";
import { supabase } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY, setActiveSiteId } from "./lib/studio-data.js";

const RELEASE = "studio-auth-recovery-v287-20260805";
const SNAPSHOT_KEYS = ["ngeblogging-active-site-snapshot-v195", "ngeblogging-active-site-snapshot-v192"];
let recoveryPromise = null;
let recoveryAttempts = 0;
let recoveredMembership = null;
let bootTimer = 0;

function mobileLike() {
  const mode = document.documentElement.dataset.studioDeviceMode || document.querySelector(".sn-shell")?.dataset.deviceMode;
  return mode === "small";
}

async function getPersistedSession() {
  const known = window.__ngebloggingVerifiedSession;
  const knownSession = known?.session || (known?.access_token ? known : null);
  if (knownSession?.access_token && knownSession?.user?.id) return { session: knownSession, user: knownSession.user };
  if (!supabase?.auth) return null;

  const timeout = new Promise((_, reject) => window.setTimeout(() => reject(new Error("SESSION_LOCAL_TIMEOUT_V287")), 3500));
  const result = await Promise.race([supabase.auth.getSession(), timeout]);
  if (result?.error) throw result.error;
  const session = result?.data?.session;
  if (!session?.access_token || !session?.user?.id) return null;
  window.__ngebloggingVerifiedSession = { session, user: session.user, verification: "persisted-session-v287" };
  return { session, user: session.user };
}

async function fetchMembershipDirect(userId, accessToken) {
  const env = import.meta.env || {};
  const base = String(env.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "").trim();
  if (!base || !key) throw new Error("SUPABASE_DIRECT_NOT_CONFIGURED_V287");

  const url = new URL(`${base}/rest/v1/site_members`);
  url.searchParams.set("select", "site_id,role,joined_at,sites(id,name,slug,description,status,is_public,blueprint,theme_key,settings,published_at,created_at,updated_at)");
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("order", "joined_at.asc");
  url.searchParams.set("limit", "100");

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      signal: controller.signal,
      headers: { apikey: key, Authorization: `Bearer ${accessToken}`, Accept: "application/json", "x-client-info": "ngeblogging-studio-auth-v287" },
    });
    if (!response.ok) throw Object.assign(new Error(`MEMBERSHIP_HTTP_${response.status}`), { status: response.status });
    const rows = await response.json();
    return (Array.isArray(rows) ? rows : []).map((record) => {
      const site = Array.isArray(record?.sites) ? record.sites[0] : record?.sites;
      return site ? { ...site, role: record.role } : null;
    }).filter(Boolean);
  } finally {
    window.clearTimeout(timer);
  }
}

function chooseSite(sites) {
  let preferred = "";
  try { preferred = localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; } catch { preferred = ""; }
  return sites.find((site) => site.id === preferred) || sites[0] || null;
}

function rememberSite(site, userId) {
  if (!site?.id || !site?.slug || !userId) return;
  for (const key of SNAPSHOT_KEYS) {
    try { localStorage.setItem(key, JSON.stringify({ ...site, __userId: userId, __release: RELEASE, __savedAt: Date.now() })); } catch { /* storage optional */ }
  }
  setActiveSiteId(site.id);
  window.__ngebloggingActiveSite = site;
  document.documentElement.dataset.activeSiteId = site.id;
  document.documentElement.dataset.activeSiteSlug = site.slug;
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-ready", { detail: site }));
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-change", { detail: site }));
}

function recoverMembership() {
  if (recoveryPromise) return recoveryPromise;
  recoveryAttempts += 1;
  recoveryPromise = (async () => {
    const auth = await getPersistedSession();
    if (!auth) return null;
    const sites = await fetchMembershipDirect(auth.user.id, auth.session.access_token);
    const site = chooseSite(sites);
    if (site) rememberSite(site, auth.user.id);
    recoveredMembership = { sites, site, userId: auth.user.id };
    document.documentElement.dataset.studioRecoveryV206 = site ? "real-site-v287" : "real-empty-membership-v287";
    return recoveredMembership;
  })().catch((error) => {
    document.documentElement.dataset.studioRecoveryV206 = navigator.onLine === false ? "offline-session-retained-v287" : "failed-v287";
    console.warn("Studio membership recovery v287 belum berhasil", error);
    throw error;
  }).finally(() => { recoveryPromise = null; });
  return recoveryPromise;
}

function clickRetryOnce(retry) {
  if (!retry || retry.dataset.v287RecoveryClicked === "true") return;
  retry.dataset.v287RecoveryClicked = "true";
  retry.disabled = false;
  retry.click();
}

function normalizeStartup() {
  const startup = document.querySelector(".so75-startup");
  if (!startup || navigator.onLine === false) return;
  startup.dataset.v206Startup = "real-membership-recovery-v287";
  const retry = startup.querySelector("section > button.so75-primary,section > button");
  if (recoveredMembership) {
    clickRetryOnce(retry);
    return;
  }
  if (recoveryPromise || recoveryAttempts >= 2) return;

  recoverMembership().then((result) => {
    if (result?.site) clickRetryOnce(document.querySelector(".so75-startup section > button.so75-primary,.so75-startup section > button"));
    else if (retry) retry.disabled = false;
  }).catch(() => {
    if (retry) retry.disabled = false;
  });
}

/* Compatibility exports retained; v287 no longer lets this file mutate shell/theme/Nara. */
function normalizeTheme() { return true; }
function normalizeDrawer() { return true; }
function normalizeNara() { return true; }

function sync() {
  document.documentElement.dataset.studioProductionV206 = RELEASE;
  document.documentElement.dataset.studioMobileV206 = String(mobileLike());
  normalizeStartup();
}

function schedule(delay = 0) {
  if (bootTimer) window.clearTimeout(bootTimer);
  bootTimer = window.setTimeout(() => {
    bootTimer = 0;
    sync();
  }, delay);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("pageshow", () => schedule(80), { passive: true });
  window.addEventListener("online", () => schedule(180), { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(120); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => schedule(80), { once: true });
  else schedule(80);
}

export { RELEASE, mobileLike, normalizeTheme, normalizeDrawer, normalizeNara, normalizeStartup, recoverMembership, fetchMembershipDirect, sync };
