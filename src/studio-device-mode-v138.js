const RELEASE = "studio-device-modes-v138-20260729";
const SMALL_MAX = 700;
const HANDHELD_MAX = 760;
const MODE_EVENT = "ngeblogging:studio-device-mode-change";

let frame = 0;

function positive(value, fallback = Number.POSITIVE_INFINITY) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function viewportMetrics() {
  const layoutWidth = positive(
    document.documentElement.clientWidth || window.innerWidth,
  );
  const visualWidth = positive(window.visualViewport?.width);
  const visualScale = positive(window.visualViewport?.scale, 1);
  const screenWidth = positive(window.screen?.width);
  const screenHeight = positive(window.screen?.height);
  const shortestScreenSide = Math.min(screenWidth, screenHeight);
  const visualPhysicalWidth = visualWidth * Math.min(visualScale, 1);
  const effectiveWidth = Math.min(layoutWidth, visualWidth, visualPhysicalWidth);

  return {
    layoutWidth,
    visualWidth,
    visualScale,
    screenWidth,
    screenHeight,
    shortestScreenSide,
    effectiveWidth,
  };
}

function handheldSignal() {
  return navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(
      navigator.userAgent || "",
    )
    || window.matchMedia?.("(pointer: coarse)")?.matches === true
    || navigator.maxTouchPoints > 1;
}

function surfaceMode() {
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches
    || window.navigator.standalone === true;
  return standalone ? "application" : "browser";
}

export function detectStudioDeviceMode() {
  const metrics = viewportMetrics();
  const compactViewport = metrics.effectiveWidth <= SMALL_MAX;
  const compactHandheld = handheldSignal()
    && metrics.shortestScreenSide <= HANDHELD_MAX;
  return compactViewport || compactHandheld ? "small" : "large";
}

export function currentStudioDeviceMode() {
  return document.documentElement.dataset.studioDeviceMode
    || detectStudioDeviceMode();
}

function applyDeviceMode() {
  const root = document.documentElement;
  const previous = root.dataset.studioDeviceMode || "";
  const metrics = viewportMetrics();
  const mode = detectStudioDeviceMode();

  root.dataset.studioDeviceMode = mode;
  root.dataset.studioSurfaceMode = surfaceMode();
  root.dataset.studioDeviceRelease = RELEASE;
  root.style.setProperty("--studio-layout-viewport-width", `${metrics.layoutWidth}px`);
  root.style.setProperty("--studio-effective-viewport-width", `${metrics.effectiveWidth}px`);
  root.style.setProperty("--studio-visual-scale", String(metrics.visualScale));

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

applyDeviceMode();
window.addEventListener("resize", scheduleDeviceMode, { passive: true });
window.addEventListener("orientationchange", scheduleDeviceMode, { passive: true });
window.addEventListener("pageshow", scheduleDeviceMode, { passive: true });
window.visualViewport?.addEventListener("resize", scheduleDeviceMode, { passive: true });
window.visualViewport?.addEventListener("scroll", scheduleDeviceMode, { passive: true });

export { RELEASE, SMALL_MAX, MODE_EVENT };
