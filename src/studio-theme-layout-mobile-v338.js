import "./studio-theme-layout-mobile-v338.css";

export const STUDIO_THEME_LAYOUT_MOBILE_RELEASE_V338 = "studio-theme-layout-mobile-v338-20260807";

const LARGE_DEVICES = new Set(["laptop", "desktop", "computer"]);
const COMPACT_DEVICES = new Set(["application", "phone", "mobile", "compact", "tablet"]);
const PRIMARY_SELECTOR = '[data-v337-canonical-layout="primary-v264"],.tn-layout-map-v264';
const SECONDARY_SELECTOR = '[data-v337-secondary-layout="below"]';

let frame = 0;
let observer = null;

function normalizeDevice(value) {
  const device = String(value || "").trim().toLowerCase();
  return LARGE_DEVICES.has(device) || COMPACT_DEVICES.has(device) ? device : "";
}

function currentStudioDevice() {
  const root = document.documentElement;
  const explicit = normalizeDevice(root.dataset.studioDeviceVariant)
    || normalizeDevice(root.dataset.studioResponsiveMode);
  if (explicit) return explicit;

  const uaMobile = navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "");
  if (uaMobile) return "phone";

  const shortScreen = Math.min(Number(screen?.width || 0), Number(screen?.height || 0));
  const width = Number(window.innerWidth || 0);
  if ((shortScreen > 0 && shortScreen <= 820) || width <= 820) return width <= 430 ? "phone" : "compact";
  if (width <= 1180) return "laptop";
  if (width <= 1680) return "desktop";
  return "computer";
}

function directChildUnder(root, node) {
  let cursor = node;
  while (cursor && cursor.parentElement && cursor.parentElement !== root) cursor = cursor.parentElement;
  return cursor?.parentElement === root ? cursor : null;
}

function markLayout(studio) {
  if (!(studio instanceof HTMLElement)) return false;
  const primary = studio.querySelector(PRIMARY_SELECTOR);
  if (!(primary instanceof HTMLElement)) return false;

  const device = currentStudioDevice();
  const family = LARGE_DEVICES.has(device) ? "large" : "compact";
  studio.dataset.v338LayoutDevice = device;
  studio.dataset.v338LayoutFamily = family;
  studio.dataset.v338MobileLayout = "ready";

  primary.dataset.v338LayoutRole = "primary";
  const secondary = studio.querySelector(SECONDARY_SELECTOR);
  if (secondary instanceof HTMLElement) {
    secondary.dataset.v338LayoutRole = "secondary-below";
    // v337 owns semantic detection and placement. v338 only verifies that the
    // former right-hand design remains after the primary map in compact modes.
    const primaryTop = directChildUnder(studio, primary);
    const secondaryTop = directChildUnder(studio, secondary);
    if (family === "compact" && primaryTop instanceof HTMLElement && secondaryTop instanceof HTMLElement
      && primaryTop !== secondaryTop && primaryTop.parentElement === studio && secondaryTop.parentElement === studio
      && primaryTop.nextElementSibling !== secondaryTop) {
      primaryTop.insertAdjacentElement("afterend", secondaryTop);
    }
  }

  return true;
}

export function syncThemeLayoutMobileV338(root = document) {
  frame = 0;
  document.documentElement.dataset.studioThemeLayoutMobileV338 = STUDIO_THEME_LAYOUT_MOBILE_RELEASE_V338;
  let repaired = 0;
  root.querySelectorAll(".tn-layout-studio").forEach((studio) => {
    if (markLayout(studio)) repaired += 1;
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
  frame = window.requestAnimationFrame(() => syncThemeLayoutMobileV338(document));
}

function startObserver() {
  if (observer || typeof MutationObserver === "undefined" || !document.body) return;
  observer = new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" || record.type === "attributes")) schedule();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "class",
      "data-v337-secondary-below",
      "data-v337-canonical-layout",
      "data-v337-secondary-layout",
      "data-studio-responsive-mode",
      "data-studio-device-variant",
    ],
  });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", () => { schedule(); schedule(80); }, { passive: true });
  window.addEventListener("pageshow", () => schedule(), { passive: true });
  window.addEventListener("resize", () => schedule(30), { passive: true });
  window.addEventListener("orientationchange", () => schedule(50), { passive: true });
  window.addEventListener("hashchange", () => schedule(20), { passive: true });
  window.addEventListener("popstate", () => schedule(20), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule(20), { passive: true });
  window.addEventListener("ngeblogging:active-site-change", () => schedule(30), { passive: true });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { startObserver(); schedule(); schedule(180); }, { once: true });
  } else {
    startObserver();
    schedule();
    schedule(180);
  }
}
