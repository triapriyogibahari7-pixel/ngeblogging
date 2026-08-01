import "./studio-screenshot-recovery-v193.css";

const RELEASE = "studio-screenshot-recovery-v193-20260801";
const MOBILE_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;

function finite(value, fallback = 1) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function physicalWidth(root, fallback) {
  try {
    const value = Number.parseFloat(getComputedStyle(root).getPropertyValue("--studio-physical-width"));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  } catch {
    return fallback;
  }
}

function profileV193() {
  const root = document.documentElement;
  const layoutWidth = finite(root.clientWidth || window.innerWidth, 1);
  const visualWidth = finite(window.visualViewport?.width, layoutWidth);
  const physical = physicalWidth(root, Math.min(layoutWidth, visualWidth));
  const mode = root.dataset.studioResponsiveMode || "desktop";
  const handheld = root.dataset.studioHandheld === "true";
  const physicalMobile = handheld
    || root.dataset.studioPhysicalMobileV191 === "true"
    || MOBILE_FAMILIES.has(mode);
  const desktopSitePhone = physicalMobile && layoutWidth > Math.max(760, physical * 1.35);
  return { root, layoutWidth, visualWidth, physical, mode, handheld, physicalMobile, desktopSitePhone };
}

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function clearGeometry(node) {
  if (!node) return;
  for (const property of ["inset", "left", "right", "top", "bottom", "transform", "filter", "zoom"]) {
    node.style.removeProperty(property);
  }
}

function recoverRootV193(state) {
  state.root.dataset.studioScreenshotRecoveryV193 = RELEASE;
  state.root.dataset.studioPhysicalMobileV193 = String(state.physicalMobile);
  state.root.dataset.studioDesktopSitePhoneV193 = String(state.desktopSitePhone);
  state.root.dataset.studioResponsiveFamilyV193 = state.mode;

  if (!state.physicalMobile) return;
  const body = document.body;
  const appRoot = document.getElementById("root");
  for (const node of [body, appRoot]) {
    if (!node) continue;
    clearGeometry(node);
    setImportant(node, "min-width", "0");
    setImportant(node, "max-width", "100vw");
    setImportant(node, "margin", "0");
    setImportant(node, "transform", "none");
    setImportant(node, "filter", "none");
    setImportant(node, "zoom", "1");
  }
  if (body) setImportant(body, "width", "100%");
  if (appRoot) setImportant(appRoot, "width", "100%");
}

function recoverThemeStudioV193(state) {
  if (!state.physicalMobile) return;
  const selectors = [
    ".tn-studio", ".tn-hero", ".tn-hero-copy", ".tn-active-stage", ".tn-command",
    ".tn-layout-studio", ".tn-layout-studio-header", ".tn-layout-studio-header>*",
    ".tn-library", ".tn-library>header", ".tn-library>header>*", ".tn-library>header>div>*",
    ".tn-library>header label", ".tn-blueprints", ".tn-theme-grid", ".tn-theme-grid>article",
    ".tn-layout-canvas-v170", ".tn-layout-slot-v170", ".tn-code-workspace", ".tn-code-pane",
    ".tn-code-preview-pane", ".tn-frame-shell", ".tn-device-switch",
  ].join(",");

  document.querySelectorAll(selectors).forEach((node) => {
    node.removeAttribute("inert");
    clearGeometry(node);
    node.style.removeProperty("position");
    node.style.removeProperty("height");
    node.style.removeProperty("min-height");
  });

  const libraryHeader = document.querySelector(".tn-library>header");
  const layoutHeader = document.querySelector(".tn-layout-studio-header");
  for (const header of [libraryHeader, layoutHeader]) {
    if (!header) continue;
    setImportant(header, "position", "static");
    setImportant(header, "width", "100%");
    setImportant(header, "max-width", "100%");
    setImportant(header, "height", "auto");
    setImportant(header, "display", "flex");
    setImportant(header, "flex-direction", "column");
    setImportant(header, "align-items", "stretch");
    setImportant(header, "gap", "12px");
  }

  document.querySelectorAll(".tn-library>header h2,.tn-layout-studio-header h2").forEach((heading) => {
    clearGeometry(heading);
    setImportant(heading, "position", "static");
    setImportant(heading, "width", "100%");
    setImportant(heading, "white-space", "normal");
    setImportant(heading, "overflow-wrap", "anywhere");
    setImportant(heading, "line-height", "1.08");
  });

  state.root.dataset.themeScreenshotFlowV193 = "normal-document-flow";
}

function recoverDrawerV193(state) {
  if (!state.physicalMobile) return;
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));
  const toggle = document.querySelector(".sn-sidebar-toggle");

  toggle?.removeAttribute("inert");
  if (toggle) {
    setImportant(toggle, "display", "grid");
    setImportant(toggle, "place-items", "center");
    setImportant(toggle, "opacity", "1");
    setImportant(toggle, "filter", "none");
  }

  if (sidebar) {
    sidebar.removeAttribute("inert");
    sidebar.dataset.screenshotDrawerV193 = open ? "open" : "closed";
    sidebar.setAttribute("aria-hidden", String(!open));
    setImportant(sidebar, "z-index", "2147483600");
    setImportant(sidebar, "filter", "none");
    setImportant(sidebar, "backdrop-filter", "none");
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
    setImportant(backdrop, "z-index", "2147483500");
    setImportant(backdrop, "background", "transparent");
    setImportant(backdrop, "opacity", "1");
    setImportant(backdrop, "filter", "none");
    setImportant(backdrop, "backdrop-filter", "none");
    setImportant(backdrop, "pointer-events", open ? "auto" : "none");
  }

  document.body.dataset.drawerBlockingV193 = "false";
}

function recoverNaraV193(state) {
  const launchers = [...document.querySelectorAll(".nara-floating-button")];
  launchers.slice(1).forEach((node) => node.remove());
  const launcher = launchers[0];
  if (launcher) {
    setImportant(launcher, "animation", "none");
    setImportant(launcher, "transition", "none");
    setImportant(launcher, "transform", "none");
    setImportant(launcher, "filter", "none");
    setImportant(launcher, "opacity", "1");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;

  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v193NaraMode = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  shell.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.inert = !full;
    backdrop.tabIndex = full ? 0 : -1;
    backdrop.setAttribute("aria-hidden", String(!full));
    if (!full) {
      setImportant(backdrop, "display", "none");
      setImportant(backdrop, "pointer-events", "none");
      setImportant(backdrop, "background", "transparent");
      setImportant(backdrop, "backdrop-filter", "none");
    } else {
      backdrop.style.removeProperty("display");
    }
  }

  const close = shell.querySelector('button[aria-label="Tutup Nara AI"],button[title="Tutup"],button[aria-label="Tutup Nara"]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara AI");
    setImportant(close, "display", "grid");
    setImportant(close, "visibility", "visible");
    setImportant(close, "opacity", "1");
  }

  if (!full) {
    setImportant(layer, "pointer-events", "none");
    setImportant(layer, "background", "transparent");
    setImportant(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
    for (const className of [
      "nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full",
    ]) {
      document.body.classList.remove(className);
      document.documentElement.classList.remove(className);
    }
  } else {
    layer.style.removeProperty("pointer-events");
    layer.style.removeProperty("background");
  }

  if (state.physicalMobile) shell.dataset.screenshotNaraV193 = "true";
}

function recoverPageContainmentV193(state) {
  if (!state.physicalMobile) return;
  const selectors = [
    ".sn-view-pad", ".sc161-summary", ".sc161-content-page", ".mv176-page", ".sv124-page",
    ".sn-media-library", ".sn-api-page", ".op41-host", ".op41-panel", ".ce-app",
    ".sn-content-card", ".sn-settings-grid", ".sn-members", ".sn-domain-card",
  ].join(",");
  document.querySelectorAll(selectors).forEach((node) => {
    clearGeometry(node);
    setImportant(node, "min-width", "0");
    setImportant(node, "max-width", "100%");
  });
}

function syncV193() {
  frame = 0;
  const state = profileV193();
  recoverRootV193(state);
  recoverThemeStudioV193(state);
  recoverDrawerV193(state);
  recoverNaraV193(state);
  recoverPageContainmentV193(state);
  state.root.dataset.studioScreenshotRecoveryReadyV193 = "true";
}

function scheduleV193() {
  if (!frame) frame = requestAnimationFrame(syncV193);
}

new MutationObserver(scheduleV193).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    "class", "hidden", "inert", "aria-hidden", "data-nara-size",
    "data-studio-responsive-mode", "data-studio-handheld", "data-studio-physical-mobile-v191",
  ],
});

for (const name of ["resize", "orientationchange", "pageshow", "online"]) {
  window.addEventListener(name, scheduleV193, { passive: true });
}
window.visualViewport?.addEventListener("resize", scheduleV193, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) scheduleV193(); });

syncV193();

export {
  RELEASE,
  profileV193,
  recoverThemeStudioV193,
  recoverDrawerV193,
  recoverNaraV193,
  recoverPageContainmentV193,
  syncV193,
};
