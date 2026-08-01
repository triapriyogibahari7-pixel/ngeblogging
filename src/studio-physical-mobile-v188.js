import "./studio-physical-mobile-v188.css";

const RELEASE = "studio-physical-mobile-v188-20260801";
const MOBILE_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;

function finite(value, fallback) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function rootLength(name, fallback) {
  return finite(getComputedStyle(document.documentElement).getPropertyValue(name), fallback);
}

function profile() {
  const root = document.documentElement;
  const layoutWidth = finite(root.clientWidth || window.innerWidth, 1);
  const visualWidth = finite(window.visualViewport?.width, layoutWidth);
  const physicalWidth = rootLength("--studio-physical-width", Math.min(layoutWidth, visualWidth));
  const responsiveMode = root.dataset.studioResponsiveMode || "desktop";
  const handheld = root.dataset.studioHandheld === "true";
  const desktopSitePhone = handheld && layoutWidth > physicalWidth * 1.35;
  const physicalMobile = handheld || MOBILE_FAMILIES.has(responsiveMode);
  return { root, layoutWidth, visualWidth, physicalWidth, responsiveMode, handheld, desktopSitePhone, physicalMobile };
}

function clearCompensation(appRoot) {
  if (!appRoot) return;
  for (const name of ["zoom", "width", "max-width", "min-width"]) appRoot.style.removeProperty(name);
}

function normalizeViewport() {
  const state = profile();
  const appRoot = document.getElementById("root");
  const drawerWidth = Math.min(Math.max(248, state.physicalWidth * 0.78), 330);
  state.root.dataset.studioPhysicalMobileV188 = String(state.physicalMobile);
  state.root.dataset.studioDesktopSitePhone = String(state.desktopSitePhone);
  state.root.dataset.studioPhysicalMobileRelease = RELEASE;
  state.root.style.setProperty("--v188-physical-width", `${state.physicalWidth}px`);
  state.root.style.setProperty("--v188-drawer-width", `${drawerWidth}px`);

  if (state.desktopSitePhone && appRoot) {
    const ratio = Math.min(3.2, Math.max(1, state.layoutWidth / state.physicalWidth));
    state.root.dataset.studioDesktopSiteCompensationV188 = "true";
    state.root.style.setProperty("--v188-desktop-site-zoom", String(ratio));
    appRoot.style.setProperty("zoom", String(ratio), "important");
    appRoot.style.setProperty("width", `${state.physicalWidth}px`, "important");
    appRoot.style.setProperty("max-width", `${state.physicalWidth}px`, "important");
    appRoot.style.setProperty("min-width", "0", "important");
  } else {
    state.root.dataset.studioDesktopSiteCompensationV188 = "false";
    state.root.style.removeProperty("--v188-desktop-site-zoom");
    clearCompensation(appRoot);
  }
  return state;
}

function normalizeDrawer(state) {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));
  if (!state.physicalMobile) return;

  sidebar?.removeAttribute("inert");
  sidebar?.querySelectorAll("[inert]").forEach((node) => node.removeAttribute("inert"));
  document.querySelector(".sn-main")?.removeAttribute("inert");

  if (sidebar) {
    sidebar.dataset.physicalDrawerV188 = open ? "open" : "closed";
    sidebar.setAttribute("aria-hidden", String(!open));
    sidebar.style.removeProperty("filter");
  }
  if (backdrop) {
    backdrop.hidden = !open;
    backdrop.setAttribute("aria-hidden", String(!open));
    backdrop.style.setProperty("left", "var(--v188-drawer-width)", "important");
  }
  document.body.classList.toggle("sn-mobile-sidebar-open", open);
}

function normalizeNara(state) {
  const launchers = [...document.querySelectorAll(".nara-floating-button")];
  launchers.slice(1).forEach((node) => node.remove());
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;

  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.physicalNaraModeV188 = full ? "modal" : "nonmodal";
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
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
    document.documentElement.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
  }
  if (state.physicalMobile) shell.dataset.physicalMobileNaraV188 = "true";
}

function normalizeFlow(state) {
  if (!state.physicalMobile) return;
  document.querySelectorAll([
    ".sn-page-title", ".sv124-page-title", ".mv176-title", ".sn-api-title",
    ".mv176-title-actions", ".sn-media-tools", ".sn-media-tools nav",
    ".sv124-site-strip", ".mv176-site-strip", ".sn-api-metrics",
  ].join(",")).forEach((node) => {
    node.style.removeProperty("inset");
    node.style.removeProperty("transform");
    node.removeAttribute("inert");
  });
}

function sync() {
  frame = 0;
  const state = normalizeViewport();
  normalizeDrawer(state);
  normalizeNara(state);
  normalizeFlow(state);
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "inert", "data-nara-size", "data-studio-responsive-mode", "data-studio-handheld"],
});

for (const name of ["resize", "orientationchange", "pageshow"]) window.addEventListener(name, schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
sync();

export { RELEASE, normalizeViewport, normalizeDrawer, normalizeNara, sync };
