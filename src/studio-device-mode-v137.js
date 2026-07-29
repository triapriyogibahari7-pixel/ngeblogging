const RELEASE = "studio-device-modes-v137-20260729";
const SMALL_MAX = 700;
let cssPromise = null;
let frame = 0;

function viewportWidth() {
  const visualWidth = Number(window.visualViewport?.width || 0);
  const layoutWidth = Number(document.documentElement.clientWidth || window.innerWidth || 0);
  return Math.max(1, Math.round(visualWidth || layoutWidth));
}

function surfaceMode() {
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches
    || window.navigator.standalone === true;
  return standalone ? "application" : "browser";
}

function syncDeviceMode() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const width = viewportWidth();
    const mode = width <= SMALL_MAX ? "small" : "large";
    const root = document.documentElement;
    root.dataset.studioDeviceMode = mode;
    root.dataset.studioSurfaceMode = surfaceMode();
    root.dataset.studioDeviceRelease = RELEASE;
    root.style.setProperty("--studio-viewport-width", `${width}px`);
  });
}

function loadFinalAuthority() {
  if (!cssPromise) {
    cssPromise = new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      .then(() => import("./studio-device-modes-v137.css"))
      .catch((error) => console.error("Studio device authority failed", error));
  }
  return cssPromise;
}

function start() {
  loadFinalAuthority();
  syncDeviceMode();
  window.addEventListener("resize", syncDeviceMode, { passive: true });
  window.addEventListener("orientationchange", syncDeviceMode, { passive: true });
  window.addEventListener("pageshow", syncDeviceMode, { passive: true });
  window.visualViewport?.addEventListener("resize", syncDeviceMode, { passive: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
