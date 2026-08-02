import "./studio-production-v206.css";
import { supabase } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY, setActiveSiteId } from "./lib/studio-data.js";

const RELEASE = "studio-production-v206-20260802";
const MOBILE_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
const SNAPSHOT_KEYS = ["ngeblogging-active-site-snapshot-v195", "ngeblogging-active-site-snapshot-v192"];
let frame = 0;
let recoveryPromise = null;
let recoveryAttempts = 0;
let recoveredMembership = null;

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function shortPhysicalEdge() {
  try {
    const candidates = [screen?.width, screen?.height, visualViewport?.width, visualViewport?.height]
      .map(Number).filter((value) => Number.isFinite(value) && value > 0);
    return candidates.length ? Math.min(...candidates) : 0;
  } catch { return 0; }
}

function mobileLike() {
  const root = document.documentElement;
  const family = root.dataset.studioResponsiveMode || root.dataset.studioResponsiveFamilyV193 || "";
  return root.dataset.studioMobileV205 === "true"
    || root.dataset.studioPhysicalMobileV193 === "true"
    || root.dataset.studioDesktopSitePhone === "true"
    || MOBILE_FAMILIES.has(family)
    || navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")
    || (shortPhysicalEdge() > 0 && shortPhysicalEdge() <= 760)
    || window.innerWidth <= 760;
}

function normalizeTheme() {
  const hero = document.querySelector(".tn-studio .tn-hero-actions");
  if (!hero) return;
  const layout = hero.querySelector('[data-v206-theme-action="layout"],[data-v202-theme-action="layout"],[data-v205-hotfix-theme-action="layout"]');
  const code = hero.querySelector('[data-v206-theme-action="code"],[data-v205-hotfix-theme-action="code"],[data-v205-theme-action="code"]');
  if (layout) {
    layout.dataset.v206ThemeAction = "layout";
    layout.hidden = false;
    layout.disabled = false;
    layout.removeAttribute("inert");
    layout.removeAttribute("aria-hidden");
    layout.setAttribute("aria-label", "Edit Tata Letak");
    setImportant(layout, "pointer-events", "auto");
  }
  if (code) {
    code.dataset.v206ThemeAction = "code";
    code.hidden = false;
    code.disabled = false;
    code.removeAttribute("inert");
    code.removeAttribute("aria-hidden");
    code.setAttribute("aria-label", "Edit Kode HTML CSS JavaScript");
    setImportant(code, "pointer-events", "auto");
  }
}

function normalizeDrawer() {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const toggle = document.querySelector(".sn-sidebar-toggle");
  const main = document.querySelector(".sn-main");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));
  if (toggle) toggle.setAttribute("aria-expanded", String(open));
  sidebar?.removeAttribute("inert");
  main?.removeAttribute("inert");
  if (sidebar && open) {
    sidebar.querySelectorAll("button,a,input,select,textarea").forEach((node) => {
      node.removeAttribute("inert");
      node.removeAttribute("aria-hidden");
      setImportant(node, "pointer-events", "auto");
    });
  }
  if (backdrop) {
    backdrop.hidden = !open;
    setImportant(backdrop, "background", "transparent");
    setImportant(backdrop, "backdrop-filter", "none");
    setImportant(backdrop, "-webkit-backdrop-filter", "none");
  }
  if (main) {
    setImportant(main, "filter", "none");
    setImportant(main, "opacity", "1");
  }
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v206Launcher = "stable-icon";
    ["animation", "transition", "filter", "transform"].forEach((property) => setImportant(launcher, property, "none"));
    setImportant(launcher, "opacity", "1");
  }
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;
  const full = shell.dataset.naraSize === "full";
  layer.dataset.v206Mode = full ? "modal" : "nonmodal";
  shell.dataset.v206Controls = "two-row-mobile";
  layer.setAttribute("aria-modal", String(full));
  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.inert = !full;
    backdrop.tabIndex = full ? 0 : -1;
    backdrop.setAttribute("aria-hidden", String(!full));
  }
  if (!full) {
    setImportant(layer, "pointer-events", "none");
    setImportant(layer, "background", "transparent");
    setImportant(layer, "backdrop-filter", "none");
    setImportant(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }
  const close = shell.querySelector('button[title="Tutup"],button[title="Tutup Nara AI"],button[aria-label="Tutup Nara AI"]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("inert");
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara AI");
  }
  shell.querySelectorAll("button,.nara-select,.nara-select *").forEach((node) => {
    setImportant(node, "animation", "none");
    setImportant(node, "transition", "none");
  });
}

async function getPersistedSession() {
  const known = window.__ngebloggingVerifiedSession;
  const knownSession = known?.session || (known?.access_token ? known : null);
  if (knownSession?.access_token && knownSession?.user?.id) return { session: knownSession, user: knownSession.user };
  if (!supabase?.auth) return null;
  const timeout = new Promise((_, reject) => window.setTimeout(() => reject(new Error("SESSION_LOCAL_TIMEOUT_V206")), 2800));
  const result = await Promise.race([supabase.auth.getSession(), timeout]);
  if (result?.error) throw result.error;
  const session = result?.data?.session;
  if (!session?.access_token || !session?.user?.id) return null;
  window.__ngebloggingVerifiedSession = { session, user: session.user, verification: "persisted-session-v206" };
  return { session, user: session.user };
}

async function fetchMembershipDirect(userId, accessToken) {
  const env = import.meta.env || {};
  const base = String(env.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "").trim();
  if (!base || !key) throw new Error("SUPABASE_DIRECT_NOT_CONFIGURED_V206");
  const url = new URL(`${base}/rest/v1/site_members`);
  url.searchParams.set("select", "site_id,role,joined_at,sites(id,name,slug,description,status,is_public,blueprint,theme_key,settings,published_at,created_at,updated_at)");
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("order", "joined_at.asc");
  url.searchParams.set("limit", "100");
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      signal: controller.signal,
      headers: { apikey: key, Authorization: `Bearer ${accessToken}`, Accept: "application/json", "x-client-info": "ngeblogging-studio-v206" },
    });
    if (!response.ok) throw Object.assign(new Error(`MEMBERSHIP_HTTP_${response.status}`), { status: response.status });
    const rows = await response.json();
    return (Array.isArray(rows) ? rows : []).map((record) => {
      const site = Array.isArray(record?.sites) ? record.sites[0] : record?.sites;
      return site ? { ...site, role: record.role } : null;
    }).filter(Boolean);
  } finally { window.clearTimeout(timer); }
}

function chooseSite(sites) {
  let preferred = "";
  try { preferred = localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; } catch { preferred = ""; }
  return sites.find((site) => site.id === preferred) || sites[0] || null;
}

function rememberSite(site, userId) {
  if (!site?.id || !site?.slug || !userId) return;
  for (const key of SNAPSHOT_KEYS) {
    try { localStorage.setItem(key, JSON.stringify({ ...site, __userId: userId, __release: RELEASE, __savedAt: Date.now() })); } catch { /* storage may be restricted */ }
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
    document.documentElement.dataset.studioRecoveryV206 = site ? "real-site" : "real-empty-membership";
    return recoveredMembership;
  })().catch((error) => {
    document.documentElement.dataset.studioRecoveryV206 = "failed";
    console.warn("v206 Studio membership recovery belum berhasil", error);
    throw error;
  }).finally(() => { recoveryPromise = null; });
  return recoveryPromise;
}

function clickRetry(retry) {
  if (!retry || retry.dataset.v206Clicked === "true") return;
  retry.dataset.v206Clicked = "true";
  retry.disabled = false;
  window.setTimeout(() => { if (document.contains(retry)) retry.click(); }, 80);
}

function normalizeStartup() {
  const startup = document.querySelector(".so75-startup");
  if (!startup) return;
  startup.dataset.v206Startup = "real-membership-recovery";
  const retry = startup.querySelector("section > button.so75-primary,section > button");
  if (recoveredMembership) { clickRetry(retry); return; }
  if (recoveryPromise || recoveryAttempts >= 2 || navigator.onLine === false) return;
  if (retry) retry.disabled = true;
  const delay = recoveryAttempts === 0 ? 120 : 1200;
  window.setTimeout(() => {
    if (!document.querySelector(".so75-startup") || recoveryPromise || recoveredMembership) return;
    recoverMembership().then(() => {
      clickRetry(document.querySelector(".so75-startup section > button.so75-primary,.so75-startup section > button"));
    }).catch(() => {
      const current = document.querySelector(".so75-startup section > button.so75-primary,.so75-startup section > button");
      if (current) current.disabled = false;
    });
  }, delay);
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  root.dataset.studioProductionV206 = RELEASE;
  root.dataset.studioMobileV206 = String(mobileLike());
  normalizeTheme();
  normalizeDrawer();
  normalizeNara();
  normalizeStartup();
}
function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden", "data-nara-size", "data-studio-responsive-mode"] });
for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) window.addEventListener(eventName, schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
sync();

export { RELEASE, mobileLike, normalizeTheme, normalizeDrawer, normalizeNara, normalizeStartup, recoverMembership, fetchMembershipDirect, sync };
