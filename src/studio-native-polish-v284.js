import { loadAnalytics } from "./studio-analytics-v41.js";

export const RELEASE = "studio-native-polish-v284-20260805";
export const SIDEBAR_STORAGE_KEY = "ngeblogging-studio-sidebar-state-v284";
export const MAX_CODE_LINES = 10000;

let frame = 0;
let analyticsView = null;
let logoBusy = false;
const codeEditors = new WeakMap();

const root = () => document.documentElement;
const shell = () => document.querySelector(".sn-shell[data-device-mode],.sn-shell");
const sidebar = () => document.getElementById("ngeblogging-studio-sidebar");
const reactToggle = () => document.querySelector(".sn-main>.sn-top>.sn-sidebar-toggle,.sn-top>.sn-sidebar-toggle");

function family() {
  const html = root();
  const shellMode = shell()?.dataset?.deviceMode;
  if (shellMode === "large" || shellMode === "small") return shellMode;
  if (html.dataset.studioDeviceMode === "large" || html.dataset.studioDeviceMode === "small") return html.dataset.studioDeviceMode;
  return (document.documentElement.clientWidth || window.innerWidth || 1) >= 761 ? "large" : "small";
}

function safeGet(key) {
  try { return localStorage.getItem(key) || ""; } catch { return ""; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage must never block Studio */ }
}

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("aria-hidden");
  node.removeAttribute("inert");
}

function schedule(delay = 0) {
  if (delay > 0) {
    window.setTimeout(() => schedule(0), delay);
    return;
  }
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

function clickReactSidebarToggle() {
  if (logoBusy) return;
  const toggle = reactToggle();
  if (!toggle) return;
  logoBusy = true;
  toggle.click();
  window.setTimeout(() => { logoBusy = false; schedule(0); }, 70);
}

function onLogoClick(event) {
  event.preventDefault();
  clickReactSidebarToggle();
}

function onLogoKeydown(event) {
  if (!["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  clickReactSidebarToggle();
}

function bindLogo(mark) {
  if (!mark || mark.dataset.v284NativeBound === "true") return;
  mark.dataset.v284NativeBound = "true";
  mark.addEventListener("click", onLogoClick);
  mark.addEventListener("keydown", onLogoKeydown);
}

function bindNavigation(side) {
  side.querySelectorAll("nav>button,.sn-account-settings-v135").forEach((button) => {
    if (button.dataset.v284NavigationBound === "true") return;
    button.dataset.v284NavigationBound = "true";
    button.addEventListener("click", () => {
      if (family() === "large") {
        window.setTimeout(() => {
          const current = sidebar();
          if (current && !current.classList.contains("collapsed")) reactToggle()?.click();
          schedule(80);
        }, 30);
      } else {
        schedule(80);
      }
    });
  });
}

function normalizeSidebar() {
  const app = shell();
  const side = sidebar();
  if (!app || !side) return;
  const currentFamily = family();
  root().dataset.studioNativePolishV284 = RELEASE;
  app.dataset.v284Family = currentFamily;

  reveal(side);
  side.style.removeProperty("filter");
  side.style.removeProperty("backdrop-filter");
  side.style.removeProperty("-webkit-backdrop-filter");

  const mark = side.querySelector(".sn-logo-mark");
  const brand = side.querySelector(".sn-logo>b");
  reveal(mark);
  bindLogo(mark);
  bindNavigation(side);

  if (mark) {
    const expanded = currentFamily === "small" ? side.classList.contains("mobile-open") : !side.classList.contains("collapsed");
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    mark.setAttribute("aria-expanded", String(expanded));
    mark.setAttribute("aria-label", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
    mark.setAttribute("title", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
    const letter = mark.querySelector("strong");
    if (letter) letter.textContent = "n";
  }
  if (brand) brand.textContent = "Ngeblogging";

  for (const button of side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button")) {
    reveal(button);
    button.disabled = false;
    const label = button.querySelector("span")?.textContent?.trim() || button.textContent?.trim() || "Menu";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  }

  document.querySelectorAll(".sn-side-close,.sn-sidebar-edge-toggle-v147,.v227-sidebar-fab,.studio-external-sidebar-toggle,[data-v173-collapse-toggle],[data-v187-sidebar-toggle],[data-v208-sidebar-toggle],[data-v223-sidebar-toggle],[data-v229-sidebar-toggle],[data-studio-mode-badge],[data-device-mode-badge],.studio-device-mode-badge,.v225-mode-badge").forEach((node) => {
    node.hidden = true;
    node.setAttribute("aria-hidden", "true");
    node.setAttribute("inert", "");
  });

  if (currentFamily === "large") {
    side.classList.remove("mobile-open");
    document.body.classList.remove("sn-mobile-sidebar-open");
    if (side.dataset.v284PreferenceApplied !== "true") {
      side.dataset.v284PreferenceApplied = "true";
      const saved = safeGet(SIDEBAR_STORAGE_KEY);
      const current = side.classList.contains("collapsed") ? "collapsed" : "expanded";
      if (["expanded", "collapsed"].includes(saved) && saved !== current) {
        reactToggle()?.click();
        schedule(80);
        return;
      }
    }
    safeSet(SIDEBAR_STORAGE_KEY, side.classList.contains("collapsed") ? "collapsed" : "expanded");
  } else {
    document.body.classList.toggle("sn-mobile-sidebar-open", side.classList.contains("mobile-open"));
  }
}

function normalizeProfile() {
  const avatar = document.querySelector(".sn-main>.sn-top .sn-avatar,.sn-top .sn-avatar");
  if (!avatar) return;
  reveal(avatar);
  avatar.disabled = false;
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-label", "Buka menu profil");
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    reveal(launcher);
    launcher.disabled = false;
    launcher.dataset.v284Floating = "viewport-corner";
  }

  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) return;
  const full = panel.dataset.naraSize === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.dataset.v284Interaction = full ? "modal" : "nonmodal";
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
  if (!full) document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
}

function lineNumberText(count) {
  const safe = Math.max(1, Math.min(MAX_CODE_LINES, count));
  let output = "";
  for (let line = 1; line <= safe; line += 1) output += `${line}\n`;
  return output;
}

function updateCodeEditor(textarea, record) {
  if (!textarea?.isConnected || !record?.gutter?.isConnected) return;
  const count = Math.min(MAX_CODE_LINES, Math.max(1, String(textarea.value || "").split("\n").length));
  if (record.gutter.dataset.lines !== String(count)) {
    record.gutter.dataset.lines = String(count);
    record.pre.textContent = lineNumberText(count);
  }
  record.pre.style.transform = `translateY(${-textarea.scrollTop}px)`;
}

function enhanceCodeEditor(textarea) {
  if (codeEditors.has(textarea)) {
    updateCodeEditor(textarea, codeEditors.get(textarea));
    return;
  }
  const pane = textarea.closest(".tn-code-pane");
  if (!pane) return;
  pane.querySelectorAll(".v283-code-lines,.v275-code-lines,.v277-code-lines,.v259-code-gutter,.tn-code-gutter-v250,.v240-code-gutter-portal,.v239-code-gutter,.v234-code-gutter,.v231-code-gutter,.v222-code-line-gutter").forEach((node) => node.remove());
  const gutter = document.createElement("div");
  gutter.className = "v284-code-lines";
  gutter.setAttribute("aria-hidden", "true");
  const pre = document.createElement("pre");
  gutter.append(pre);
  pane.append(gutter);
  textarea.dataset.v284CodeEditor = "numbered-up-to-10000";
  textarea.setAttribute("data-max-lines", String(MAX_CODE_LINES));
  const record = { gutter, pre };
  codeEditors.set(textarea, record);
  const syncEditor = () => updateCodeEditor(textarea, record);
  textarea.addEventListener("input", syncEditor, { passive: true });
  textarea.addEventListener("scroll", syncEditor, { passive: true });
  syncEditor();
}

function normalizeThemeTools() {
  document.querySelectorAll(".tn-code-pane textarea").forEach(enhanceCodeEditor);
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    workspace.dataset.v284CodeLayout = family() === "small" ? "preview-top-code-bottom" : "code-left-preview-right";
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
  view.dataset.v284Analytics = "production-rpc";
  loadAnalytics(view, 30, false);
}

function normalizeContainment() {
  document.querySelectorAll(".sn-main,.sn-main>*,.sn-view-pad,.sn-view-pad>*,.sn-content-card,.sn-content-card>*,.ce-app,.ce-app>*,.tn-studio,.tn-studio>*,.tn-layout-studio,.tn-code-workspace,.tn-code-pane,.tn-code-preview-pane,.sv124-page,.sv124-page>*,.op41-panel,.op41-panel>*").forEach((node) => {
    node.style.setProperty("min-width", "0");
    node.style.setProperty("max-width", "100%");
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

function boot() {
  schedule(0);
  schedule(80);
  schedule(320);
  schedule(900);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("pageshow", boot, { passive: true });
  window.addEventListener("resize", () => schedule(80), { passive: true });
  window.addEventListener("orientationchange", () => schedule(120), { passive: true });
  window.addEventListener("online", () => schedule(120), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule(0));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(0); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
}

export { family, normalizeNara, normalizeProfile, normalizeSidebar, restoreProductionAnalytics, sync };
