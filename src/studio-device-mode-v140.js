const RELEASE = "studio-device-mode-v141-20260729";
const MODE_EVENT = "ngeblogging:studio-device-mode-change";
const COMPACT_MAX = 820;
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
  "opacity", "visibility", "display", "position", "z-index", "overflow", "overflow-x",
];

let frame = 0;
let cleanupFrame = 0;

function finitePositive(value, fallback = Number.POSITIVE_INFINITY) {
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

function viewportMetrics() {
  const layoutWidth = finitePositive(document.documentElement.clientWidth || window.innerWidth, 1);
  const layoutHeight = finitePositive(document.documentElement.clientHeight || window.innerHeight, 1);
  const visualWidth = finitePositive(window.visualViewport?.width, layoutWidth);
  const visualHeight = finitePositive(window.visualViewport?.height, layoutHeight);
  const screenWidth = finitePositive(window.screen?.width, layoutWidth);
  const screenHeight = finitePositive(window.screen?.height, layoutHeight);

  return {
    layoutWidth,
    layoutHeight,
    visualWidth,
    visualHeight,
    screenWidth,
    screenHeight,
    effectiveWidth: Math.min(layoutWidth, visualWidth),
  };
}

function mobileUserAgentSignal() {
  const userAgent = navigator.userAgent || "";
  return navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(userAgent);
}

function touchHandheldSignal() {
  const touchPoints = Number(navigator.maxTouchPoints || 0);
  const coarsePointer = mediaMatches("(pointer: coarse)") || mediaMatches("(any-pointer: coarse)");
  const finePointer = mediaMatches("(any-pointer: fine)");

  // Chrome "Situs desktop" dapat mengganti UA Android dan membuat viewport
  // sangat lebar. Perangkat multi-touch dengan pointer coarse tanpa pointer fine
  // tetap diperlakukan sebagai perangkat genggam.
  return touchPoints > 1 && coarsePointer && !finePointer;
}

function handheldSignal() {
  return mobileUserAgentSignal() || touchHandheldSignal();
}

function surfaceMode() {
  return mediaMatches("(display-mode: standalone)") || window.navigator.standalone === true
    ? "application"
    : "browser";
}

export function detectStudioDeviceMode() {
  const view = viewportMetrics();
  return view.effectiveWidth <= COMPACT_MAX || handheldSignal() ? "small" : "large";
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

  // Jangan ganti nilai ini menjadi react-v140/v141. Bridge Komentar, Domain,
  // API Keys, dan sidebar lama memakai kontrak react-v138 untuk berhenti bekerja.
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
  const handheld = handheldSignal();
  const mode = view.effectiveWidth <= COMPACT_MAX || handheld ? "small" : "large";

  root.dataset.studioDeviceMode = mode;
  root.dataset.studioSurfaceMode = surfaceMode();
  root.dataset.studioDeviceRelease = RELEASE;
  root.dataset.studioNavigationAuthority = REACT_NAVIGATION_OWNER;
  root.dataset.studioHandheld = String(handheld);
  root.dataset.studioDesktopSitePhone = String(handheld && view.layoutWidth > COMPACT_MAX);
  root.style.setProperty("--studio-layout-width", `${view.layoutWidth}px`);
  root.style.setProperty("--studio-layout-height", `${view.layoutHeight}px`);
  root.style.setProperty("--studio-visual-width", `${view.visualWidth}px`);
  root.style.setProperty("--studio-visual-height", `${view.visualHeight}px`);

  scheduleLegacyCleanup();

  if (previous !== mode) {
    window.dispatchEvent(new CustomEvent(MODE_EVENT, {
      detail: { mode, previous, release: RELEASE, handheld, ...view },
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

export { RELEASE, MODE_EVENT, COMPACT_MAX };