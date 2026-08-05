import "./studio-device-shell-v290.css";

export const RELEASE = "studio-device-shell-v290-20260805";
const SMALL_MODES = new Set(["application", "phone", "mobile", "compact"]);
const LARGE_MODES = new Set(["tablet", "desktop", "laptop", "computer"]);
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

function removeInlineGeometry(node) {
  if (!node) return;
  for (const property of ["zoom", "transform", "transform-origin", "filter", "left", "right", "inset", "max-width", "min-width"]) {
    node.style.removeProperty(property);
  }
}

export function resolvedFamily() {
  const html = root();
  const responsive = html.dataset.studioResponsiveMode || shell()?.dataset?.responsiveMode || "";
  if (SMALL_MODES.has(responsive)) return "small";
  if (LARGE_MODES.has(responsive)) return "large";
  if (html.dataset.studioDesktopSitePhone === "true" || html.dataset.studioSiteDesktop === "true") return "large";
  const deviceMode = html.dataset.studioDeviceMode || shell()?.dataset?.deviceMode || "";
  if (deviceMode === "large" || deviceMode === "small") return deviceMode;
  return Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) >= 761 ? "large" : "small";
}

function clearRetiredRuntimeResidue() {
  const html = root();
  // These attributes belonged to retired v188-v193 JS owners. Leaving them on
  // the root allows their historical CSS backups to re-enter the cascade.
  for (const key of [
    "studioPhysicalMobileV188", "studioPhysicalMobileV189", "studioPhysicalMobileV190", "studioPhysicalMobileV191",
    "studioDesktopSitePhoneV188", "studioDesktopSitePhoneV189", "studioDesktopSitePhoneV190", "studioDesktopSitePhoneV191",
    "studioScreenshotRecoveryV191", "studioScreenshotRecoveryV193", "studioViewportCalibrationV190",
  ]) delete html.dataset[key];

  removeInlineGeometry(document.body);
  removeInlineGeometry(document.getElementById("root"));
}

function syncSidebar(family) {
  const side = sidebar();
  if (!side) return;
  reveal(side);
  side.dataset.v290Family = family;
  side.style.removeProperty("display");
  side.style.removeProperty("visibility");
  side.style.removeProperty("opacity");
  side.style.removeProperty("filter");
  side.style.removeProperty("transform");

  const mark = side.querySelector(".sn-logo-mark");
  reveal(mark);
  if (mark) {
    mark.style.removeProperty("pointer-events");
    mark.style.removeProperty("visibility");
    mark.style.removeProperty("opacity");
    mark.style.removeProperty("filter");
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    const expanded = family === "large" ? !side.classList.contains("collapsed") : side.classList.contains("mobile-open");
    mark.setAttribute("aria-expanded", String(expanded));
    mark.setAttribute("aria-label", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
    mark.setAttribute("title", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
    const letter = mark.querySelector("strong");
    if (letter) {
      letter.textContent = "n";
      letter.style.removeProperty("color");
      letter.style.removeProperty("opacity");
      letter.style.removeProperty("filter");
    }
  }

  const brand = side.querySelector(":scope>.sn-logo>b");
  if (brand) brand.textContent = "Ngeblogging";

  side.querySelectorAll(":scope>.sn-new,:scope>nav>button,:scope>.sn-account-footer>button").forEach((button) => {
    reveal(button);
    button.disabled = false;
    button.style.removeProperty("pointer-events");
  });

  if (family === "large") {
    side.classList.remove("mobile-open");
    document.body.classList.remove("sn-mobile-sidebar-open");
  } else {
    document.body.classList.toggle("sn-mobile-sidebar-open", side.classList.contains("mobile-open"));
  }
}

function syncProfile() {
  const profile = document.querySelector(".sn-main>.sn-top .sn-avatar");
  if (!profile) return;
  reveal(profile);
  profile.disabled = false;
  profile.style.removeProperty("display");
  profile.style.removeProperty("visibility");
  profile.style.removeProperty("opacity");
  profile.style.removeProperty("pointer-events");
  profile.setAttribute("aria-haspopup", "menu");
  profile.setAttribute("aria-label", "Buka menu profil");
}

function syncNara(family) {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    reveal(launcher);
    launcher.disabled = false;
    launcher.dataset.v290Floating = "viewport-corner";
    launcher.style.removeProperty("position");
    launcher.style.removeProperty("left");
    launcher.style.removeProperty("top");
    launcher.style.removeProperty("transform");
    launcher.style.removeProperty("animation");
  }

  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) return;
  const full = panel.dataset.naraSize === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.dataset.v290Interaction = full ? "modal" : "nonmodal";
  panel.dataset.v290Family = family;
  layer.setAttribute("aria-modal", String(full));
  panel.setAttribute("aria-modal", String(full));

  panel.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.model,.nara-select.intelligence,.nara-attachment-menu-wrap,.nara-composer-tools>button").forEach(reveal);
  const attachmentMenu = panel.querySelector(".nara-attachment-menu");
  if (attachmentMenu) {
    reveal(attachmentMenu);
    attachmentMenu.dataset.v290Popover = "above-composer";
  }

  const backdrop = layer.querySelector(":scope>.nara-assistant-backdrop");
  if (backdrop && !full) {
    backdrop.hidden = true;
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.setAttribute("inert", "");
    backdrop.style.pointerEvents = "none";
  } else if (backdrop) {
    backdrop.removeAttribute("inert");
    backdrop.style.removeProperty("pointer-events");
  }

  if (!full) {
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
    root().style.removeProperty("overflow");
    root().style.removeProperty("touch-action");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
  }
}

function syncThemeCode(family) {
  document.querySelectorAll(".tn-studio,.tn-theme-grid,.tn-layout-studio,.tn-layout-map-v264,.tn-widget-studio,.tn-code-workspace,.tn-code-pane,.tn-code-preview-pane").forEach(reveal);
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    workspace.dataset.v290CodeLayout = family === "large" ? "code-left-preview-right" : "preview-top-code-bottom";
  });
  document.querySelectorAll(".tn-code-pane textarea").forEach((textarea) => {
    textarea.setAttribute("data-max-lines", "10000");
    textarea.setAttribute("spellcheck", "false");
  });
}

function syncContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*", ".sn-content-card", ".sn-content-card>*",
    ".sn-settings-grid", ".sn-settings-grid>*", ".tn-studio", ".tn-studio>*", ".tn-layout-studio", ".tn-layout-map-v264",
    ".tn-code-workspace", ".tn-code-pane", ".tn-code-preview-pane", ".ce-app", ".ce-app>*", ".sv124-page", ".sv124-page>*",
  ].join(",")).forEach((node) => {
    node.style.setProperty("min-width", "0", "important");
    node.style.setProperty("max-width", "100%", "important");
  });
}

export function sync() {
  frame = 0;
  const app = shell();
  if (!app) return;
  clearRetiredRuntimeResidue();
  const family = resolvedFamily();
  root().dataset.studioDeviceShellV290 = RELEASE;
  root().dataset.studioV290Family = family;
  app.dataset.v290Family = family;
  app.dataset.deviceMode = family;
  syncSidebar(family);
  syncProfile();
  syncNara(family);
  syncThemeCode(family);
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
  document.addEventListener("click", () => { schedule(); schedule(70); }, false);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { sync(); schedule(120); schedule(360); }, { once: true });
  else { sync(); schedule(120); schedule(360); }
}
