import "./studio-real-device-v190.css";

const RELEASE = "studio-real-device-v190-20260801";
const MOBILE_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
const MOBILE_BREAKPOINTS = Object.freeze([320, 360, 375, 390, 412, 430, 600]);
let frame = 0;
let calibrationFrame = 0;

function finite(value, fallback = 1) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function computedLength(name, fallback) {
  try {
    return finite(getComputedStyle(document.documentElement).getPropertyValue(name), fallback);
  } catch {
    return fallback;
  }
}

function currentProfile() {
  const root = document.documentElement;
  const layoutWidth = finite(root.clientWidth || window.innerWidth, 1);
  const layoutHeight = finite(root.clientHeight || window.innerHeight, 1);
  const visualWidth = finite(window.visualViewport?.width, layoutWidth);
  const physicalWidth = computedLength("--studio-physical-width", Math.min(layoutWidth, visualWidth));
  const responsiveMode = root.dataset.studioResponsiveMode || "desktop";
  const handheld = root.dataset.studioHandheld === "true";
  const desktopSitePhone = handheld && layoutWidth > Math.max(760, physicalWidth * 1.35);
  const physicalMobile = handheld || MOBILE_FAMILIES.has(responsiveMode);
  return { root, layoutWidth, layoutHeight, visualWidth, physicalWidth, responsiveMode, handheld, desktopSitePhone, physicalMobile };
}

function removeStyles(node, properties) {
  if (!node) return;
  properties.forEach((name) => node.style.removeProperty(name));
}

function setImportant(node, name, value) {
  if (!node) return;
  if (node.style.getPropertyValue(name) === value && node.style.getPropertyPriority(name) === "important") return;
  node.style.setProperty(name, value, "important");
}

function resetLegacyViewportGeometry() {
  const root = document.documentElement;
  const body = document.body;
  const appRoot = document.getElementById("root");
  removeStyles(body, ["width", "max-width", "min-width", "margin", "margin-left", "margin-right", "left", "right", "transform", "transform-origin", "zoom", "filter"]);
  removeStyles(appRoot, ["zoom", "width", "max-width", "min-width", "margin", "margin-left", "margin-right", "left", "right", "transform", "transform-origin", "filter"]);
  root.style.removeProperty("--v188-desktop-site-zoom");
  root.style.removeProperty("--v189-desktop-site-scale");
}

function calibrateDesktopSite(state) {
  cancelAnimationFrame(calibrationFrame);
  calibrationFrame = requestAnimationFrame(() => {
    const appRoot = document.getElementById("root");
    if (!appRoot || !document.documentElement.dataset.studioDesktopSitePhoneV190?.includes("true")) return;
    const desired = finite(document.documentElement.clientWidth || window.innerWidth, state.layoutWidth);
    const measured = finite(appRoot.getBoundingClientRect().width, state.physicalWidth);
    const errorRatio = desired / measured;
    if (errorRatio > .96 && errorRatio < 1.04) {
      document.documentElement.dataset.studioViewportCalibrationV190 = "stable";
      return;
    }

    const currentZoom = finite(appRoot.style.getPropertyValue("zoom"), 1);
    const nextZoom = Math.min(3.5, Math.max(.75, currentZoom * errorRatio));
    if (globalThis.CSS?.supports?.("zoom", "1.1")) {
      setImportant(appRoot, "zoom", String(nextZoom));
      document.documentElement.dataset.studioViewportCalibrationV190 = "corrected-zoom";
      requestAnimationFrame(() => {
        const after = finite(appRoot.getBoundingClientRect().width, state.physicalWidth);
        if (after >= desired * .92 && after <= desired * 1.08) return;
        appRoot.style.removeProperty("zoom");
        setImportant(appRoot, "transform-origin", "top left");
        setImportant(appRoot, "transform", `scale(${Math.min(3.5, Math.max(.75, desired / finite(after, state.physicalWidth)))})`);
        document.documentElement.dataset.studioViewportCalibrationV190 = "fallback-transform";
      });
      return;
    }

    appRoot.style.removeProperty("zoom");
    setImportant(appRoot, "transform-origin", "top left");
    setImportant(appRoot, "transform", `scale(${Math.min(3.5, Math.max(.75, desired / measured))})`);
    document.documentElement.dataset.studioViewportCalibrationV190 = "transform";
  });
}

function normalizeViewport() {
  const state = currentProfile();
  const root = state.root;
  const body = document.body;
  const appRoot = document.getElementById("root");
  const drawerWidth = Math.min(Math.max(248, state.physicalWidth * .78), 334);

  root.dataset.studioRealDeviceV190 = RELEASE;
  root.dataset.studioPhysicalMobileV190 = String(state.physicalMobile);
  root.dataset.studioDesktopSitePhoneV190 = String(state.desktopSitePhone);
  root.style.setProperty("--v190-physical-width", `${state.physicalWidth}px`);
  root.style.setProperty("--v190-drawer-width", `${drawerWidth}px`);

  resetLegacyViewportGeometry();

  if (state.desktopSitePhone && body && appRoot) {
    const scale = Math.min(3.5, Math.max(1, state.layoutWidth / state.physicalWidth));
    setImportant(body, "width", "100vw");
    setImportant(body, "max-width", "none");
    setImportant(body, "min-width", "0");
    setImportant(body, "margin", "0");
    setImportant(body, "left", "0");
    setImportant(body, "right", "auto");
    setImportant(body, "transform", "none");
    setImportant(body, "zoom", "1");

    setImportant(appRoot, "position", "relative");
    setImportant(appRoot, "left", "0");
    setImportant(appRoot, "right", "auto");
    setImportant(appRoot, "width", `${state.physicalWidth}px`);
    setImportant(appRoot, "max-width", `${state.physicalWidth}px`);
    setImportant(appRoot, "min-width", "0");
    setImportant(appRoot, "margin", "0");
    setImportant(appRoot, "transform-origin", "top left");
    if (globalThis.CSS?.supports?.("zoom", "1.1")) {
      setImportant(appRoot, "zoom", String(scale));
      appRoot.style.removeProperty("transform");
    } else {
      appRoot.style.removeProperty("zoom");
      setImportant(appRoot, "transform", `scale(${scale})`);
    }
    calibrateDesktopSite(state);
  } else {
    removeStyles(appRoot, ["position", "zoom", "width", "max-width", "min-width", "margin", "left", "right", "transform", "transform-origin"]);
    removeStyles(body, ["width", "max-width", "min-width", "margin", "left", "right", "transform", "zoom"]);
    root.dataset.studioViewportCalibrationV190 = "native";
  }

  return { ...state, drawerWidth };
}

function normalizeDrawer(state) {
  if (!state.physicalMobile) return;
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const main = document.querySelector(".sn-main");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));

  main?.removeAttribute("inert");
  sidebar?.removeAttribute("inert");
  sidebar?.querySelectorAll("[inert]").forEach((node) => node.removeAttribute("inert"));

  if (sidebar) {
    sidebar.dataset.realDeviceDrawerV190 = open ? "open" : "closed";
    sidebar.setAttribute("aria-hidden", String(!open));
    setImportant(sidebar, "z-index", "2147483500");
    setImportant(sidebar, "filter", "none");
    if (open) {
      setImportant(sidebar, "pointer-events", "auto");
      sidebar.querySelectorAll("button,a,input,select,textarea").forEach((node) => {
        node.removeAttribute("inert");
        node.removeAttribute("aria-hidden");
        setImportant(node, "pointer-events", "auto");
      });
    }
  }

  if (backdrop) {
    backdrop.hidden = !open;
    backdrop.setAttribute("aria-hidden", String(!open));
    setImportant(backdrop, "left", `${state.drawerWidth}px`);
    setImportant(backdrop, "right", "0");
    setImportant(backdrop, "width", "auto");
    setImportant(backdrop, "background", "transparent");
    setImportant(backdrop, "backdrop-filter", "none");
    setImportant(backdrop, "filter", "none");
    setImportant(backdrop, "pointer-events", open ? "auto" : "none");
  }

  document.body.classList.toggle("sn-mobile-sidebar-open", open);
}

function normalizeOperationalFlow(state) {
  if (!state.physicalMobile) return;
  const selector = [
    ".sn-page-title", ".sv124-page-title", ".mv176-title", ".sn-api-title",
    ".op41-toolbar", ".op41-toolbar-actions", ".op41-active-site", ".op41-site-actions",
    ".op41-metrics", ".op41-chart-grid", ".op41-member-grid", ".op41-form", ".op41-readiness",
    ".sc161-hero", ".sc161-hero-actions", ".sc161-card", ".sc161-card header",
    ".sc161-recent > button", ".sc161-drafts > button", ".sn-media-tools", ".sn-media-tools nav",
  ].join(",");
  document.querySelectorAll(selector).forEach((node) => {
    node.style.removeProperty("inset");
    node.style.removeProperty("transform");
    node.style.removeProperty("filter");
    node.removeAttribute("inert");
  });
}

function normalizeNara(state) {
  const launchers = [...document.querySelectorAll(".nara-floating-button")];
  launchers.slice(1).forEach((node) => node.remove());
  launchers[0]?.style.setProperty("animation", "none", "important");

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;

  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  const mode = full ? "modal" : "nonmodal";
  layer.dataset.v190NaraMode = mode;
  layer.setAttribute("aria-modal", String(full));
  shell.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.inert = !full;
    backdrop.tabIndex = full ? 0 : -1;
    backdrop.setAttribute("aria-hidden", String(!full));
  }
  const close = shell.querySelector('button[aria-label="Tutup Nara AI"],button[title="Tutup"],button[aria-label="Tutup Nara"]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara AI");
  }

  if (!full) {
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
    ["nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full"].forEach((name) => {
      document.body.classList.remove(name);
      document.documentElement.classList.remove(name);
    });
  }
  if (state.physicalMobile) shell.dataset.realDeviceNaraV190 = "true";
}

function sync() {
  frame = 0;
  const state = normalizeViewport();
  normalizeDrawer(state);
  normalizeOperationalFlow(state);
  normalizeNara(state);
  document.documentElement.dataset.studioRealDeviceReadyV190 = "true";
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "inert", "aria-hidden", "data-nara-size", "data-studio-responsive-mode", "data-studio-handheld"],
});

for (const eventName of ["resize", "orientationchange", "pageshow", "online"]) {
  window.addEventListener(eventName, schedule, { passive: true });
}
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

sync();

export {
  RELEASE,
  MOBILE_BREAKPOINTS,
  currentProfile,
  normalizeViewport,
  normalizeDrawer,
  normalizeOperationalFlow,
  normalizeNara,
  sync,
};
