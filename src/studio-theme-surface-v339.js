import "./studio-theme-surface-v339.css";

export const STUDIO_THEME_SURFACE_RELEASE_V339 = "studio-theme-surface-v339-20260807";

const LARGE_DEVICES = new Set(["laptop", "desktop", "computer"]);
const COMPACT_DEVICES = new Set(["application", "phone", "mobile", "compact", "tablet"]);
let frame = 0;
let observer = null;

function normalizeDevice(value) {
  const device = String(value || "").trim().toLowerCase();
  return LARGE_DEVICES.has(device) || COMPACT_DEVICES.has(device) ? device : "";
}

function currentThemeDevice() {
  const root = document.documentElement;
  const explicit = normalizeDevice(root.dataset.studioDeviceVariant)
    || normalizeDevice(root.dataset.studioResponsiveMode);
  if (explicit) return explicit;

  const mobileUa = navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "");
  const width = Number(window.innerWidth || 0);
  const shortScreen = Math.min(Number(screen?.width || 0), Number(screen?.height || 0));
  if (mobileUa || (shortScreen > 0 && shortScreen <= 820)) {
    if (width <= 390) return "phone";
    if (width <= 430) return "mobile";
    if (width <= 600) return "compact";
    return "tablet";
  }
  if (width <= 430) return "mobile";
  if (width <= 600) return "compact";
  if (width <= 900) return "tablet";
  if (width <= 1280) return "laptop";
  if (width <= 1680) return "desktop";
  return "computer";
}

function markThemeSurface(studio) {
  if (!(studio instanceof HTMLElement)) return false;
  const device = currentThemeDevice();
  const family = LARGE_DEVICES.has(device) ? "large" : "compact";

  studio.dataset.v339ThemeSurface = "ready";
  studio.dataset.v339ThemeDevice = device;
  studio.dataset.v339ThemeFamily = family;

  const stage = studio.querySelector(":scope > .tn-hero .tn-active-stage");
  if (stage instanceof HTMLElement) stage.dataset.v339ThemeRole = "preview-stage";
  const categories = studio.querySelector(":scope > .tn-library .tn-category-tabs");
  if (categories instanceof HTMLElement) categories.dataset.v339ThemeRole = "categories";
  const layout = studio.querySelector(":scope > .tn-layout-studio");
  if (layout instanceof HTMLElement) layout.dataset.v339ThemeRole = "layout-map";
  return true;
}

export function syncThemeSurfaceV339(root = document) {
  frame = 0;
  document.documentElement.dataset.studioThemeSurfaceV339 = STUDIO_THEME_SURFACE_RELEASE_V339;
  let repaired = 0;
  root.querySelectorAll(".tn-studio").forEach((studio) => {
    if (markThemeSurface(studio)) repaired += 1;
  });
  return repaired;
}

function schedule(delay = 0) {
  if (typeof window === "undefined") return;
  if (delay > 0) {
    window.setTimeout(() => schedule(), delay);
    return;
  }
  if (frame) return;
  frame = window.requestAnimationFrame(() => syncThemeSurfaceV339(document));
}

function startObserver() {
  if (observer || typeof MutationObserver === "undefined" || !document.body) return;
  observer = new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList")) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", () => { schedule(); schedule(70); }, { passive: true });
  window.addEventListener("pageshow", () => schedule(), { passive: true });
  window.addEventListener("resize", () => schedule(40), { passive: true });
  window.addEventListener("orientationchange", () => schedule(60), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule(20), { passive: true });
  window.addEventListener("ngeblogging:active-site-change", () => schedule(30), { passive: true });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { startObserver(); schedule(); schedule(160); }, { once: true });
  } else {
    startObserver();
    schedule();
    schedule(160);
  }
}
