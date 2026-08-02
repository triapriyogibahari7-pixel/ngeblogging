import "./studio-production-v206.css";
import { supabase } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY, setActiveSiteId } from "./lib/studio-data.js";

const RELEASE = "studio-production-v206-20260802";
const MOBILE_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
const SNAPSHOT_KEYS = [
  "ngeblogging-active-site-snapshot-v195",
  "ngeblogging-active-site-snapshot-v192",
];
const MEMBERSHIP_TIMEOUT_MS = 8_000;
let frame = 0;
let recoveryPromise = null;
let recoveryAttempts = 0;
let recoveredMembership = null;

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function physicalShortEdge() {
  try {
    const values = [
      Number(screen?.width || 0), Number(screen?.height || 0),
      Number(visualViewport?.width || 0), Number(visualViewport?.height || 0),
    ].filter((value) => Number.isFinite(value) && value > 0);
    return values.length ? Math.min(...values) : 0;
  } catch {
    return 0;
  }
}

function mobileLike() {
  const root = document.documentElement;
  const family = root.dataset.studioResponsiveMode
    || root.dataset.studioResponsiveFamilyV193
    || root.dataset.studioResponsiveFamily
    || "";
  return root.dataset.studioMobileV205 === "true"
    || root.dataset.studioMobileV204 === "true"
    || root.dataset.studioPhysicalMobileV193 === "true"
    || root.dataset.studioDesktopSitePhone === "true"
    || root.dataset.studioHandheld === "true"
    || MOBILE_FAMILIES.has(family)
    || navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")
    || (physicalShortEdge() > 0 && physicalShortEdge() <= 760)
    || window.innerWidth <= 760;
}

function normalizeTheme() {
  const studio = document.querySelector(".tn-studio");
  if (!studio) return;
  studio.dataset.v206Theme = "native-layout-and-code-actions";
  const hero = studio.querySelector(".tn-hero-actions");
  if (!hero) return;

  const layout = hero.querySelector('[data-v206-theme-action="layout"],[data-v202-theme-action="layout"]');
  const code = hero.querySelector('[data-v206-theme-action="code"],[data-v205-theme-action="code"],[data-v202-theme-action="code"]');
  if (layout) {
    layout.dataset.v206ThemeAction = "layout";
    layout.setAttribute("aria-label", "Edit Tata Letak");
    layout.title = "Edit Tata Letak";
  }
  if (code) {
    code.dataset.v206ThemeAction = "code";
    code.setAttribute("aria-label", "Edit Kode HTML CSS JavaScript");
    code.title = "Edit Kode HTML, CSS, dan JavaScript";
  }
}

function normalizeDrawer() {
  const root = document.documentElement;
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const main = document.querySelector(".sn-main");
  const toggle = document.querySelector(".sn-sidebar-toggle");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));
  root.dataset.studioDrawerV206 = open ? "open" : "closed";

  for (const node of [sidebar, main, toggle]) {
    node?.removeAttribute("inert");
    node?.removeAttribute("aria-hidden");
  }
  if (sidebar && open) {
    sidebar.querySelectorAll("button,a,input,select,textarea").forEach((node) => {
      node.removeAttribute("inert");
      node.removeAttribute("aria-hidden");
      setImportant(node, "pointer-events", "auto");
    });
  }
  if (backdrop) {
    backdrop.hidden = !open;
    backdrop.setAttribute("aria-hidden", String(!open));
    for (const property of ["background", "filter", "backdrop-filter", "-webkit-backdrop-filter"]) {
      setImportant(backdrop, property, property === "background" ? "transparent" : "none");
    }
  }
  if (main) {
    setImportant(main, "filter", "none");
    setImportant(main, "opacity", "1");
  }
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v206Launcher = "icon-stable";
    for (const property of ["animation", "transition", "filter", "transform"]) setImportant(launcher, property, "none");
    setImportant(launcher, "opacity", "1");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v206Mode = full ? "modal" : "nonmodal";
  shell.dataset.v206Header = "two-row-mobile";
  layer.setAttribute("aria-modal", String(full));
  shell.setAttribute("aria-modal", String(full));

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
    setImportant(layer, "-webkit-backdrop-filter", "none");
    setImportant(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }

  const close = shell.querySelector('button[title="Tutup"],button[aria-label="Tutup Nara AI"],button[aria-label="Tutup Nara"]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("hidden");
    close.removeAttribute("inert");
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara AI");
  }

  shell.querySelectorAll("button,.nara-select,.nara-select *").forEach((node) => {
    setImportant(node, "animation", "none");
    setImportant(node, "transition", "none");
  });
}

function deadline(promise, milliseconds, label) {
  let timer = 0;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(Object.assign(new Error(label), { code: "V206_TIMEOUT" })), milliseconds);
    }),
  ]).finally(() => window.clearTimeout(timer));
}

async function localSession() {
  const cached = window.__ngebloggingVerifiedSession;
  const cachedSession = cached?.session || (cached?.access_token ? cached : null);
  if (cachedSession?.access_token && cachedSession?.user?.id) {
    return { session: cachedSession, user: cachedSession.user };
  }
  if (!supabase?.auth) return null;
  const result = await deadline(supabase.auth.getSession(), 2_800, "Pembacaan sesi lokal melewati batas waktu.");
  if (result?.error) throw result.error;
  const session = result?.data?.session || null;
  if (!session?.access_token || !session?.user?.id) return null;
  const verified = { session, user: session.user, verification: "local-session-v206" };
  window.__ngebloggingVerifiedSession = verified;
  return verified;
}

async function directMembership(userId, accessToken) {
  const env = import.meta.env || {};
  const base = String(env.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "").trim();
  if (!base || !key || !userId || !accessToken) throw Object.assign(new Error("Jalur data langsung belum tersedia."), { code: "V206_DIRECT_NOT_CONFIGURED" });

  const endpoint = new URL(`${base}/rest/v1/site_members`);
  endpoint.searchParams.set("select", "site_id,role,joined_at,sites(id,name,slug,description,status,is_public,blueprint,theme_key,settings,published_at,created_at,updated_at)");
  endpoint.searchParams.set("user_id", `eq.${userId}`);
  endpoint.searchParams.set("order", "joined_at.asc");
  endpoint.searchParams.set("limit", "100");

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), MEMBERSHIP_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        apikey: key,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "x-client-info": "ngeblogging-studio-v206",
      },
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const error = new Error(detail || `Data Workspace gagal (${response.status}).`);
      error.status = response.status;
      error.code = response.status === 401 || response.status === 403 ? "SESSION_REAUTH_REQUIRED" : "V206_MEMBERSHIP_HTTP_ERROR";
      throw error;
    }
    const rows = await response.json();
    return (Array.isArray(rows) ? rows : []).map((record) => {
      const site = Array.isArray(record?.sites) ? record.sites[0] : record?.sites;
      return site ? { ...site, role: record.role } : null;
    }).filter(Boolean);
  } finally {
    window.clearTimeout(timer);
  }
}

function preferredSite(sites) {
  let preferredId = "";
  try { preferredId = localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; } catch { preferredId = ""; }
  return sites.find((site) => site.id === preferredId) || sites[0] || null;
}

function publishRecoveredSite(site, userId) {
  if (!site?.id || !site?.slug || !userId) return;
  for (const key of SNAPSHOT_KEYS) {
    try {
      localStorage.setItem(key, JSON.stringify({
        ...site,
        __userId: userId,
        __release: RELEASE,
        __savedAt: Date.now(),
      }));
    } catch {
      // Private browsing may reject localStorage; RLS data remains authoritative.
    }
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
    const verified = await localSession();
    if (!verified?.user?.id || !verified?.session?.access_token) return null;
    const sites = await directMembership(verified.user.id, verified.session.access_token);
    const site = preferredSite(sites);
    if (site) publishRecoveredSite(site, verified.user.id);
    recoveredMembership = { sites, site, userId: verified.user.id };
    document.documentElement.dataset.studioRecoveryV206 = site ? "real-site-recovered" : "real-empty-membership";
    return recoveredMembership;
  })().catch((error) => {
    document.documentElement.dataset.studioRecoveryV206 = "failed";
    console.warn("Studio v206 membership recovery belum berhasil.", error);
    throw error;
  }).finally(() => { recoveryPromise = null; });
  return recoveryPromise;
}

function clickRetryOnce(retry) {
  if (!retry || retry.dataset.v206Clicked === "true") return;
  retry.dataset.v206Clicked = "true";
  retry.disabled = false;
  retry.removeAttribute("aria-disabled");
  window.setTimeout(() => {
    if (document.contains(retry)) retry.click();
  }, 80);
}

function normalizeStartup() {
  const startup = document.querySelector(".so75-startup");
  if (!startup) return;
  startup.dataset.v206Startup = "bounded-real-membership-recovery";
  const retry = startup.querySelector("section > button.so75-primary,section > button");
  const heading = startup.querySelector("section > h1");
  const paragraph = startup.querySelector("section > p");

  if (recoveredMembership) {
    clickRetryOnce(retry);
    return;
  }
  if (recoveryAttempts >= 2 || navigator.onLine === false || recoveryPromise) return;
  if (retry) retry.disabled = true;
  if (heading && retry) heading.textContent = "Login aktif. Memulihkan data Studio…";
  if (paragraph && retry) paragraph.textContent = "Sesi tetap masuk. Sistem sedang mengambil daftar Workspace nyata langsung melalui data akun Anda; tidak ada situs atau statistik yang dibuat-buat.";

  const delay = recoveryAttempts === 0 ? 120 : 1_200;
  window.setTimeout(() => {
    if (!document.querySelector(".so75-startup") || recoveryPromise || recoveredMembership) return;
    recoverMembership().then(() => {
      const currentRetry = document.querySelector(".so75-startup section > button.so75-primary,.so75-startup section > button");
      clickRetryOnce(currentRetry);
    }).catch(() => {
      const currentRetry = document.querySelector(".so75-startup section > button.so75-primary,.so75-startup section > button");
      if (currentRetry) {
        currentRetry.disabled = false;
        currentRetry.removeAttribute("aria-disabled");
      }
    });
  }, delay);
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*", ".tn-studio", ".tn-studio>*",
    ".tn-layout-studio", ".tn-layout-canvas-v170", ".tn-code-workspace", ".tn-code-pane", ".tn-code-preview-pane",
    ".ce-app", ".ce-app>*", ".mv176-page", ".sv124-page", ".sn-api-page", ".op41-host",
  ].join(",")).forEach((node) => {
    setImportant(node, "min-width", "0");
    setImportant(node, "max-width", "100%");
  });
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  root.dataset.studioProductionV206 = RELEASE;
  root.dataset.studioMobileV206 = String(mobileLike());
  normalizeDrawer();
  normalizeTheme();
  normalizeNara();
  normalizeStartup();
  normalizeContainment();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "data-nara-size", "data-studio-responsive-mode", "data-studio-desktop-site-phone"],
});
for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) window.addEventListener(eventName, schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

sync();

export { RELEASE, mobileLike, normalizeTheme, normalizeDrawer, normalizeNara, normalizeStartup, recoverMembership, directMembership, sync };
