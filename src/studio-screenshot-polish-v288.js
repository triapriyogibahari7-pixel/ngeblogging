import "./studio-screenshot-polish-v288.css";

export const RELEASE = "studio-screenshot-polish-v288-20260805";
let frame = 0;

const shell = () => document.querySelector(".sn-shell[data-device-mode],.sn-shell");
const sidebar = () => document.getElementById("ngeblogging-studio-sidebar");
const reactToggle = () => document.querySelector(".sn-main>.sn-top>.sn-sidebar-toggle,.sn-top>.sn-sidebar-toggle");

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("aria-hidden");
  node.removeAttribute("inert");
}

function currentFamily() {
  return shell()?.dataset?.deviceMode === "large" ? "large" : "small";
}

function ensureHomeAddSite() {
  const welcome = document.querySelector(".sn-welcome");
  if (!welcome || welcome.querySelector("[data-v288-add-site]")) return;
  const actions = welcome.querySelector(":scope>div:last-child");
  if (!actions) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sn-add-site-v288";
  button.dataset.v288AddSite = RELEASE;
  button.textContent = "+ Tambahkan situs";
  button.setAttribute("aria-label", "Tambahkan situs");
  button.addEventListener("click", () => document.querySelector(".sn-workspace")?.click());
  actions.prepend(button);
}

function normalizeSidebar() {
  const side = sidebar();
  if (!side) return;
  reveal(side);
  side.style.removeProperty("visibility");
  side.style.removeProperty("opacity");
  const mark = side.querySelector(".sn-logo-mark");
  reveal(mark);
  const letter = mark?.querySelector("strong");
  if (letter) {
    letter.textContent = "n";
    letter.style.removeProperty("opacity");
    letter.style.removeProperty("filter");
    letter.style.removeProperty("color");
  }
  side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button").forEach((button) => {
    reveal(button);
    button.disabled = false;
  });
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    reveal(launcher);
    launcher.disabled = false;
    launcher.dataset.v288Floating = "fixed";
  }
  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  if (!panel) return;
  panel.dataset.v288Layout = currentFamily();
  panel.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-attachment-menu-wrap,.nara-select.intelligence,.nara-select.model").forEach(reveal);
  const close = panel.querySelector('button[aria-label="Tutup Nara"],button[title="Tutup"]');
  reveal(close);
  const menu = panel.querySelector(".nara-attachment-menu");
  if (menu) {
    reveal(menu);
    menu.dataset.v288AttachmentMenu = RELEASE;
  }
}

function normalizeThemeStudio() {
  const map = document.querySelector(".tn-layout-map-v264");
  if (map) map.dataset.v288LayoutMap = "viewport-fit-26-slot";
  document.querySelectorAll(".tn-layout-slot-v264,.tn-layout-popover-v264 button,.tn-code-workspace button,.tn-code-pane textarea").forEach((node) => {
    reveal(node);
    if ("disabled" in node) node.disabled = false;
  });
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    workspace.dataset.v288CodeLayout = currentFamily() === "large" ? "code-left-preview-right" : "preview-top-code-bottom";
  });
}

function normalizeContainment() {
  document.querySelectorAll(".sn-main,.sn-main>*,.sn-view-pad,.sn-view-pad>*,.sn-content-card,.sn-content-card>*,.sn-settings-grid,.sn-settings-grid>*,.tn-studio,.tn-studio>*,.tn-layout-studio,.tn-layout-map-v264,.tn-code-workspace,.tn-code-pane,.tn-code-preview-pane,.sv124-page,.sv124-page>*,.ce-app,.ce-app>*").forEach((node) => {
    node.style.setProperty("min-width", "0");
    node.style.setProperty("max-width", "100%");
  });
}

export function sync() {
  frame = 0;
  const app = shell();
  if (!app) return;
  document.documentElement.dataset.studioScreenshotPolishV288 = RELEASE;
  app.dataset.v288Family = currentFamily();
  normalizeSidebar();
  ensureHomeAddSite();
  normalizeNara();
  normalizeThemeStudio();
  normalizeContainment();
}

function schedule(delay = 0) {
  if (delay) {
    window.setTimeout(schedule, delay);
    return;
  }
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

function closeSmallDrawerAfterOutsideClick(event) {
  const side = sidebar();
  if (currentFamily() !== "small" || !side?.classList.contains("mobile-open")) return;
  if (event.target.closest?.("#ngeblogging-studio-sidebar")) return;
  if (event.target.closest?.(".nara-assistant-shell,.nara-floating-button,.sn-profile-menu-v287")) return;
  const toggle = reactToggle();
  if (toggle && !toggle.disabled) toggle.click();
}

function afterAnyClick() {
  schedule();
  schedule(60);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", closeSmallDrawerAfterOutsideClick, true);
  document.addEventListener("click", afterAnyClick, false);
  window.addEventListener("resize", () => schedule(60), { passive: true });
  window.addEventListener("orientationchange", () => schedule(100), { passive: true });
  window.addEventListener("pageshow", () => schedule(60), { passive: true });
  window.visualViewport?.addEventListener("resize", () => schedule(60), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { sync(); schedule(120); schedule(420); }, { once: true });
  else { sync(); schedule(120); schedule(420); }
}

/* v289 is the final geometry/containment pass and intentionally does not replace v287/v288 interactions. */
import("./studio-final-pass-v289.js").catch((error) => console.error("Studio v289 final pass failed to load", error));
