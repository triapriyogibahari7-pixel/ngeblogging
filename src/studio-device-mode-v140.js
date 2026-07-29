const RELEASE = "studio-device-mode-v140-20260729";
const MODE_EVENT = "ngeblogging:studio-device-mode-change";
const COMPACT_MAX = 760;
const HANDHELD_MAX = 820;

let frame = 0;

function positive(value, fallback = Number.POSITIVE_INFINITY) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function viewportMetrics() {
  const layoutWidth = positive(document.documentElement.clientWidth || window.innerWidth, 1);
  const layoutHeight = positive(document.documentElement.clientHeight || window.innerHeight, 1);
  const visualWidth = positive(window.visualViewport?.width, layoutWidth);
  const visualHeight = positive(window.visualViewport?.height, layoutHeight);
  const screenWidth = positive(window.screen?.width, layoutWidth);
  const screenHeight = positive(window.screen?.height, layoutHeight);

  return {
    layoutWidth,
    layoutHeight,
    visualWidth,
    visualHeight,
    screenWidth,
    screenHeight,
    effectiveWidth: Math.min(layoutWidth, visualWidth),
    physicalShortSide: Math.min(screenWidth, screenHeight),
  };
}

function handheldSignal() {
  return navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(
      navigator.userAgent || "",
    )
    || navigator.maxTouchPoints > 1
    || window.matchMedia?.("(pointer: coarse)")?.matches === true;
}

function surfaceMode() {
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches
    || window.navigator.standalone === true;
  return standalone ? "application" : "browser";
}

export function detectStudioDeviceMode() {
  const view = viewportMetrics();
  const compactViewport = view.effectiveWidth <= COMPACT_MAX;
  const physicalHandheld = handheldSignal() && view.physicalShortSide <= HANDHELD_MAX;
  return compactViewport || physicalHandheld ? "small" : "large";
}

export function currentStudioDeviceMode() {
  return document.documentElement.dataset.studioDeviceMode || detectStudioDeviceMode();
}

function applyDeviceMode() {
  const root = document.documentElement;
  const previous = root.dataset.studioDeviceMode || "";
  const view = viewportMetrics();
  const mode = detectStudioDeviceMode();

  root.dataset.studioDeviceMode = mode;
  root.dataset.studioSurfaceMode = surfaceMode();
  root.dataset.studioDeviceRelease = RELEASE;
  root.dataset.studioHandheldSignal = String(handheldSignal());
  root.dataset.studioDesktopSitePhone = String(mode === "small" && view.layoutWidth > COMPACT_MAX);
  root.style.setProperty("--studio-layout-width", `${view.layoutWidth}px`);
  root.style.setProperty("--studio-layout-height", `${view.layoutHeight}px`);
  root.style.setProperty("--studio-visual-width", `${view.visualWidth}px`);
  root.style.setProperty("--studio-visual-height", `${view.visualHeight}px`);

  document.querySelectorAll(".sn-shell").forEach((shell) => {
    shell.dataset.deviceAuthority = RELEASE;
    shell.dataset.navigationAuthority = "react-only-v140";
    shell.removeAttribute("data-v139-forced-mobile-open");
    shell.querySelectorAll(".sn-v139-forced-backdrop").forEach((node) => node.remove());
  });

  if (mode === "large") document.body?.classList.remove("sn-mobile-sidebar-open");

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

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) {
    scheduleDeviceMode();
  }
}).observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("resize", scheduleDeviceMode, { passive: true });
window.addEventListener("orientationchange", scheduleDeviceMode, { passive: true });
window.addEventListener("pageshow", scheduleDeviceMode, { passive: true });
window.visualViewport?.addEventListener("resize", scheduleDeviceMode, { passive: true });

applyDeviceMode();

export { RELEASE, MODE_EVENT, COMPACT_MAX };
