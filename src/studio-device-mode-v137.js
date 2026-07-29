import "./studio-device-modes-v137.css";

const RELEASE = "studio-device-modes-v138-20260729";
const SMALL_QUERY = "(max-width: 700px)";
let frame = 0;

function surfaceMode() {
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches
    || window.navigator.standalone === true;
  return standalone ? "application" : "browser";
}

function syncDeviceMode() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const root = document.documentElement;
    const small = window.matchMedia(SMALL_QUERY).matches;
    const width = Math.max(1, Math.round(
      document.documentElement.clientWidth || window.innerWidth || 1,
    ));

    root.dataset.studioDeviceMode = small ? "small" : "large";
    root.dataset.studioSurfaceMode = surfaceMode();
    root.dataset.studioDeviceRelease = RELEASE;
    root.style.setProperty("--studio-viewport-width", `${width}px`);
  });
}

function start() {
  syncDeviceMode();
  window.matchMedia(SMALL_QUERY).addEventListener?.("change", syncDeviceMode);
  window.addEventListener("resize", syncDeviceMode, { passive: true });
  window.addEventListener("orientationchange", syncDeviceMode, { passive: true });
  window.addEventListener("pageshow", syncDeviceMode, { passive: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
