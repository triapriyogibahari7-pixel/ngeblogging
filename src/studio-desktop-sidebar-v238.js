import "./studio-desktop-sidebar-v238.css";

export const RELEASE = "studio-desktop-sidebar-v238-20260803";
const MODE_EVENT = "ngeblogging:studio-device-mode-change";
const SMALL_RESPONSIVE = new Set(["application", "phone", "mobile", "compact"]);
const LARGE_RESPONSIVE = new Set(["tablet", "desktop"]);
const PHONE_MAX = 430;
const MOBILE_MAX = 600;
const LARGE_TABLET_MIN = 700;

let frame = 0;
let lastSignature = "";

function finite(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizedScreen(value, density, fallback) {
  const numeric = finite(value, fallback);
  if (numeric <= 900) return numeric;
  return density >= 1.25 ? numeric / density : fallback;
}

function handheldSignal(shortSide) {
  const ua = navigator.userAgent || "";
  const platform = `${navigator.userAgentData?.platform || ""} ${navigator.platform || ""}`;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches === true || window.matchMedia?.("(any-pointer: coarse)")?.matches === true;
  return navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)
    || /Android|iPhone|iPad|iPod|Linux arm|Mobile/i.test(platform)
    || (Number(navigator.maxTouchPoints || 0) > 1 && coarse && shortSide <= 900);
}

function metrics() {
  const root = document.documentElement;
  const layoutWidth = finite(root.clientWidth || innerWidth, 1);
  const layoutHeight = finite(root.clientHeight || innerHeight, 1);
  const visualWidth = finite(window.visualViewport?.width, layoutWidth);
  const visualHeight = finite(window.visualViewport?.height, layoutHeight);
  const density = Math.max(1, finite(devicePixelRatio, 1));
  const screenWidth = normalizedScreen(screen?.width, density, layoutWidth);
  const screenHeight = normalizedScreen(screen?.height, density, layoutHeight);
  const shortSide = Math.min(screenWidth, screenHeight);
  const longSide = Math.max(screenWidth, screenHeight);
  const portrait = layoutHeight >= layoutWidth;
  const physicalViewportWidth = portrait ? shortSide : longSide;
  const handheld = handheldSignal(shortSide) || root.dataset.studioHandheld === "true";
  const detectedDesktopSite = handheld && layoutWidth > physicalViewportWidth * 1.35;
  const desktopSitePhone = root.dataset.studioDesktopSitePhone === "true"
    || root.dataset.v232ModeLock === "desktop-site-large"
    || detectedDesktopSite;
  const existingResponsive = root.dataset.studioResponsiveMode || "";
  const existingVariant = root.dataset.studioDeviceVariant || "";
  const largeTablet = handheld && shortSide >= LARGE_TABLET_MIN && !desktopSitePhone;

  let responsiveMode = existingResponsive;
  let variant = existingVariant;
  let family = "small";

  if (desktopSitePhone) {
    responsiveMode = "desktop";
    variant = "desktop";
    family = "large";
  } else if (largeTablet) {
    responsiveMode = "tablet";
    variant = "tablet";
    family = "large";
  } else if (!handheld && (LARGE_RESPONSIVE.has(existingResponsive) || layoutWidth > 760)) {
    family = "large";
    if (!responsiveMode) responsiveMode = layoutWidth <= 1180 ? "tablet" : "desktop";
    if (!variant) variant = responsiveMode === "desktop" ? (layoutWidth <= 1536 ? "laptop" : "computer") : responsiveMode;
  } else {
    family = "small";
    if (!SMALL_RESPONSIVE.has(responsiveMode)) {
      responsiveMode = shortSide <= PHONE_MAX ? "phone" : shortSide <= MOBILE_MAX ? "mobile" : "compact";
      variant = responsiveMode;
    }
  }

  return {
    root,
    layoutWidth,
    layoutHeight,
    visualWidth,
    visualHeight,
    shortSide,
    longSide,
    handheld,
    desktopSitePhone,
    largeTablet,
    responsiveMode,
    variant,
    family,
  };
}

function applyMode(state) {
  const { root, family, responsiveMode, variant, desktopSitePhone } = state;
  root.dataset.studioDesktopSidebarV238 = RELEASE;
  root.dataset.v238Family = family;
  root.dataset.v238DesktopSitePhone = String(desktopSitePhone);
  root.dataset.v238LargeTablet = String(state.largeTablet);
  root.dataset.studioDeviceMode = family;
  root.dataset.studioResponsiveMode = responsiveMode;
  root.dataset.studioDeviceVariant = variant;
  root.dataset.studioSiteDesktop = String(responsiveMode === "desktop");
  root.dataset.v235Family = family;
  root.dataset.v236Family = family;
  root.dataset.v237Family = family;

  const signature = [family, responsiveMode, variant, desktopSitePhone, state.largeTablet, Math.round(state.layoutWidth), Math.round(state.visualWidth)].join(":");
  if (signature === lastSignature) return;
  const previous = lastSignature;
  lastSignature = signature;
  window.dispatchEvent(new CustomEvent(MODE_EVENT, {
    detail: {
      mode: family,
      responsiveMode,
      variant,
      previous,
      release: RELEASE,
      handheld: state.handheld,
      desktopSitePhone,
      largeTablet: state.largeTablet,
      layoutWidth: state.layoutWidth,
      layoutHeight: state.layoutHeight,
      visualWidth: state.visualWidth,
      visualHeight: state.visualHeight,
    },
  }));
}

function syncSidebar(state) {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const main = document.querySelector(".sn-main");
  if (!sidebar || !main) return;

  sidebar.dataset.v238Family = state.family;
  sidebar.dataset.v238Navigation = state.family === "large" ? "single-internal-n-toggle" : "single-n-drawer";
  main.dataset.v238Content = "sidebar-aware";
  main.removeAttribute("inert");
  main.style.removeProperty("filter");

  const internalN = sidebar.querySelector(".sn-logo-mark");
  if (internalN) {
    internalN.dataset.v238InternalN = "visible-toggle";
    internalN.hidden = false;
    internalN.removeAttribute("inert");
    internalN.removeAttribute("aria-hidden");
    internalN.setAttribute("role", "button");
    internalN.setAttribute("tabindex", "0");
    internalN.setAttribute("aria-label", state.family === "large"
      ? (sidebar.classList.contains("collapsed") ? "Buka menu Studio" : "Tutup menu Studio")
      : "Tutup menu Studio");
  }

  document.querySelectorAll(".sn-side-backdrop").forEach((backdrop) => {
    backdrop.dataset.v238Backdrop = "outside-only";
    backdrop.style.setProperty("backdrop-filter", "none", "important");
    backdrop.style.setProperty("-webkit-backdrop-filter", "none", "important");
    backdrop.style.setProperty("filter", "none", "important");
  });
}

function syncSurfaces(state) {
  document.querySelectorAll(".sn-avatar").forEach((avatar) => {
    avatar.dataset.v238Profile = "avatar-menu";
    avatar.hidden = false;
    avatar.removeAttribute("inert");
  });
  document.querySelectorAll("[data-studio-mode-badge],[data-device-mode-badge],.studio-device-mode-badge,.v225-mode-badge").forEach((node) => {
    node.hidden = true;
    node.style.setProperty("display", "none", "important");
  });
  document.querySelectorAll(".sv124-domain-page,.sn-domain-page").forEach((page) => {
    page.dataset.v238Domain = state.family === "small" ? "stacked-horizontal-actions" : "large-actions";
  });
  document.querySelectorAll(".tn-studio").forEach((studio) => studio.dataset.v238Theme = "visible-100");
  document.querySelectorAll("#ngeblogging-layout-map,.tn-layout-studio[data-v226-layout-source]").forEach((map) => map.dataset.v238Layout = "interactive-map");
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    workspace.dataset.v238Code = state.family === "small" ? "preview-top-code-bottom" : "code-left-preview-right";
  });
  document.querySelectorAll(".nara-assistant-shell").forEach((shell) => {
    shell.dataset.v238Family = state.family;
    shell.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.intelligence,.nara-select.model,.nara-attachment-menu-wrap").forEach((control) => {
      control.hidden = false;
      control.removeAttribute("inert");
      control.removeAttribute("aria-hidden");
      control.dataset.v238NaraControl = "visible";
    });
    const plus = shell.querySelector(".nara-attachment-menu-wrap>button");
    if (plus) {
      plus.dataset.v238Attachment = "camera-photo-file";
      plus.hidden = false;
      plus.removeAttribute("inert");
      plus.setAttribute("aria-label", "Tambah kamera, foto, atau file");
    }
  });
  document.querySelectorAll(".v235-nara-attachment-portal").forEach((portal) => portal.dataset.v238Portal = "viewport-safe");
}

function sync() {
  frame = 0;
  const state = metrics();
  applyMode(state);
  syncSidebar(state);
  syncSurfaces(state);
}

function schedule() {
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    "class",
    "hidden",
    "data-nara-size",
    "data-studio-device-mode",
    "data-studio-responsive-mode",
    "data-studio-device-variant",
    "data-studio-desktop-site-phone",
    "data-v235-family",
    "data-v236-family",
    "data-v237-family"
  ],
});
for (const eventName of ["resize", "orientationchange", "pageshow"]) window.addEventListener(eventName, schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

sync();
