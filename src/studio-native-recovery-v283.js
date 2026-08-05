import { loadAnalytics } from "./studio-analytics-v41.js";

export const RELEASE = "studio-native-recovery-v283-20260805";
export const SIDEBAR_STORAGE_KEY = "ngeblogging-studio-sidebar-state-v283";
export const MAX_CODE_LINES = 10000;

let frame = 0;
let analyticsView = null;
let sidebarPreferenceApplied = false;
const codeEditors = new WeakMap();

const root = () => document.documentElement;
const shell = () => document.querySelector(".sn-shell[data-device-mode],.sn-shell");
const sidebar = () => document.getElementById("ngeblogging-studio-sidebar");
const reactToggle = () => document.querySelector(".sn-main>.sn-top>.sn-sidebar-toggle,.sn-top>.sn-sidebar-toggle");

function family() {
  const html = root();
  if (html.dataset.studioDeviceMode === "large") return "large";
  if (html.dataset.studioDeviceMode === "small") return "small";
  if (html.dataset.studioDesktopSitePhone === "true" || html.dataset.v232ModeLock === "desktop-site-large") return "large";
  const responsive = String(html.dataset.studioResponsiveMode || "").toLowerCase();
  if (["tablet", "desktop"].includes(responsive)) return "large";
  if (["application", "phone", "mobile", "compact"].includes(responsive)) return "small";
  return (document.documentElement.clientWidth || window.innerWidth || 1) >= 761 ? "large" : "small";
}

function safeGet(key) {
  try { return localStorage.getItem(key) || ""; } catch { return ""; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage cannot break navigation */ }
}

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("aria-hidden");
  node.removeAttribute("inert");
}

function clearInteractionLocks() {
  for (const node of [root(), document.body, document.getElementById("root"), shell(), document.querySelector(".sn-main")]) {
    if (!node) continue;
    node.removeAttribute?.("inert");
    node.style?.removeProperty?.("pointer-events");
    node.style?.removeProperty?.("filter");
    node.style?.removeProperty?.("backdrop-filter");
    node.style?.removeProperty?.("-webkit-backdrop-filter");
    node.style?.removeProperty?.("overflow");
    node.style?.removeProperty?.("touch-action");
  }
}

function sidebarLabel(side, currentFamily) {
  if (currentFamily === "small") return side.classList.contains("mobile-open") ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging";
  return side.classList.contains("collapsed") ? "Buka sidebar Ngeblogging" : "Ciutkan sidebar Ngeblogging";
}

function applySidebarPreference(side, currentFamily) {
  if (currentFamily !== "large" || sidebarPreferenceApplied) return;
  sidebarPreferenceApplied = true;
  const saved = safeGet(SIDEBAR_STORAGE_KEY);
  if (!["expanded", "collapsed"].includes(saved)) return;
  const current = side.classList.contains("collapsed") ? "collapsed" : "expanded";
  if (saved !== current) reactToggle()?.click();
}

function normalizeSidebar() {
  const app = shell();
  const side = sidebar();
  if (!app || !side) return;
  const currentFamily = family();
  app.dataset.v283Family = currentFamily;
  root().dataset.studioNativeRecoveryV283 = RELEASE;

  reveal(side);
  side.style.setProperty("display", "flex", "important");
  side.style.setProperty("visibility", "visible", "important");
  side.style.setProperty("opacity", "1", "important");
  side.style.setProperty("pointer-events", "auto", "important");
  side.style.setProperty("filter", "none", "important");
  side.style.setProperty("backdrop-filter", "none", "important");
  side.style.setProperty("-webkit-backdrop-filter", "none", "important");

  if (currentFamily === "large" && side.classList.contains("mobile-open")) side.classList.remove("mobile-open");
  const drawerOpen = currentFamily === "small" && side.classList.contains("mobile-open");
  document.body.classList.toggle("sn-mobile-sidebar-open", drawerOpen);

  const logo = side.querySelector(".sn-logo");
  const mark = side.querySelector(".sn-logo-mark");
  const brand = side.querySelector(".sn-logo>b");
  reveal(logo);
  reveal(mark);
  if (mark) {
    mark.dataset.v283SingleN = "true";
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    mark.setAttribute("aria-expanded", String(currentFamily === "small" ? drawerOpen : !side.classList.contains("collapsed")));
    mark.setAttribute("aria-label", sidebarLabel(side, currentFamily));
    mark.setAttribute("title", sidebarLabel(side, currentFamily));
    const letter = mark.querySelector("strong");
    if (letter) {
      letter.textContent = "n";
      letter.style.setProperty("color", "#fff", "important");
      letter.style.setProperty("-webkit-text-fill-color", "#fff", "important");
      letter.style.setProperty("opacity", "1", "important");
    }
  }
  if (brand) brand.textContent = "Ngeblogging";

  for (const control of side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button")) {
    reveal(control);
    control.disabled = false;
    const label = control.querySelector("span")?.textContent?.trim() || control.textContent?.trim() || "Menu";
    control.setAttribute("aria-label", label);
    control.setAttribute("title", label);
  }

  document.querySelectorAll([
    ".sn-side-close", ".sn-sidebar-edge-toggle-v147", ".v227-sidebar-fab", ".studio-external-sidebar-toggle",
    "[data-v173-collapse-toggle]", "[data-v187-sidebar-toggle]", "[data-v208-sidebar-toggle]",
    "[data-v223-sidebar-toggle]", "[data-v229-sidebar-toggle]", "#ngeblogging-studio-chrome-v244",
    "[data-studio-mode-badge]", "[data-device-mode-badge]", ".studio-device-mode-badge", ".v225-mode-badge",
  ].join(",")).forEach((node) => {
    node.hidden = true;
    node.setAttribute("aria-hidden", "true");
    node.setAttribute("inert", "");
  });

  const bridge = reactToggle();
  if (bridge) {
    bridge.dataset.v283Bridge = "react-state-owner";
    bridge.setAttribute("aria-hidden", "true");
    bridge.setAttribute("tabindex", "-1");
  }

  if (currentFamily === "large") {
    applySidebarPreference(side, currentFamily);
    safeSet(SIDEBAR_STORAGE_KEY, side.classList.contains("collapsed") ? "collapsed" : "expanded");
  }
}

function normalizeProfile() {
  const avatar = document.querySelector(".sn-main>.sn-top .sn-avatar,.sn-top .sn-avatar");
  if (!avatar) return;
  reveal(avatar);
  avatar.disabled = false;
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-label", "Buka menu profil");
  avatar.style.setProperty("display", "grid", "important");
  avatar.style.setProperty("visibility", "visible", "important");
  avatar.style.setProperty("opacity", "1", "important");
  avatar.style.setProperty("pointer-events", "auto", "important");
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    reveal(launcher);
    launcher.disabled = false;
    launcher.dataset.v283Floating = "viewport-corner";
    launcher.style.setProperty("position", "fixed", "important");
    launcher.style.setProperty("right", "max(12px, env(safe-area-inset-right, 0px))", "important");
    launcher.style.setProperty("bottom", "max(14px, calc(env(safe-area-inset-bottom, 0px) + 10px))", "important");
    launcher.style.setProperty("left", "auto", "important");
    launcher.style.setProperty("top", "auto", "important");
    launcher.style.setProperty("transform", "none", "important");
    launcher.style.setProperty("animation", "none", "important");
    launcher.style.setProperty("opacity", "1", "important");
    launcher.style.setProperty("pointer-events", "auto", "important");
  }

  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) {
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
    clearInteractionLocks();
    return;
  }

  const full = panel.dataset.naraSize === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.dataset.v283Interaction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  panel.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(":scope>.nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
    if (!full) backdrop.setAttribute("inert", "");
    else backdrop.removeAttribute("inert");
  }

  panel.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.model,.nara-select.intelligence,.nara-attachment-menu-wrap").forEach(reveal);
  const close = panel.querySelector('button[aria-label="Tutup Nara"],button[aria-label="Tutup Nara AI"],button[title="Tutup"]');
  reveal(close);
  if (close) close.disabled = false;

  if (!full) {
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
    clearInteractionLocks();
  }
}

function lineNumberText(count) {
  const safe = Math.max(1, Math.min(MAX_CODE_LINES, count));
  let output = "";
  for (let line = 1; line <= safe; line += 1) output += `${line}\n`;
  return output;
}

function updateCodeEditor(textarea, record) {
  if (!textarea.isConnected || !record.gutter.isConnected) return;
  const count = Math.min(MAX_CODE_LINES, Math.max(1, String(textarea.value || "").split("\n").length));
  if (record.gutter.dataset.lines !== String(count)) {
    record.gutter.dataset.lines = String(count);
    record.pre.textContent = lineNumberText(count);
  }
  record.gutter.style.top = `${textarea.offsetTop}px`;
  record.gutter.style.height = `${textarea.clientHeight}px`;
  record.pre.style.transform = `translateY(${-textarea.scrollTop}px)`;
}

function enhanceCodeEditor(textarea) {
  if (codeEditors.has(textarea)) {
    updateCodeEditor(textarea, codeEditors.get(textarea));
    return;
  }
  const pane = textarea.closest(".tn-code-pane");
  if (!pane) return;
  pane.querySelectorAll(".v275-code-lines,.v277-code-lines,.v259-code-gutter,.tn-code-gutter-v250,.v240-code-gutter-portal,.v239-code-gutter,.v234-code-gutter,.v231-code-gutter,.v222-code-line-gutter,.v220-code-line-gutter,.v219-code-line-gutter,.v216-code-line-gutter").forEach((node) => node.remove());
  const gutter = document.createElement("div");
  gutter.className = "v283-code-lines";
  gutter.setAttribute("aria-hidden", "true");
  const pre = document.createElement("pre");
  gutter.append(pre);
  pane.append(gutter);
  textarea.dataset.v283CodeEditor = "numbered-up-to-10000";
  textarea.setAttribute("data-max-lines", String(MAX_CODE_LINES));
  const record = { gutter, pre };
  codeEditors.set(textarea, record);
  const sync = () => updateCodeEditor(textarea, record);
  textarea.addEventListener("input", sync, { passive: true });
  textarea.addEventListener("scroll", sync, { passive: true });
  sync();
}

function normalizeThemeTools() {
  document.querySelectorAll(".tn-code-pane textarea").forEach(enhanceCodeEditor);
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    workspace.dataset.v283CodeLayout = family() === "small" ? "preview-top-code-bottom" : "code-left-preview-right";
  });
  document.querySelectorAll(".tn-layout-slot-v264,.tn-layout-map-v264 button").forEach((button) => {
    button.disabled = false;
    button.removeAttribute("inert");
    button.removeAttribute("aria-hidden");
  });
}

function restoreProductionAnalytics() {
  const view = document.querySelector(".sn-main>.sn-view-pad");
  const title = view?.querySelector(":scope>.sn-page-title h1")?.textContent?.trim();
  if (!view || title !== "Analitik") {
    analyticsView = null;
    return;
  }
  if (view === analyticsView && (view.dataset.op41AnalyticsBusy === "true" || view.querySelector(".op41-host[data-surface='analytics']"))) return;
  analyticsView = view;
  view.dataset.v283Analytics = "production-rpc";
  loadAnalytics(view, 30, false);
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*", ".sn-content-card", ".sn-content-card>*",
    ".ce-app", ".ce-app>*", ".tn-studio", ".tn-studio>*", ".tn-layout-studio", ".tn-layout-map-v264",
    ".tn-code-workspace", ".tn-code-pane", ".tn-code-preview-pane", ".sv124-page", ".sv124-page>*",
    ".op41-panel", ".op41-panel>*",
  ].join(",")).forEach((node) => {
    node.style.setProperty("min-width", "0", "important");
    node.style.setProperty("max-width", "100%", "important");
  });
}

function sync() {
  frame = 0;
  normalizeSidebar();
  normalizeProfile();
  normalizeNara();
  normalizeThemeTools();
  restoreProductionAnalytics();
  normalizeContainment();
}

function schedule(delay = 0) {
  if (delay > 0) {
    window.setTimeout(() => schedule(0), delay);
    return;
  }
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

function activateLogo(event) {
  const mark = event.target?.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (!mark) return false;
  if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return false;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  reactToggle()?.click();
  schedule(0);
  schedule(80);
  return true;
}

function handleNavigation(event) {
  const target = event.target?.closest?.("#ngeblogging-studio-sidebar nav>button,#ngeblogging-studio-sidebar .sn-account-settings-v135");
  if (!target) return;
  schedule(0);
  schedule(80);
  schedule(260);
  if (family() !== "large") return;
  window.setTimeout(() => {
    const side = sidebar();
    if (side && !side.classList.contains("collapsed")) reactToggle()?.click();
  }, 40);
}

function handleKeydown(event) {
  if (activateLogo(event)) return;
  if (event.key !== "Escape") return;
  const side = sidebar();
  if (family() === "small" && side?.classList.contains("mobile-open")) reactToggle()?.click();
}

function boot() {
  sync();
  schedule(80);
  schedule(260);
  schedule(800);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("click", (event) => {
    if (activateLogo(event)) return;
    handleNavigation(event);
    schedule(0);
    schedule(120);
  }, true);
  window.addEventListener("keydown", handleKeydown, true);
  window.addEventListener("resize", () => schedule(0), { passive: true });
  window.addEventListener("orientationchange", () => schedule(80), { passive: true });
  window.addEventListener("pageshow", boot, { passive: true });
  window.addEventListener("online", () => schedule(80), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule(0));
  window.visualViewport?.addEventListener("resize", () => schedule(0), { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(0); });
  document.addEventListener("input", () => schedule(0), { passive: true, capture: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
}

export { activateLogo, family, normalizeNara, normalizeProfile, normalizeSidebar, restoreProductionAnalytics, sync };