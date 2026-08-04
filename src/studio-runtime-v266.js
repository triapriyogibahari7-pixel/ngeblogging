import { loadAnalytics } from "./studio-analytics-v41.js";

export const RELEASE = "studio-runtime-v266-20260804";
const SIDEBAR_KEY = "ngeblogging-studio-sidebar-state-v266";
let frame = 0;
let analyticsView = null;

function root() { return document.documentElement; }
function smallFamily() {
  const html = root();
  return html.classList.contains("studio-v265-small")
    || html.dataset.studioDeviceMode === "small"
    || ["application", "phone", "mobile", "compact"].includes(html.dataset.studioResponsiveMode || "");
}
function safeGet(key) { try { return localStorage.getItem(key) || ""; } catch { return ""; } }
function safeSet(key, value) { try { localStorage.setItem(key, value); } catch { /* storage cannot block Studio */ } }

function syncSidebarPersistence() {
  const side = document.getElementById("ngeblogging-studio-sidebar");
  const toggle = document.querySelector(".sn-top .sn-sidebar-toggle");
  if (!side || !toggle) return;

  if (!smallFamily() && !side.dataset.sidebarPersistenceV266Applied) {
    side.dataset.sidebarPersistenceV266Applied = "true";
    const stored = safeGet(SIDEBAR_KEY);
    if (stored === "collapsed" && !side.classList.contains("collapsed")) toggle.click();
    if (stored === "expanded" && side.classList.contains("collapsed")) toggle.click();
  }
  if (!smallFamily()) safeSet(SIDEBAR_KEY, side.classList.contains("collapsed") ? "collapsed" : "expanded");
  root().dataset.studioSidebarPersistenceV266 = RELEASE;
}

function activeMenuLabel() {
  return document.querySelector("#ngeblogging-studio-sidebar nav button.active span")?.textContent?.trim() || "";
}

function restoreProductionAnalytics() {
  if (activeMenuLabel() !== "Analitik") {
    analyticsView = null;
    return;
  }
  const view = document.querySelector(".sn-shell > .sn-main > .sn-view-pad");
  if (!view || view === analyticsView) return;
  if (view.querySelector(".sn-page-title h1")?.textContent?.trim() !== "Analitik") return;
  analyticsView = view;
  if (view.dataset.op41AnalyticsMode === "production" && view.querySelector(".op41-host[data-surface='analytics']")) return;
  view.dataset.analyticsRuntimeV266 = RELEASE;
  root().dataset.studioAnalyticsV266 = "production-first";
  loadAnalytics(view, 30, false);
}

function preserveNonModalNara() {
  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  if (!panel || panel.dataset.naraSize === "full") return;
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("touch-action");
  document.documentElement.style.removeProperty("overflow");
  document.documentElement.style.removeProperty("touch-action");
}

function sync() {
  frame = 0;
  root().dataset.studioRuntimeV266 = RELEASE;
  syncSidebarPersistence();
  restoreProductionAnalytics();
  preserveNonModalNara();
}
function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

if (typeof document !== "undefined") {
  document.addEventListener("click", () => setTimeout(schedule, 0), true);
  window.addEventListener("pageshow", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("online", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "data-nara-size", "data-studio-device-mode", "data-studio-responsive-mode"],
  });
  schedule();
}
