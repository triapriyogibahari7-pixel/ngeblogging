const RELEASE = "studio-mobile-widget-v28-20260725";
const COMPAT_RELEASE = "studio-device-sidebar-nara-v27-20260725";
const ROOT = document.getElementById("root") || document.documentElement;
const autoOpenedLaunchers = new WeakSet();
let frame = 0;

function positiveNumber(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function currentDevice() {
  const root = document.documentElement;
  const declared = root.dataset.studioShellModeV27 || root.dataset.studioShellModeV26 || "";
  if (["phone", "mobile", "tablet"].includes(declared)) return { compact: true, mode: declared };
  if (["desktop-phone", "laptop", "desktop"].includes(declared)) return { compact: false, mode: declared };

  const width = positiveNumber(window.innerWidth, document.documentElement.clientWidth || 1);
  const screenWidth = positiveNumber(window.screen?.width, width);
  const screenHeight = positiveNumber(window.screen?.height, window.innerHeight || 1);
  const screenShortSide = Math.min(screenWidth, screenHeight);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const desktopRequested = root.dataset.desktopLayoutRequested === "true" || root.dataset.desktopSitePhone === "true";
  const compact = !desktopRequested && (standalone || width <= 760 || screenShortSide <= 760);
  return { compact, mode: compact ? "mobile" : "desktop" };
}

function setInitialNaraState(layer, profile) {
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell || layer.dataset.naraInitialV28 === "true") return;

  const size = profile.compact ? "mini" : "compact";
  const windowMode = profile.compact ? "compact" : "desktop";
  layer.dataset.naraDefaultV28 = "true";
  layer.dataset.naraInitialV28 = "true";
  layer.dataset.naraSizeV27 = size;
  layer.dataset.naraSizeV26 = size;
  layer.dataset.naraWindowMode = windowMode;
  shell.dataset.naraDefaultV28 = "true";
  shell.dataset.naraSizeV27 = size;
  shell.dataset.naraSizeV26 = size;
  shell.dataset.naraWindowMode = windowMode;
  document.documentElement.dataset.naraSize = size;
  document.documentElement.dataset.naraExpanded = "false";
}

function syncNara(profile) {
  const root = document.documentElement;
  const shell = document.querySelector(".nara-assistant-shell");
  if (shell) {
    const layer = shell.closest(".nara-assistant-layer");
    setInitialNaraState(layer, profile);
    if (layer) layer.dataset.naraDefaultV28 = "true";
    shell.dataset.naraDefaultV28 = "true";
    root.dataset.naraDefaultOpenV28 = "true";
    root.dataset.naraWidgetModeV28 = layer?.dataset.naraSizeV27 || layer?.dataset.naraSizeV26 || (profile.compact ? "mini" : "compact");
    return;
  }

  root.dataset.naraDefaultOpenV28 = "false";
  const launcher = document.querySelector(".nara-floating-button");
  if (!launcher || autoOpenedLaunchers.has(launcher)) return;
  autoOpenedLaunchers.add(launcher);
  launcher.hidden = false;
  launcher.disabled = false;
  launcher.click();
  requestAnimationFrame(schedule);
}

function syncSidebarButton(profile) {
  const root = document.documentElement;
  root.dataset.studioMobileWidgetAuthority = RELEASE;
  root.dataset.studioMobileWidgetCompatibility = COMPAT_RELEASE;
  root.dataset.studioMobileWidgetDevice = profile.mode;

  document.querySelectorAll(".sn-device-toggle-v27").forEach((button) => {
    button.dataset.centeredEdgeV28 = "true";
    button.hidden = !profile.compact;
    button.disabled = !profile.compact;
    button.tabIndex = profile.compact ? 0 : -1;
    button.setAttribute("aria-hidden", String(!profile.compact));
    if (profile.compact) {
      button.style.removeProperty("visibility");
      button.style.removeProperty("opacity");
      button.style.removeProperty("pointer-events");
    }
  });
}

function sync() {
  const profile = currentDevice();
  syncSidebarButton(profile);
  syncNara(profile);
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.type === "childList" || mutation.type === "attributes")) schedule();
}).observe(ROOT, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-nara-window-mode", "data-nara-size-v27", "data-nara-size-v26"],
});

window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });

schedule();
