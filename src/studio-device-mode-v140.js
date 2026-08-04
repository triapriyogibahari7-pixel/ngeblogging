const RELEASE = "studio-device-mode-v254-20260804";
const LEGACY_RELEASE = "studio-device-mode-v188-20260801";
const MODE_EVENT = "ngeblogging:studio-device-mode-change";
const COMPACT_MAX = 760;
const TABLET_MAX = 1180;
const PHONE_MAX = 430;
const HANDHELD_MAX = 600;
const RESPONSIVE_MODES = Object.freeze([
  "application",
  "phone",
  "mobile",
  "compact",
  "tablet",
  "desktop",
]);

let frame = 0;
let lastSignature = "";

function finitePositive(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function mediaMatches(query) {
  try {
    return window.matchMedia?.(query)?.matches === true;
  } catch {
    return false;
  }
}

function standaloneSurface() {
  return mediaMatches("(display-mode: standalone)") || window.navigator.standalone === true;
}

function normalizedScreenDimension(raw, density, fallback) {
  const value = finitePositive(raw, fallback);
  if (value <= 900) return value;
  return density >= 1.25 ? value / density : fallback;
}

function viewportMetrics() {
  const layoutWidth = finitePositive(document.documentElement.clientWidth || window.innerWidth, 1);
  const layoutHeight = finitePositive(document.documentElement.clientHeight || window.innerHeight, 1);
  const visualWidth = finitePositive(window.visualViewport?.width, layoutWidth);
  const visualHeight = finitePositive(window.visualViewport?.height, layoutHeight);
  const density = finitePositive(window.devicePixelRatio, 1);
  const screenWidth = normalizedScreenDimension(window.screen?.width, density, layoutWidth);
  const screenHeight = normalizedScreenDimension(window.screen?.height, density, layoutHeight);
  const physicalShortSide = Math.min(screenWidth, screenHeight);
  const physicalLongSide = Math.max(screenWidth, screenHeight);
  const portrait = layoutHeight >= layoutWidth;
  const physicalViewportWidth = portrait ? physicalShortSide : physicalLongSide;
  const physicalViewportHeight = portrait ? physicalLongSide : physicalShortSide;

  return {
    layoutWidth,
    layoutHeight,
    visualWidth,
    visualHeight,
    density,
    screenWidth,
    screenHeight,
    physicalShortSide,
    physicalLongSide,
    physicalViewportWidth,
    physicalViewportHeight,
    effectiveWidth: Math.min(layoutWidth, visualWidth),
  };
}

function platformHandheldSignal() {
  const platform = `${navigator.userAgentData?.platform || ""} ${navigator.platform || ""}`;
  return /Android|iPhone|iPad|iPod|Linux arm|Mobile/i.test(platform);
}

function userAgentHandheldSignal() {
  const userAgent = navigator.userAgent || "";
  return navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(userAgent)
    || platformHandheldSignal();
}

function touchHandheldSignal(view) {
  const touchPoints = Number(navigator.maxTouchPoints || 0);
  const coarsePointer = mediaMatches("(pointer: coarse)") || mediaMatches("(any-pointer: coarse)");
  const finePointer = mediaMatches("(any-pointer: fine)");
  const compactPhysicalScreen = view.physicalShortSide <= HANDHELD_MAX && view.density >= 1.1;

  // Fallback untuk telepon yang menyamarkan user-agent ketika mode Situs desktop aktif.
  // Laptop sentuh tidak masuk karena sisi fisiknya lebih besar dan tetap memiliki pointer halus.
  return touchPoints > 1
    && coarsePointer
    && (platformHandheldSignal() || !finePointer || compactPhysicalScreen);
}

function handheldSignal(view) {
  return userAgentHandheldSignal() || touchHandheldSignal(view);
}

function desktopSiteRequested(view, handheld, installed = standaloneSurface()) {
  if (installed || !handheld) return false;
  return view.layoutWidth > view.physicalViewportWidth * 1.35;
}

function classifyPhysicalResponsiveMode(view, handheld, installed = standaloneSurface()) {
  if (installed) return "application";
  if (handheld && view.physicalShortSide <= PHONE_MAX) return "phone";
  if (handheld && view.physicalShortSide <= HANDHELD_MAX) return "mobile";
  if (handheld) return "tablet";
  if (view.effectiveWidth <= COMPACT_MAX) return "compact";
  if (view.effectiveWidth <= TABLET_MAX) return "tablet";
  return "desktop";
}

function classifyResponsiveMode(view, handheld, installed = standaloneSurface()) {
  if (desktopSiteRequested(view, handheld, installed)) return "desktop";
  return classifyPhysicalResponsiveMode(view, handheld, installed);
}

function desktopVariant(view, responsiveMode, desktopSitePhone = false) {
  if (desktopSitePhone) return "computer";
  if (responsiveMode !== "desktop") return responsiveMode;
  if (view.effectiveWidth <= 1536) return "laptop";
  return "computer";
}

function layoutMode(responsiveMode) {
  return ["application", "phone", "mobile", "compact"].includes(responsiveMode)
    ? "small"
    : "large";
}

export function detectStudioResponsiveMode() {
  const view = viewportMetrics();
  const handheld = handheldSignal(view);
  return classifyResponsiveMode(view, handheld);
}

export function currentStudioResponsiveMode() {
  const stored = document.documentElement.dataset.studioResponsiveMode;
  return RESPONSIVE_MODES.includes(stored) ? stored : detectStudioResponsiveMode();
}

export function detectStudioDeviceMode() {
  return layoutMode(detectStudioResponsiveMode());
}

export function currentStudioDeviceMode() {
  const stored = document.documentElement.dataset.studioDeviceMode;
  return stored === "small" || stored === "large" ? stored : detectStudioDeviceMode();
}

function ensureViewportMeta() {
  let viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement("meta");
    viewport.name = "viewport";
    document.head.prepend(viewport);
  }
  viewport.content = "width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content";
}

function applyDeviceMode() {
  frame = 0;
  const root = document.documentElement;
  const view = viewportMetrics();
  const handheld = handheldSignal(view);
  const installed = standaloneSurface();
  const physicalResponsiveMode = classifyPhysicalResponsiveMode(view, handheld, installed);
  const desktopSitePhone = desktopSiteRequested(view, handheld, installed);
  const responsiveMode = desktopSitePhone ? "desktop" : physicalResponsiveMode;
  const nextLayoutMode = layoutMode(responsiveMode);
  const variant = desktopVariant(view, responsiveMode, desktopSitePhone);
  const signature = [physicalResponsiveMode, responsiveMode, nextLayoutMode, variant, handheld, desktopSitePhone, Math.round(view.effectiveWidth)].join(":");
  const previousMode = root.dataset.studioResponsiveMode || "";

  ensureViewportMeta();
  root.dataset.studioResponsiveMode = responsiveMode;
  root.dataset.studioPhysicalResponsiveMode = physicalResponsiveMode;
  root.dataset.studioDeviceMode = nextLayoutMode;
  root.dataset.studioDeviceVariant = variant;
  root.dataset.studioSurfaceMode = installed ? "application" : "browser";
  root.dataset.studioHandheld = String(handheld);
  root.dataset.studioDesktopSitePhone = String(desktopSitePhone);
  root.dataset.studioSiteDesktop = String(responsiveMode === "desktop");
  root.dataset.studioDeviceRelease = RELEASE;
  root.dataset.studioDeviceLegacyRelease = LEGACY_RELEASE;
  root.style.setProperty("--studio-layout-width", `${view.layoutWidth}px`);
  root.style.setProperty("--studio-layout-height", `${view.layoutHeight}px`);
  root.style.setProperty("--studio-visual-width", `${view.visualWidth}px`);
  root.style.setProperty("--studio-visual-height", `${view.visualHeight}px`);
  root.style.setProperty("--studio-physical-width", `${view.physicalViewportWidth}px`);
  root.style.setProperty("--studio-physical-height", `${view.physicalViewportHeight}px`);

  if (lastSignature !== signature) {
    lastSignature = signature;
    window.dispatchEvent(new CustomEvent(MODE_EVENT, {
      detail: {
        mode: nextLayoutMode,
        responsiveMode,
        physicalResponsiveMode,
        variant,
        previous: previousMode,
        release: RELEASE,
        handheld,
        desktopSitePhone,
        ...view,
      },
    }));
  }
}

function schedule() {
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(applyDeviceMode);
}

window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) schedule();
});

applyDeviceMode();

export {
  RELEASE,
  LEGACY_RELEASE,
  MODE_EVENT,
  COMPACT_MAX,
  TABLET_MAX,
  RESPONSIVE_MODES,
  classifyPhysicalResponsiveMode,
  classifyResponsiveMode,
  desktopSiteRequested,
  layoutMode,
};