import "./studio-production-stability-v189.css";

const RELEASE = "studio-production-stability-v189-20260801";
const MOBILE_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;

function finite(value, fallback = 1) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function cssLength(name, fallback) {
  try {
    return finite(getComputedStyle(document.documentElement).getPropertyValue(name), fallback);
  } catch {
    return fallback;
  }
}

function readState() {
  const root = document.documentElement;
  const layoutWidth = finite(root.clientWidth || window.innerWidth, 1);
  const layoutHeight = finite(root.clientHeight || window.innerHeight, 1);
  const visualWidth = finite(window.visualViewport?.width, layoutWidth);
  const physicalWidth = cssLength("--studio-physical-width", Math.min(layoutWidth, visualWidth));
  const responsiveMode = root.dataset.studioResponsiveMode || "desktop";
  const handheld = root.dataset.studioHandheld === "true";
  const desktopSitePhone = handheld && layoutWidth > physicalWidth * 1.35;
  const physicalMobile = handheld || MOBILE_FAMILIES.has(responsiveMode);
  const ratio = desktopSitePhone ? Math.min(3.2, Math.max(1, layoutWidth / physicalWidth)) : 1;
  return { root, layoutWidth, layoutHeight, visualWidth, physicalWidth, responsiveMode, handheld, desktopSitePhone, physicalMobile, ratio };
}

function normalizeViewport(state) {
  const appRoot = document.getElementById("root");
  const drawerWidth = Math.min(Math.max(248, state.physicalWidth * 0.74), 330);
  state.root.dataset.studioProductionStabilityV189 = RELEASE;
  state.root.dataset.studioPhysicalMobileV189 = String(state.physicalMobile);
  state.root.dataset.studioDesktopSitePhoneV189 = String(state.desktopSitePhone);
  state.root.style.setProperty("--v189-layout-width", `${state.layoutWidth}px`);
  state.root.style.setProperty("--v189-layout-height", `${state.layoutHeight}px`);
  state.root.style.setProperty("--v189-physical-width", `${state.physicalWidth}px`);
  state.root.style.setProperty("--v189-drawer-width", `${drawerWidth}px`);
  state.root.style.setProperty("--v189-desktop-site-zoom", String(state.ratio));

  if (state.desktopSitePhone && appRoot) {
    /* Chrome Android desktop-site uses a synthetic ~980px viewport. Keep that
       viewport as the body clipping boundary, then scale a physical-width app
       root into it. v188 incorrectly clipped the body itself to physicalWidth. */
    appRoot.style.setProperty("zoom", String(state.ratio), "important");
    appRoot.style.setProperty("width", `${state.physicalWidth}px`, "important");
    appRoot.style.setProperty("max-width", `${state.physicalWidth}px`, "important");
    appRoot.style.setProperty("min-width", "0", "important");
  }
}

function normalizeDrawer(state) {
  if (!state.physicalMobile) return;
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const backdrop = document.querySelector(".sn-side-backdrop");
  if (!sidebar) return;
  const open = sidebar.classList.contains("mobile-open");

  sidebar.removeAttribute("inert");
  sidebar.querySelectorAll("[inert]").forEach((node) => node.removeAttribute("inert"));
  sidebar.dataset.productionDrawerV189 = open ? "open" : "closed";
  sidebar.setAttribute("aria-hidden", String(!open));

  if (backdrop) {
    backdrop.hidden = !open;
    backdrop.setAttribute("aria-hidden", String(!open));
    backdrop.style.setProperty("inset", "0 0 0 var(--v189-drawer-width)", "important");
    backdrop.style.setProperty("left", "var(--v189-drawer-width)", "important");
  }

  document.querySelector(".sn-main")?.removeAttribute("inert");
  document.body.classList.toggle("sn-mobile-sidebar-open", open);
}

function normalizeNara(state) {
  const launchers = [...document.querySelectorAll(".nara-floating-button")];
  launchers.slice(1).forEach((node) => node.remove());

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;

  const controls = [...shell.querySelectorAll(".nara-size-controls-v147")];
  if (controls.length > 1) {
    const native = controls.find((node) => node.classList.contains("nara-native-size-controls-v149")) || controls[0];
    controls.filter((node) => node !== native).forEach((node) => node.remove());
  }

  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.productionNaraModeV189 = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.inert = !full;
    backdrop.tabIndex = full ? 0 : -1;
    backdrop.setAttribute("aria-hidden", String(!full));
  }

  const close = shell.querySelector('button[aria-label="Tutup Nara AI"],button[title="Tutup"]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.setAttribute("aria-label", "Tutup Nara AI");
  }

  if (!full) {
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
    for (const name of ["nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full"]) {
      document.body.classList.remove(name);
      document.documentElement.classList.remove(name);
    }
  }
  shell.dataset.productionNaraV189 = state.physicalMobile ? "physical-mobile" : "responsive";
}

function normalizeOperationalFlow(state) {
  if (!state.physicalMobile) return;
  document.querySelectorAll([
    ".sn-page-title", ".sv124-page-title", ".mv176-title", ".sn-api-title",
    ".mv176-title-actions", ".sn-media-tools", ".sn-media-tools nav",
    ".sv124-site-strip", ".mv176-site-strip", ".sn-api-metrics",
    ".op41-head", ".op41-controls", ".op41-summary", ".op41-grid",
  ].join(",")).forEach((node) => {
    node.style.removeProperty("inset");
    node.style.removeProperty("left");
    node.style.removeProperty("right");
    node.style.removeProperty("top");
    node.style.removeProperty("transform");
    node.style.removeProperty("filter");
    node.removeAttribute("inert");
  });
}

function sync() {
  frame = 0;
  const state = readState();
  normalizeViewport(state);
  normalizeDrawer(state);
  normalizeNara(state);
  normalizeOperationalFlow(state);
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    "class", "hidden", "inert", "style", "data-nara-size",
    "data-studio-responsive-mode", "data-studio-handheld", "data-studio-desktop-site-phone",
  ],
});

for (const name of ["resize", "orientationchange", "pageshow"]) {
  window.addEventListener(name, schedule, { passive: true });
}
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
sync();

export { RELEASE, readState, normalizeViewport, normalizeDrawer, normalizeNara, sync };