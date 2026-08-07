import "./studio-theme-layout-below-v337.js";
import "./studio-theme-layout-mobile-v338.js";
import "./studio-theme-surface-v339.js";
import "./studio-theme-final-v340.css";

export const STUDIO_THEME_FINAL_RELEASE_V340 = "studio-theme-final-v340-20260807";

const LARGE_DEVICES = new Set(["laptop", "desktop", "computer"]);
const COMPACT_DEVICES = new Set(["application", "phone", "mobile", "compact", "tablet"]);
let frame = 0;
let observer = null;

function normalizeDevice(value) {
  const device = String(value || "").trim().toLowerCase();
  return LARGE_DEVICES.has(device) || COMPACT_DEVICES.has(device) ? device : "";
}

function currentDevice() {
  const root = document.documentElement;
  const explicit = normalizeDevice(root.dataset.studioDeviceVariant)
    || normalizeDevice(root.dataset.studioResponsiveMode);
  if (explicit) return explicit;

  const mobileUa = navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "");
  const width = Number(window.visualViewport?.width || window.innerWidth || 0);
  const shortSide = Math.min(Number(screen?.width || width || 0), Number(screen?.height || width || 0));
  if (mobileUa || (shortSide > 0 && shortSide <= 820)) {
    if (width <= 390) return "phone";
    if (width <= 430) return "mobile";
    if (width <= 600) return "compact";
    return "tablet";
  }
  if (width <= 760) return "compact";
  if (width <= 1180) return "tablet";
  if (width <= 1366) return "laptop";
  if (width <= 1680) return "desktop";
  return "computer";
}

function textOf(node) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function directChildUnder(root, node) {
  let cursor = node;
  while (cursor && cursor.parentElement && cursor.parentElement !== root) cursor = cursor.parentElement;
  return cursor?.parentElement === root ? cursor : null;
}

function semanticSecondary(layout, canonical) {
  const known = layout.querySelector('[data-v337-secondary-layout="below"],[data-v338-layout-role="secondary-below"]');
  if (known instanceof HTMLElement && known !== canonical && !known.contains(canonical) && !canonical.contains(known)) return known;

  const candidates = [...layout.querySelectorAll("section,aside,div")].filter((node) => {
    if (!(node instanceof HTMLElement) || node === canonical || node.contains(canonical) || canonical.contains(node)) return false;
    const text = textOf(node);
    return /model\s+editorial/i.test(text) && /model\s+majalah/i.test(text) && /konten\s+utama|post\s*\/?\s*page/i.test(text);
  });
  return candidates.sort((a, b) => textOf(a).length - textOf(b).length)[0] || null;
}

function forceBelow(layout, canonical, secondary) {
  if (!(layout instanceof HTMLElement) || !(canonical instanceof HTMLElement)) return false;
  const primaryTop = directChildUnder(layout, canonical) || canonical;
  let anchor = primaryTop;

  if (secondary instanceof HTMLElement && secondary !== canonical && !secondary.contains(canonical) && !canonical.contains(secondary)) {
    const secondaryTop = directChildUnder(layout, secondary) || secondary;
    if (secondaryTop !== primaryTop && secondaryTop.parentElement === layout) {
      primaryTop.insertAdjacentElement("afterend", secondaryTop);
      secondaryTop.dataset.v340SecondaryLayout = "below";
      anchor = secondaryTop;
    }
  }

  const widgetSummary = layout.querySelector(":scope > .tn-layout-side");
  if (widgetSummary instanceof HTMLElement && widgetSummary !== anchor) {
    if (anchor.parentElement === layout) anchor.insertAdjacentElement("afterend", widgetSummary);
    widgetSummary.dataset.v340WidgetSummary = "below";
  }
  return true;
}

function normalizeThemeStudio(studio) {
  if (!(studio instanceof HTMLElement)) return false;
  const device = currentDevice();
  const family = LARGE_DEVICES.has(device) ? "large" : "compact";
  studio.dataset.v340ThemeFinal = "ready";
  studio.dataset.v340ThemeDevice = device;
  studio.dataset.v340ThemeFamily = family;

  const layout = studio.querySelector(":scope > .tn-layout-studio");
  if (!(layout instanceof HTMLElement)) return true;
  layout.dataset.v340Layout = "ready";
  layout.dataset.v340LayoutFamily = family;

  const canonical = layout.querySelector('[data-v337-canonical-layout="primary-v264"],.tn-layout-map-v264');
  if (!(canonical instanceof HTMLElement)) return true;
  canonical.dataset.v340LayoutRole = "primary";

  const secondary = semanticSecondary(layout, canonical);
  if (secondary instanceof HTMLElement) secondary.dataset.v340LayoutRole = "secondary-below";
  forceBelow(layout, canonical, secondary);
  return true;
}

export function syncThemeFinalV340(root = document) {
  frame = 0;
  document.documentElement.dataset.studioThemeFinalV340 = STUDIO_THEME_FINAL_RELEASE_V340;
  let count = 0;
  root.querySelectorAll(".tn-studio").forEach((studio) => {
    if (normalizeThemeStudio(studio)) count += 1;
  });
  return count;
}

function schedule(delay = 0) {
  if (typeof window === "undefined") return;
  if (delay > 0) {
    window.setTimeout(() => schedule(), delay);
    return;
  }
  if (frame) return;
  frame = window.requestAnimationFrame(() => syncThemeFinalV340(document));
}

function startSettledObserver() {
  if (observer || typeof MutationObserver === "undefined" || !document.body) return;
  observer = new MutationObserver((records) => {
    if (!records.some((record) => record.type === "childList")) return;
    schedule();
    const canonical = document.querySelector(".tn-studio .tn-layout-map-v264");
    if (canonical instanceof HTMLElement) {
      schedule(80);
      window.setTimeout(() => {
        observer?.disconnect();
        observer = null;
      }, 700);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const boot = () => {
    startSettledObserver();
    schedule();
    schedule(60);
    schedule(180);
    schedule(520);
  };
  window.addEventListener("pageshow", boot, { passive: true });
  window.addEventListener("resize", () => schedule(40), { passive: true });
  window.addEventListener("orientationchange", () => schedule(80), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule(20), { passive: true });
  window.addEventListener("ngeblogging:active-site-change", () => schedule(40), { passive: true });
  document.addEventListener("click", () => schedule(30), { passive: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
}
