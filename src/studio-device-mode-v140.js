const RELEASE = "studio-device-mode-v140-20260729";
const MODE_EVENT = "ngeblogging:studio-device-mode-change";
const COMPACT_MAX = 820;

let frame = 0;

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

  // Chrome's "Situs desktop" can replace the Android UA and expose a wide
  // layout viewport. A coarse-only multi-touch device is still a handheld.
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

function applyDeviceMode() {
  const root = document.documentElement;
  const previous = root.dataset.studioDeviceMode || "";
  const view = viewportMetrics();
  const mode = detectStudioDeviceMode();
  const handheld = handheldSignal();

  root.dataset.studioDeviceMode = mode;
  root.dataset.studioSurfaceMode = surfaceMode();
  root.dataset.studioDeviceRelease = RELEASE;
  root.dataset.studioHandheld = String(handheld);
  root.dataset.studioDesktopSitePhone = String(handheld && view.layoutWidth > COMPACT_MAX);
  root.style.setProperty("--studio-layout-width", `${view.layoutWidth}px`);
  root.style.setProperty("--studio-layout-height", `${view.layoutHeight}px`);
  root.style.setProperty("--studio-visual-width", `${view.visualWidth}px`);
  root.style.setProperty("--studio-visual-height", `${view.visualHeight}px`);

  if (previous !== mode) {
    window.dispatchEvent(new CustomEvent(MODE_EVENT, {
      detail: { mode, previous, release: RELEASE },
    }));
  }
}

function scheduleDeviceMode() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(applyDeviceMode);
}

window.addEventListener("resize", scheduleDeviceMode, { passive: true });
window.addEventListener("orientationchange", scheduleDeviceMode, { passive: true });
window.addEventListener("pageshow", scheduleDeviceMode, { passive: true });
window.visualViewport?.addEventListener("resize", scheduleDeviceMode, { passive: true });
window.visualViewport?.addEventListener("scroll", scheduleDeviceMode, { passive: true });

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) scheduleDeviceMode();
});

applyDeviceMode();

export { RELEASE, MODE_EVENT, COMPACT_MAX };