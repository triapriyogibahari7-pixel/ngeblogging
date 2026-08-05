import "./studio-final-authority-v288.css";

export const RELEASE = "studio-final-authority-v288-20260805";

let frame = 0;
let settling = 0;

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

function resolvedFamily() {
  const htmlMode = root().dataset.studioDeviceMode;
  if (htmlMode === "large" || htmlMode === "small") return htmlMode;
  const shellMode = shell()?.dataset?.deviceMode;
  if (shellMode === "large" || shellMode === "small") return shellMode;
  return Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) >= 761 ? "large" : "small";
}

function syncDeviceContract() {
  const app = shell();
  if (!app) return;
  const family = resolvedFamily();
  const responsiveMode = root().dataset.studioResponsiveMode || (family === "large" ? "desktop" : "mobile");
  const variant = root().dataset.studioDeviceVariant || responsiveMode;
  app.dataset.deviceMode = family;
  app.dataset.responsiveMode = responsiveMode;
  app.dataset.deviceVariant = variant;
  app.dataset.finalAuthorityV288 = RELEASE;
  root().dataset.studioFinalAuthorityV288 = RELEASE;
}

function syncSidebar() {
  const side = sidebar();
  if (!side) return;
  reveal(side);
  const family = resolvedFamily();
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
    if (letter) letter.textContent = "n";
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
  const top = document.querySelector(".sn-main>.sn-top");
  const actions = top?.querySelector(".sn-top-actions");
  const avatar = actions?.querySelector(".sn-avatar") || top?.querySelector(".sn-avatar");
  reveal(top);
  reveal(actions);
  reveal(avatar);
  if (avatar) {
    avatar.disabled = false;
    avatar.setAttribute("aria-haspopup", "menu");
    avatar.setAttribute("aria-label", "Buka menu profil");
  }
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  reveal(launcher);
  if (launcher) {
    launcher.disabled = false;
    launcher.dataset.v288Floating = "viewport";
  }

  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) return;
  const full = panel.dataset.naraSize === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.dataset.v288Interaction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  panel.setAttribute("aria-modal", String(full));
  const backdrop = layer.querySelector(":scope>.nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
    if (!full) backdrop.setAttribute("inert", "");
    else backdrop.removeAttribute("inert");
  }
  panel.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.model,.nara-select.intelligence,.nara-attachment-menu-wrap,.nara-composer-tools>button").forEach(reveal);
  if (!full) {
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
    root().style.removeProperty("overflow");
    document.body.style.removeProperty("overflow");
  }
}

function syncThemeStudio() {
  document.querySelectorAll(".tn-studio,.tn-theme-grid,.tn-layout-studio,.tn-layout-map-v264,.tn-widget-studio,.tn-code-workspace,.tn-code-pane,.tn-code-preview-pane").forEach(reveal);
  document.querySelectorAll(".tn-layout-slot-v264,.tn-layout-map-v264 button").forEach((button) => {
    reveal(button);
    button.disabled = false;
    button.removeAttribute("inert");
  });
  document.querySelectorAll(".tn-code-pane textarea").forEach((textarea) => {
    textarea.setAttribute("data-max-lines", "10000");
    textarea.setAttribute("spellcheck", "false");
  });
}

function syncContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*", ".sn-content-card", ".sn-content-card>*",
    ".ce-app", ".ce-app>*", ".tn-studio", ".tn-studio>*", ".tn-layout-studio", ".tn-code-workspace", ".tn-code-pane", ".tn-code-preview-pane",
    ".sv124-page", ".sv124-page>*", ".op41-host", ".op41-panel", ".op41-card",
  ].join(",")).forEach((node) => {
    node.style.setProperty("min-width", "0", "important");
    node.style.setProperty("max-width", "100%", "important");
  });
}

export function sync() {
  frame = 0;
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
  schedule(0);
  if (settling) clearTimeout(settling);
  settling = window.setTimeout(() => schedule(0), 120);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("resize", settle, { passive: true });
  window.addEventListener("orientationchange", settle, { passive: true });
  window.addEventListener("pageshow", settle, { passive: true });
  window.visualViewport?.addEventListener("resize", settle, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", settle);
  window.addEventListener("online", settle, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) settle(); });
  document.addEventListener("click", () => { schedule(0); schedule(90); }, false);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", settle, { once: true });
  else settle();
}

export { resolvedFamily, syncDeviceContract, syncNara, syncProfile, syncSidebar, syncThemeStudio };
