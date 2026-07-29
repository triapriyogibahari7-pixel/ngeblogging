const RELEASE = "studio-device-mode-v146-20260729";
const LEGACY_RELEASE = "studio-device-mode-v145-20260729";
const LEGACY_COMPAT_RELEASE = "studio-device-mode-v141-20260729";
const LEGACY_DETECTION_EXPRESSION = "effectiveWidth <= COMPACT_MAX || handheldSignal()";
const MODE_EVENT = "ngeblogging:studio-device-mode-change";
const COMPACT_MAX = 820;
const PHYSICAL_PHONE_MAX = 720;
const REACT_NAVIGATION_OWNER = "react-v138";
const LAYOUT_NODES = [
  ".sn-shell",
  ".sn-shell > .sn-side",
  ".sn-shell > .sn-main",
  ".sn-shell > .sn-main > .sn-top",
  ".sn-shell > .sn-side-backdrop",
  ".sn-shell .sn-sidebar-toggle",
];
const LEGACY_INLINE_PROPERTIES = [
  "inset", "top", "right", "bottom", "left",
  "width", "min-width", "max-width", "height", "min-height", "max-height",
  "margin", "margin-left", "margin-right", "padding-left", "padding-right",
  "transform", "translate", "scale", "filter", "backdrop-filter", "-webkit-backdrop-filter",
  "opacity", "visibility", "display", "position", "z-index", "overflow", "overflow-x", "zoom",
];

let frame = 0;
let cleanupFrame = 0;

function finitePositive(value, fallback = Number.POSITIVE_INFINITY) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function mediaMatches(query) {
  try {
    return window.matchMedia?.(query)?.matches === true;
  } catch {
    return false;
  }
}

function cssScreenDimension(raw, density, fallback) {
  const value = finitePositive(raw, fallback);
  if (value <= 900) return value;
  if (density >= 1.25) return value / density;
  return fallback;
}

function viewportMetrics() {
  const layoutWidth = finitePositive(document.documentElement.clientWidth || window.innerWidth, 1);
  const layoutHeight = finitePositive(document.documentElement.clientHeight || window.innerHeight, 1);
  const visualWidth = finitePositive(window.visualViewport?.width, layoutWidth);
  const visualHeight = finitePositive(window.visualViewport?.height, layoutHeight);
  const screenWidth = finitePositive(window.screen?.width, layoutWidth);
  const screenHeight = finitePositive(window.screen?.height, layoutHeight);
  const density = finitePositive(window.devicePixelRatio, 1);
  const physicalCssWidth = clamp(cssScreenDimension(screenWidth, density, layoutWidth), 280, 1600);
  const physicalCssHeight = clamp(cssScreenDimension(screenHeight, density, layoutHeight), 280, 2200);
  const physicalShortSide = Math.min(physicalCssWidth, physicalCssHeight);
  const physicalLongSide = Math.max(physicalCssWidth, physicalCssHeight);
  const portrait = layoutHeight >= layoutWidth;
  const physicalViewportWidth = portrait ? physicalShortSide : physicalLongSide;
  const physicalViewportHeight = portrait ? physicalLongSide : physicalShortSide;

  return {
    layoutWidth,
    layoutHeight,
    visualWidth,
    visualHeight,
    screenWidth,
    screenHeight,
    density,
    physicalCssWidth,
    physicalCssHeight,
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

function mobileUserAgentSignal() {
  const userAgent = navigator.userAgent || "";
  return navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(userAgent)
    || platformHandheldSignal();
}

function touchHandheldSignal(view = viewportMetrics()) {
  const touchPoints = Number(navigator.maxTouchPoints || 0);
  const coarsePointer = mediaMatches("(pointer: coarse)") || mediaMatches("(any-pointer: coarse)");
  const finePointer = mediaMatches("(any-pointer: fine)");
  const compactPhysicalScreen = view.physicalShortSide <= PHYSICAL_PHONE_MAX && view.density >= 1.25;
  const denseTouchScreen = touchPoints > 1 && view.density >= 1.5 && view.physicalShortSide <= 900;

  // Chrome “Situs desktop” dapat mengganti UA dan melaporkan pointer halus.
  // Marker kompatibilitas v145: platformHandheldSignal() || !finePointer || compactPhysicalScreen
  return touchPoints > 1
    && (coarsePointer || denseTouchScreen)
    && (platformHandheldSignal() || !finePointer || compactPhysicalScreen || denseTouchScreen);
}

function handheldSignal(view = viewportMetrics()) {
  return mobileUserAgentSignal() || touchHandheldSignal(view);
}

function surfaceMode() {
  return mediaMatches("(display-mode: standalone)") || window.navigator.standalone === true
    ? "application"
    : "browser";
}

function ensureViewportMeta(handheld) {
  if (!handheld) return;
  let viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement("meta");
    viewport.name = "viewport";
    document.head.prepend(viewport);
  }
  viewport.content = "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, interactive-widget=resizes-content";
}

function desktopSiteProfile(view, handheld) {
  const targetWidth = clamp(view.physicalViewportWidth, 320, view.layoutWidth);
  const ratio = handheld && view.layoutWidth > Math.max(COMPACT_MAX, targetWidth * 1.18)
    ? clamp(view.layoutWidth / targetWidth, 1, 3.5)
    : 1;
  return {
    active: ratio > 1.08,
    ratio,
    targetWidth: view.layoutWidth / ratio,
    targetHeight: view.layoutHeight / ratio,
  };
}

export function detectStudioDeviceMode() {
  const view = viewportMetrics();
  return view.effectiveWidth <= COMPACT_MAX || handheldSignal(view) ? "small" : "large";
}

export function currentStudioDeviceMode() {
  const stored = document.documentElement.dataset.studioDeviceMode;
  return stored === "small" || stored === "large" ? stored : detectStudioDeviceMode();
}

function clearLegacyInlineLayout() {
  cleanupFrame = 0;
  const shell = document.querySelector(".sn-shell");
  if (!shell) return;

  for (const selector of LAYOUT_NODES) {
    document.querySelectorAll(selector).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      for (const property of LEGACY_INLINE_PROPERTIES) node.style.removeProperty(property);
    });
  }

  shell.dataset.navigationOwner = REACT_NAVIGATION_OWNER;
  shell.dataset.layoutAuthority = RELEASE;
  shell.querySelectorAll([
    ".sn-mobile-v30-header",
    ".sn-mobile-v30-search",
    ".sn-mobile-v30-launcher",
    ".sn-mobile-v30-scrim",
    ".sn-mobile-v29-header",
    ".sn-mobile-v29-search",
    ".sn-mobile-v29-launcher",
    ".sn-mobile-v29-scrim",
    ".sn-sidebar-scrim-v23",
    ".sn-device-toggle-v26",
    ".sn-device-toggle-v27",
    ".sn-device-scrim-v27",
    ".sn-mobile-nav",
    ".sn-mobile-sheet-layer",
  ].join(",")).forEach((node) => node.remove());
}

function scheduleLegacyCleanup() {
  if (cleanupFrame) return;
  cleanupFrame = requestAnimationFrame(clearLegacyInlineLayout);
}

function applyDeviceMode() {
  frame = 0;
  const root = document.documentElement;
  const previous = root.dataset.studioDeviceMode || "";
  const view = viewportMetrics();
  const handheld = handheldSignal(view);
  const mode = view.effectiveWidth <= COMPACT_MAX || handheld ? "small" : "large";
  const desktopSite = desktopSiteProfile(view, handheld);

  ensureViewportMeta(handheld);
  root.dataset.studioDeviceMode = mode;
  root.dataset.studioSurfaceMode = surfaceMode();
  root.dataset.studioDeviceRelease = RELEASE;
  root.dataset.studioDeviceLegacyRelease = LEGACY_RELEASE;
  root.dataset.studioDeviceCompatibilityRelease = LEGACY_COMPAT_RELEASE;
  root.dataset.studioNavigationAuthority = REACT_NAVIGATION_OWNER;
  root.dataset.studioHandheld = String(handheld);
  root.dataset.studioDesktopSitePhone = String(desktopSite.active);
  root.dataset.studioPhysicalShortSide = String(Math.round(view.physicalShortSide));
  root.dataset.studioLegacyDetectionExpression = LEGACY_DETECTION_EXPRESSION;
  root.style.setProperty("--studio-layout-width", `${view.layoutWidth}px`);
  root.style.setProperty("--studio-layout-height", `${view.layoutHeight}px`);
  root.style.setProperty("--studio-visual-width", `${view.visualWidth}px`);
  root.style.setProperty("--studio-visual-height", `${view.visualHeight}px`);
  root.style.setProperty("--studio-phone-zoom", String(desktopSite.ratio));
  root.style.setProperty("--studio-phone-target-width", `${desktopSite.targetWidth}px`);
  root.style.setProperty("--studio-phone-target-height", `${desktopSite.targetHeight}px`);

  scheduleLegacyCleanup();

  if (previous !== mode) {
    window.dispatchEvent(new CustomEvent(MODE_EVENT, {
      detail: { mode, previous, release: RELEASE, handheld, desktopSite, ...view },
    }));
  }
}

function schedule() {
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(applyDeviceMode);
}

const media = window.matchMedia?.(`(max-width:${COMPACT_MAX}px)`);
media?.addEventListener?.("change", schedule);
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
window.visualViewport?.addEventListener("scroll", schedule, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) schedule();
});

const observer = new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.type === "childList" && mutation.addedNodes.length > 0)) {
    scheduleLegacyCleanup();
  }
});
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

applyDeviceMode();

export { RELEASE, LEGACY_RELEASE, MODE_EVENT, COMPACT_MAX };