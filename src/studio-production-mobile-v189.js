import "./studio-production-mobile-v189.css";

const RELEASE = "studio-production-mobile-v189-20260801";
const MOBILE_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
const ACTIVE_SITE_KEYS = [
  "ngeblogging-active-site-snapshot-v186",
  "ngeblogging-active-site-snapshot-v185",
  "ngeblogging-active-site-snapshot-v183",
];
let frame = 0;
let lastSiteId = "";

function finite(value, fallback) {
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

function ensureViewportMeta() {
  let viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement("meta");
    viewport.name = "viewport";
    document.head.prepend(viewport);
  }
  viewport.content = "width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content";
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
  return {
    root,
    layoutWidth,
    visualWidth,
    physicalWidth,
    responsiveMode,
    handheld,
    desktopSitePhone,
    physicalMobile,
  };
}

function clearInline(node, names) {
  if (!node) return;
  names.forEach((name) => node.style.removeProperty(name));
}

function normalizeViewport() {
  const state = profile();
  const appRoot = document.getElementById("root");
  const body = document.body;
  const drawerWidth = Math.min(Math.max(252, state.physicalWidth * 0.78), 334);

  ensureViewportMeta();
  state.root.dataset.studioProductionMobileV189 = RELEASE;
  state.root.dataset.studioPhysicalMobileV189 = String(state.physicalMobile);
  state.root.dataset.studioDesktopSitePhoneV189 = String(state.desktopSitePhone);
  state.root.style.setProperty("--v189-physical-width", `${state.physicalWidth}px`);
  state.root.style.setProperty("--v189-drawer-width", `${drawerWidth}px`);

  if (state.desktopSitePhone && appRoot && body) {
    const ratio = Math.min(3.2, Math.max(1, state.layoutWidth / state.physicalWidth));
    state.root.dataset.studioDesktopSiteCompensationV189 = "true";
    state.root.style.setProperty("--v189-desktop-site-scale", String(ratio));

    /* Keep the body at the synthetic viewport width. Only the application root is scaled. */
    body.style.setProperty("width", "100vw", "important");
    body.style.setProperty("max-width", "none", "important");
    body.style.setProperty("min-width", "0", "important");
    body.style.setProperty("margin", "0", "important");
    body.style.setProperty("overflow-x", "hidden", "important");
    body.style.setProperty("transform", "none", "important");
    body.style.setProperty("zoom", "1", "important");

    appRoot.style.setProperty("width", `${state.physicalWidth}px`, "important");
    appRoot.style.setProperty("max-width", `${state.physicalWidth}px`, "important");
    appRoot.style.setProperty("min-width", "0", "important");
    appRoot.style.setProperty("margin", "0", "important");
    appRoot.style.setProperty("transform-origin", "top left", "important");

    if (globalThis.CSS?.supports?.("zoom", "1.1")) {
      appRoot.style.setProperty("zoom", String(ratio), "important");
      appRoot.style.setProperty("transform", "none", "important");
    } else {
      appRoot.style.removeProperty("zoom");
      appRoot.style.setProperty("transform", `scale(${ratio})`, "important");
    }
  } else {
    state.root.dataset.studioDesktopSiteCompensationV189 = "false";
    state.root.style.removeProperty("--v189-desktop-site-scale");
    clearInline(body, ["width", "max-width", "min-width", "margin", "overflow-x", "transform", "zoom"]);
    clearInline(appRoot, ["zoom", "width", "max-width", "min-width", "margin", "transform", "transform-origin"]);
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
    sidebar.dataset.productionDrawerV189 = open ? "open" : "closed";
    sidebar.setAttribute("aria-hidden", String(!open));
    sidebar.style.setProperty("z-index", "2147483100", "important");
    sidebar.style.setProperty("opacity", "1", "important");
    sidebar.style.setProperty("filter", "none", "important");
    sidebar.style.setProperty("isolation", "isolate", "important");
    if (open) {
      sidebar.style.setProperty("pointer-events", "auto", "important");
      sidebar.querySelectorAll("button,a,input,select,textarea").forEach((node) => {
        node.removeAttribute("inert");
        node.removeAttribute("aria-hidden");
        node.style.setProperty("pointer-events", "auto", "important");
      });
    }
  }

  if (backdrop) {
    backdrop.hidden = !open;
    backdrop.setAttribute("aria-hidden", String(!open));
    backdrop.style.setProperty("z-index", "2147483000", "important");
    backdrop.style.setProperty("left", `${state.drawerWidth}px`, "important");
    backdrop.style.setProperty("right", "0", "important");
    backdrop.style.setProperty("width", "auto", "important");
    backdrop.style.setProperty("filter", "none", "important");
    backdrop.style.setProperty("backdrop-filter", "none", "important");
    backdrop.style.setProperty("opacity", open ? "1" : "0", "important");
    backdrop.style.setProperty("pointer-events", open ? "auto" : "none", "important");
  }

  document.body.classList.toggle("sn-mobile-sidebar-open", open);
}

function normalizeNara(state) {
  const launchers = [...document.querySelectorAll(".nara-floating-button")];
  launchers.slice(1).forEach((node) => node.remove());

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  const open = Boolean(layer && shell);
  document.body.classList.toggle("nara-open-v189", open);
  if (!layer || !shell) return;

  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  const mode = full ? "modal" : "nonmodal";

  layer.dataset.v189NaraMode = mode;
  layer.dataset.naraMode = mode;
  layer.dataset.physicalNaraModeV188 = mode;
  layer.dataset.productionNaraModeV187 = mode;
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
    for (const className of [
      "nara-fullscreen-open-v148",
      "nara-scroll-lock",
      "sm177-nara-full",
      "v179-nara-full",
    ]) {
      document.body.classList.remove(className);
      document.documentElement.classList.remove(className);
    }
  }

  if (state.physicalMobile) shell.dataset.productionMobileNaraV189 = "true";
}

function readCachedSite() {
  if (window.__ngebloggingActiveSite?.id) return window.__ngebloggingActiveSite;
  try {
    for (const key of ACTIVE_SITE_KEYS) {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      if (value?.id) return value;
    }
  } catch {
    return null;
  }
  return null;
}

function restoreActiveSiteSignal() {
  const site = readCachedSite();
  if (!site?.id || site.id === lastSiteId) return;
  lastSiteId = site.id;
  window.__ngebloggingActiveSite = site;
  document.documentElement.dataset.activeSiteId = site.id;
  if (site.slug) document.documentElement.dataset.activeSiteSlug = site.slug;
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-ready", { detail: site }));
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-change", { detail: site }));
}

function normalizeFlow(state) {
  if (!state.physicalMobile) return;
  document.querySelectorAll([
    ".sn-page-title", ".sv124-page-title", ".mv176-title", ".sn-api-title",
    ".mv176-title-actions", ".sn-media-tools", ".sn-media-tools nav",
    ".sv124-site-strip", ".mv176-site-strip", ".sn-api-metrics",
    ".sc161-hero", ".sc161-hero-actions", ".sc161-card", ".sc161-card header",
    ".sc161-recent > button", ".sc161-drafts > button",
  ].join(",")).forEach((node) => {
    node.style.removeProperty("inset");
    node.style.removeProperty("transform");
    node.style.removeProperty("filter");
    node.removeAttribute("inert");
  });
}

function profileMenuAction(event) {
  const profile = event.target.closest?.(".sn-profile-menu-v147 button[data-action='profile'],.sn-profile-menu-v150 button[data-action='profile']");
  const settings = event.target.closest?.(".sn-profile-menu-v147 button[data-action='settings'],.sn-profile-menu-v150 button[data-action='settings'],.sn-account-settings-v135");
  if (!profile && !settings) return;

  document.documentElement.dataset.studioAccountViewV189 = profile ? "profile" : "settings";
  if (!profile) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  document.querySelectorAll(".sn-profile-menu-v147,.sn-profile-menu-v150").forEach((menu) => menu.remove());
  const settingsButton = document.querySelector(".sn-account-settings-v135");
  settingsButton?.click();
  requestAnimationFrame(normalizeProfileSurface);
}

function normalizeProfileSurface() {
  if (document.documentElement.dataset.studioAccountViewV189 !== "profile") return;
  const page = document.querySelector(".sn-settings-grid")?.closest(".sn-view-pad");
  const title = page?.querySelector(".sn-page-title h1");
  const description = page?.querySelector(".sn-page-title p");
  if (title) title.textContent = "Profil";
  if (description) description.textContent = "Kelola identitas, biografi, avatar, dan informasi publik akun Anda.";
}

function sync() {
  frame = 0;
  const state = normalizeViewport();
  normalizeDrawer(state);
  normalizeNara(state);
  restoreActiveSiteSignal();
  normalizeFlow(state);
  normalizeProfileSurface();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

document.addEventListener("click", profileMenuAction, true);

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    "class",
    "hidden",
    "inert",
    "aria-hidden",
    "data-nara-size",
    "data-studio-responsive-mode",
    "data-studio-handheld",
  ],
});

for (const name of ["resize", "orientationchange", "pageshow", "online"]) {
  window.addEventListener(name, schedule, { passive: true });
}
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

sync();

export {
  RELEASE,
  normalizeViewport,
  normalizeDrawer,
  normalizeNara,
  restoreActiveSiteSignal,
  sync,
};
