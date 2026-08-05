import "./studio-final-pass-v289.css";

export const RELEASE = "studio-final-pass-v289-20260805";
let frame = 0;
let settleTimer = 0;

const root = () => document.documentElement;
const shell = () => document.querySelector(".sn-shell");
const sidebar = () => document.getElementById("ngeblogging-studio-sidebar");

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("aria-hidden");
  node.removeAttribute("inert");
}

export function currentFamily() {
  const htmlMode = root().dataset.studioDeviceMode;
  if (htmlMode === "large" || htmlMode === "small") return htmlMode;
  const shellMode = shell()?.dataset?.deviceMode;
  if (shellMode === "large" || shellMode === "small") return shellMode;
  return Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) >= 761 ? "large" : "small";
}

function syncDeviceContract() {
  const app = shell();
  if (!app) return;
  const family = currentFamily();
  const responsiveMode = root().dataset.studioResponsiveMode || app.dataset.responsiveMode || (family === "large" ? "desktop" : "mobile");
  const variant = root().dataset.studioDeviceVariant || app.dataset.deviceVariant || responsiveMode;
  app.dataset.deviceMode = family;
  app.dataset.responsiveMode = responsiveMode;
  app.dataset.deviceVariant = variant;
  app.dataset.finalPassV289 = RELEASE;
  root().dataset.studioFinalPassV289 = RELEASE;
}

function syncSidebar() {
  const side = sidebar();
  if (!side) return;
  reveal(side);
  const family = currentFamily();
  const mobileOpen = family === "small" && side.classList.contains("mobile-open");
  if (family === "large") {
    side.classList.remove("mobile-open");
    document.body.classList.remove("sn-mobile-sidebar-open");
  } else {
    document.body.classList.toggle("sn-mobile-sidebar-open", mobileOpen);
  }

  const mark = side.querySelector(".sn-logo-mark");
  reveal(mark);
  if (mark) {
    const expanded = family === "large" ? !side.classList.contains("collapsed") : mobileOpen;
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    mark.setAttribute("aria-expanded", String(expanded));
    mark.setAttribute("aria-label", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
    mark.setAttribute("title", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
    const letter = mark.querySelector("strong");
    if (letter) {
      letter.textContent = "n";
      letter.style.removeProperty("opacity");
      letter.style.removeProperty("filter");
      letter.style.removeProperty("color");
    }
  }
  const brand = side.querySelector(":scope>.sn-logo>b");
  if (brand) brand.textContent = "Ngeblogging";
  side.querySelectorAll(":scope>.sn-new,:scope>nav>button,:scope>.sn-account-footer>button").forEach((button) => {
    reveal(button);
    button.disabled = false;
    const label = button.querySelector("span")?.textContent?.trim() || button.textContent?.trim() || "Menu";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });
}

function syncProfile() {
  const avatar = document.querySelector(".sn-main>.sn-top .sn-avatar");
  reveal(avatar);
  if (!avatar) return;
  avatar.disabled = false;
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-label", "Buka menu profil");
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  reveal(launcher);
  if (launcher) {
    launcher.disabled = false;
    launcher.dataset.v289Floating = "viewport";
  }
  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) return;
  const full = panel.dataset.naraSize === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.dataset.v289Interaction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  panel.setAttribute("aria-modal", String(full));
  panel.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.model,.nara-select.intelligence,.nara-attachment-menu-wrap,.nara-composer-tools>button").forEach(reveal);
  const backdrop = layer.querySelector(":scope>.nara-assistant-backdrop");
  if (backdrop && !full) {
    backdrop.hidden = true;
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.setAttribute("inert", "");
  } else if (backdrop) {
    backdrop.removeAttribute("inert");
  }
  if (!full) {
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
    root().style.removeProperty("overflow");
    document.body.style.removeProperty("overflow");
  }
}

function syncThemeStudio() {
  document.querySelectorAll(".tn-studio,.tn-theme-grid,.tn-layout-studio,.tn-layout-map-v264,.tn-widget-studio,.tn-code-workspace,.tn-code-pane,.tn-code-preview-pane").forEach(reveal);
  document.querySelectorAll(".tn-layout-slot-v264,.tn-layout-popover-v264 button,.tn-code-workspace button").forEach((button) => {
    reveal(button);
    if ("disabled" in button) button.disabled = false;
  });
  document.querySelectorAll(".tn-code-pane textarea").forEach((textarea) => {
    textarea.setAttribute("data-max-lines", "10000");
    textarea.setAttribute("spellcheck", "false");
  });
}

function syncContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*", ".sn-content-card", ".sn-content-card>*",
    ".sn-settings-grid", ".sn-settings-grid>*", ".ce-app", ".ce-app>*", ".tn-studio", ".tn-studio>*",
    ".tn-layout-studio", ".tn-code-workspace", ".tn-code-pane", ".tn-code-preview-pane", ".sv124-page", ".sv124-page>*",
  ].join(",")).forEach((node) => {
    node.style.setProperty("min-width", "0", "important");
    node.style.setProperty("max-width", "100%", "important");
  });
}

export function sync() {
  frame = 0;
  if (!shell()) return;
  syncDeviceContract();
  syncSidebar();
  syncProfile();
  syncNara();
  syncThemeStudio();
  syncContainment();
}

function schedule(delay = 0) {
  if (delay > 0) {
    window.setTimeout(() => schedule(0), delay);
    return;
  }
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

function settle() {
  schedule();
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = window.setTimeout(() => schedule(), 120);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("resize", settle, { passive: true });
  window.addEventListener("orientationchange", settle, { passive: true });
  window.addEventListener("pageshow", settle, { passive: true });
  window.visualViewport?.addEventListener("resize", settle, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", settle);
  window.addEventListener("online", settle, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) settle(); });
  document.addEventListener("click", () => { schedule(); schedule(80); }, false);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { sync(); schedule(120); schedule(420); }, { once: true });
  else { sync(); schedule(120); schedule(420); }
}
