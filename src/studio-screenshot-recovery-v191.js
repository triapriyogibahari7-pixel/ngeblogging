import "./studio-screenshot-recovery-v191.css";

const RELEASE = "studio-screenshot-recovery-v191-20260801";
const MOBILE_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;

function finite(value, fallback = 1) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function rootLength(name, fallback) {
  try {
    return finite(getComputedStyle(document.documentElement).getPropertyValue(name), fallback);
  } catch {
    return fallback;
  }
}

function profile() {
  const root = document.documentElement;
  const layoutWidth = finite(root.clientWidth || window.innerWidth, 1);
  const visualWidth = finite(window.visualViewport?.width, layoutWidth);
  const physicalWidth = rootLength("--studio-physical-width", Math.min(layoutWidth, visualWidth));
  const responsiveMode = root.dataset.studioResponsiveMode || "desktop";
  const handheld = root.dataset.studioHandheld === "true";
  const physicalMobile = handheld
    || root.dataset.studioPhysicalMobileV190 === "true"
    || MOBILE_FAMILIES.has(responsiveMode);
  const desktopSitePhone = physicalMobile
    && (root.dataset.studioDesktopSitePhoneV190 === "true" || layoutWidth > Math.max(760, physicalWidth * 1.35));
  return { root, layoutWidth, visualWidth, physicalWidth, responsiveMode, handheld, physicalMobile, desktopSitePhone };
}

function clearInline(node, properties) {
  if (!node) return;
  properties.forEach((property) => node.style.removeProperty(property));
}

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function recoverViewport(state) {
  const body = document.body;
  const appRoot = document.getElementById("root");
  state.root.dataset.studioScreenshotRecoveryV191 = RELEASE;
  state.root.dataset.studioPhysicalMobileV191 = String(state.physicalMobile);
  state.root.dataset.studioDesktopSitePhoneV191 = String(state.desktopSitePhone);

  if (!state.desktopSitePhone) {
    state.root.dataset.studioViewportStrategyV191 = "native-device-viewport";
    return;
  }

  // v188-v190 tried to enlarge Android "Situs desktop" by scaling the entire
  // React root. On several Chromium/Opera builds that leaves the app painted
  // only on the left while the synthetic desktop viewport stays blank on the
  // right. v191 chooses complete geometry over root scaling: no root zoom,
  // transform, or physical-width clamp. Physical-mobile CSS still supplies the
  // mobile interaction model even when the browser reports a desktop viewport.
  clearInline(appRoot, [
    "position", "zoom", "width", "max-width", "min-width", "margin", "margin-left", "margin-right",
    "left", "right", "transform", "transform-origin", "filter",
  ]);
  clearInline(body, [
    "zoom", "width", "max-width", "min-width", "margin", "margin-left", "margin-right",
    "left", "right", "transform", "transform-origin", "filter",
  ]);
  setImportant(body, "width", "100%");
  setImportant(body, "max-width", "100vw");
  setImportant(body, "min-width", "0");
  setImportant(body, "margin", "0");
  setImportant(body, "transform", "none");
  setImportant(body, "zoom", "1");
  setImportant(appRoot, "width", "100%");
  setImportant(appRoot, "max-width", "100vw");
  setImportant(appRoot, "min-width", "0");
  setImportant(appRoot, "margin", "0");
  setImportant(appRoot, "transform", "none");
  setImportant(appRoot, "zoom", "1");
  state.root.style.setProperty("--v191-desktop-site-density", String(Math.min(3.2, Math.max(1, state.layoutWidth / state.physicalWidth))));
  state.root.dataset.studioViewportStrategyV191 = "full-synthetic-width-no-root-scale";
}

function recoverDrawer(state) {
  if (!state.physicalMobile) return;
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const main = document.querySelector(".sn-main");
  const toggle = document.querySelector(".sn-sidebar-toggle");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));

  main?.removeAttribute("inert");
  sidebar?.removeAttribute("inert");
  toggle?.removeAttribute("inert");
  [main, sidebar, toggle].forEach((node) => {
    if (!node) return;
    node.style.removeProperty("filter");
    node.style.removeProperty("backdrop-filter");
  });

  if (sidebar) {
    sidebar.dataset.screenshotDrawerV191 = open ? "open" : "closed";
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

  document.body.classList.toggle("sn-mobile-sidebar-open", open);
  document.body.dataset.drawerBlockingV191 = "false";
}

function recoverOperationalPages(state) {
  if (!state.physicalMobile) return;
  const selectors = [
    ".sn-view-pad", ".sn-page-title", ".sn-page-title>*", ".sn-content-card", ".sn-content-tools",
    ".sc161-summary", ".sc161-summary>*", ".sc161-hero", ".sc161-hero>*", ".sc161-hero-actions",
    ".sc161-card", ".sc161-card>*", ".sc161-recent>button", ".sc161-drafts>button",
    ".mv176-page", ".mv176-title", ".mv176-title>*", ".mv176-title-actions", ".mv176-site-strip",
    ".mv176-metrics", ".mv176-metrics>*", ".mv176-card", ".mv176-tools", ".mv176-list", ".mv176-list>article",
    ".sv124-page", ".sv124-page-title", ".sv124-site-strip", ".sv124-card", ".sv124-toggle-row",
    ".op41-host", ".op41-host>*", ".op41-panel", ".op41-panel>*", ".op41-toolbar", ".op41-toolbar-actions",
    ".op41-active-site", ".op41-site-actions", ".op41-metrics", ".op41-chart-grid", ".op41-member-grid",
    ".sn-media-library", ".sn-media-tools", ".sn-media-tools>*", ".sn-api-page", ".sn-api-title", ".sn-api-metrics",
  ].join(",");

  document.querySelectorAll(selectors).forEach((node) => {
    node.removeAttribute("inert");
    node.style.removeProperty("inset");
    node.style.removeProperty("left");
    node.style.removeProperty("right");
    node.style.removeProperty("top");
    node.style.removeProperty("bottom");
    node.style.removeProperty("transform");
    node.style.removeProperty("filter");
    node.style.removeProperty("zoom");
  });
}

function recoverAccountSurface() {
  const grid = document.querySelector(".sn-settings-grid");
  if (!grid) return;
  const sections = [...grid.querySelectorAll(":scope > section")];
  const profileSection = sections[0] || null;
  const settingsSection = sections[1] || null;
  const page = grid.closest(".sn-view-pad");
  const extras = page?.querySelector(".sn-settings-extras");
  const mode = document.documentElement.dataset.studioAccountViewV189 || "settings";

  if (mode === "profile") {
    if (profileSection) profileSection.hidden = false;
    if (settingsSection) settingsSection.hidden = true;
    if (extras) extras.hidden = true;
    if (page) page.dataset.accountSurfaceV191 = "profile-only";
  } else {
    if (profileSection) profileSection.hidden = true;
    if (settingsSection) settingsSection.hidden = false;
    if (extras) extras.hidden = false;
    if (page) page.dataset.accountSurfaceV191 = "settings-only";
  }
}

function recoverNara(state) {
  const launchers = [...document.querySelectorAll(".nara-floating-button")];
  launchers.slice(1).forEach((node) => node.remove());
  const launcher = launchers[0];
  if (launcher) {
    setImportant(launcher, "animation", "none");
    setImportant(launcher, "transition", "none");
    setImportant(launcher, "filter", "none");
    setImportant(launcher, "opacity", "1");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v191NaraMode = full ? "modal" : "nonmodal";
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
    setImportant(close, "display", "grid");
    setImportant(close, "visibility", "visible");
    setImportant(close, "opacity", "1");
  }

  if (!full) {
    setImportant(layer, "pointer-events", "none");
    setImportant(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
    for (const className of ["nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full"]) {
      document.body.classList.remove(className);
      document.documentElement.classList.remove(className);
    }
  }
  if (state.physicalMobile) shell.dataset.screenshotNaraV191 = "true";
}

function sync() {
  frame = 0;
  const state = profile();
  recoverViewport(state);
  recoverDrawer(state);
  recoverOperationalPages(state);
  recoverAccountSurface();
  recoverNara(state);
  document.documentElement.dataset.studioScreenshotRecoveryReadyV191 = "true";
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    "class", "hidden", "inert", "aria-hidden", "data-nara-size",
    "data-studio-responsive-mode", "data-studio-handheld", "data-studio-account-view-v189",
  ],
});

for (const eventName of ["resize", "orientationchange", "pageshow", "online"]) {
  window.addEventListener(eventName, schedule, { passive: true });
}
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

sync();

export {
  RELEASE,
  profile,
  recoverViewport,
  recoverDrawer,
  recoverOperationalPages,
  recoverAccountSurface,
  recoverNara,
  sync,
};
