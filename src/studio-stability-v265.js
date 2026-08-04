import { loadAnalytics } from "./studio-analytics-v41.js";

export const RELEASE = "studio-stability-v265-20260804";
const SIDEBAR_KEY = "ngeblogging-studio-sidebar-v265";
let frame = 0;
let analyticsHost = null;

function safeGet(key) {
  try { return localStorage.getItem(key) || ""; } catch { return ""; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage must never block navigation */ }
}
function isSmall() {
  const root = document.documentElement;
  return root.dataset.studioDeviceMode === "small"
    || ["application", "phone", "mobile", "compact"].includes(root.dataset.studioResponsiveMode || "");
}
function shell() { return document.querySelector(".sn-shell"); }
function side() { return document.querySelector("#ngeblogging-studio-sidebar.sn-side"); }
function topToggle() { return document.querySelector(".sn-sidebar-toggle"); }

function syncSidebarState() {
  const host = shell();
  const sidebar = side();
  if (!host || !sidebar) return;
  const collapsed = sidebar.classList.contains("collapsed");
  const mobileOpen = sidebar.classList.contains("mobile-open");
  host.dataset.sidebarCollapsedV265 = String(collapsed);
  host.dataset.mobileDrawerOpenV265 = String(mobileOpen);
  sidebar.dataset.v265 = RELEASE;
  document.documentElement.dataset.studioSidebarV265 = RELEASE;

  const logo = sidebar.querySelector(".sn-logo-mark");
  if (logo) {
    logo.setAttribute("role", "button");
    logo.setAttribute("tabindex", "0");
    logo.setAttribute("aria-controls", sidebar.id);
    logo.setAttribute("aria-expanded", String(isSmall() ? mobileOpen : !collapsed));
    logo.setAttribute("aria-label", isSmall()
      ? (mobileOpen ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging")
      : (collapsed ? "Perluas menu Ngeblogging" : "Ciutkan menu Ngeblogging"));
    logo.setAttribute("title", logo.getAttribute("aria-label"));
  }

  sidebar.querySelectorAll("nav button,.sn-new,.sn-account-footer button").forEach((button) => {
    const text = button.querySelector("span")?.textContent?.trim() || button.textContent?.trim() || "Menu";
    if (!button.getAttribute("aria-label")) button.setAttribute("aria-label", text);
    if (!button.getAttribute("title")) button.setAttribute("title", text);
  });
}

function applyStoredSidebar() {
  if (isSmall()) return;
  const sidebar = side();
  const toggle = topToggle();
  if (!sidebar || !toggle || sidebar.dataset.v265StoredApplied) return;
  sidebar.dataset.v265StoredApplied = "true";
  const wanted = safeGet(SIDEBAR_KEY);
  if (wanted === "collapsed" && !sidebar.classList.contains("collapsed")) toggle.click();
  if (wanted === "expanded" && sidebar.classList.contains("collapsed")) toggle.click();
}

function activateInternalLogo() {
  const sidebar = side();
  const toggle = topToggle();
  if (!sidebar || !toggle) return;
  if (isSmall()) {
    if (sidebar.classList.contains("mobile-open")) toggle.click();
    else toggle.click();
  } else {
    toggle.click();
    requestAnimationFrame(() => safeSet(SIDEBAR_KEY, sidebar.classList.contains("collapsed") ? "collapsed" : "expanded"));
  }
}

function profileMenu() {
  return document.querySelector(".sn-profile-menu-v150");
}
function closeProfileMenu() {
  profileMenu()?.remove();
  document.querySelector(".sn-avatar")?.setAttribute("aria-expanded", "false");
}
function enhanceProfileMenu() {
  const menu = profileMenu();
  if (!menu || menu.dataset.v265) return;
  menu.dataset.v265 = RELEASE;
  const buttons = [...menu.querySelectorAll("button")];
  const settings = buttons.find((button) => button.dataset.action === "settings");
  if (!menu.querySelector('[data-action="add-site"]')) {
    const add = document.createElement("button");
    add.type = "button";
    add.setAttribute("role", "menuitem");
    add.dataset.action = "add-site";
    add.innerHTML = "<span>Tambahkan situs</span><small>Buat atau beralih workspace</small>";
    menu.insertBefore(add, settings || null);
  }
  if (!menu.querySelector('[data-action="view-site"]')) {
    const view = document.createElement("button");
    view.type = "button";
    view.setAttribute("role", "menuitem");
    view.dataset.action = "view-site";
    view.innerHTML = "<span>Lihat situs</span><small>Buka situs publik aktif</small>";
    menu.insertBefore(view, settings || null);
  }
}

function syncNara() {
  const layer = document.querySelector(".nara-assistant-layer");
  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const host = shell();
  if (!layer || !panel) {
    document.documentElement.dataset.naraModalV265 = "closed";
    host?.removeAttribute("data-nara-open-v265");
    return;
  }
  const size = panel.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.naraModeV265 = full ? "modal" : "non-modal";
  layer.setAttribute("aria-modal", String(full));
  host?.setAttribute("data-nara-open-v265", size);
  document.documentElement.dataset.naraModalV265 = full ? "full" : "non-modal";
  panel.querySelectorAll(".nara-size-controls-v147 button").forEach((button) => {
    button.setAttribute("type", "button");
  });
}

function restoreAnalytics() {
  const active = document.querySelector(".sn-side nav button.active span")?.textContent?.trim();
  if (active !== "Analitik") {
    analyticsHost = null;
    return;
  }
  const view = document.querySelector(".sn-shell > .sn-main > .sn-view-pad");
  if (!view || analyticsHost === view) return;
  const heading = view.querySelector(".sn-page-title h1")?.textContent?.trim();
  if (heading !== "Analitik") return;
  analyticsHost = view;
  view.dataset.analyticsV265 = RELEASE;
  loadAnalytics(view, 30, false);
}

function normalizeVisualState() {
  const host = shell();
  if (!host) return;
  host.dataset.uiRelease = "stable-v265";
  document.documentElement.dataset.studioStabilityV265 = RELEASE;
  const avatar = document.querySelector(".sn-avatar");
  avatar?.setAttribute("aria-haspopup", "menu");
  avatar?.setAttribute("title", "Profil dan akun");
  const workspace = document.querySelector(".sn-workspace");
  workspace?.setAttribute("title", "Kelola situs");
}

function scan() {
  frame = 0;
  applyStoredSidebar();
  syncSidebarState();
  enhanceProfileMenu();
  syncNara();
  restoreAnalytics();
  normalizeVisualState();
}
function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(scan);
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    const logo = event.target.closest?.(".sn-logo-mark");
    if (logo && logo.closest("#ngeblogging-studio-sidebar")) {
      event.preventDefault();
      event.stopPropagation();
      activateInternalLogo();
      setTimeout(schedule, 0);
      return;
    }

    const profileAction = event.target.closest?.(".sn-profile-menu-v150 button[data-action]");
    if (profileAction?.dataset.action === "add-site") {
      event.preventDefault();
      event.stopPropagation();
      closeProfileMenu();
      document.querySelector(".sn-workspace")?.click();
      return;
    }
    if (profileAction?.dataset.action === "view-site") {
      event.preventDefault();
      event.stopPropagation();
      const link = document.querySelector(".sn-view-site");
      closeProfileMenu();
      if (link?.href) window.open(link.href, "_blank", "noopener,noreferrer");
      return;
    }

    setTimeout(schedule, 0);
  }, true);

  document.addEventListener("keydown", (event) => {
    const logo = event.target.closest?.(".sn-logo-mark");
    if (logo && logo.closest("#ngeblogging-studio-sidebar") && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      activateInternalLogo();
      setTimeout(schedule, 0);
    }
  }, true);

  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "data-nara-size", "data-studio-device-mode", "data-studio-responsive-mode"],
  });
  schedule();
}
