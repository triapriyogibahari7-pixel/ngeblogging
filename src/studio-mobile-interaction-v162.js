const RELEASE = "studio-mobile-interaction-v162-20260731";
const RESPONSIVE_FAMILIES = ["application", "phone", "mobile", "compact", "tablet", "desktop"];
const VIEWPORT_MATRIX = [
  [320, 568], [360, 640], [375, 667], [390, 844], [412, 915], [430, 932],
  [600, 960], [768, 1024], [820, 1180], [1024, 768], [1280, 720],
  [1366, 768], [1440, 900], [1920, 1080],
];

const root = document.documentElement;
root.dataset.studioMobileInteractionV162 = RELEASE;

let frame = 0;
let lastDrawerOpen = false;
let lastNaraSize = "closed";

function viewportWidth() {
  return Math.round(window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 0);
}

function isStandaloneApplication() {
  return Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone);
}

function responsiveFamily() {
  const width = viewportWidth();
  if (isStandaloneApplication()) return "application";
  if (width <= 360) return "phone";
  if (width <= 480) return "mobile";
  if (width <= 680) return "compact";
  if (width <= 1024) return "tablet";
  return "desktop";
}

function desktopVariant(width = viewportWidth()) {
  if (width <= 1366) return "laptop";
  if (width >= 1800) return "computer";
  return "desktop";
}

function isDrawerFamily(family) {
  return ["application", "phone", "mobile", "compact"].includes(family);
}

function syncResponsiveFamily() {
  const family = responsiveFamily();
  root.dataset.studioResponsiveFamilyV162 = family;
  root.dataset.studioDesktopVariantV162 = family === "desktop" ? desktopVariant() : "none";
  root.dataset.studioViewportV162 = `${viewportWidth()}x${Math.round(window.visualViewport?.height || window.innerHeight || 0)}`;
  root.dataset.studioViewportMatrixV162 = String(VIEWPORT_MATRIX.length);
  return family;
}

function unlockDocumentWhenSafe() {
  const drawerOpen = Boolean(document.querySelector("#ngeblogging-studio-sidebar.mobile-open"));
  const naraFull = Boolean(document.querySelector('.nara-assistant-shell[data-nara-size="full"]'));
  if (drawerOpen || naraFull) return;
  document.body.classList.remove("sn-mobile-sidebar-open");
  document.body.classList.remove("nara-fullscreen-v162");
  document.body.style.removeProperty("overflow");
  document.documentElement.style.removeProperty("overflow");
}

function syncDrawer(family) {
  const shell = document.querySelector(".sn-shell");
  const sidebar = shell?.querySelector("#ngeblogging-studio-sidebar.sn-side");
  const main = shell?.querySelector(".sn-main");
  const backdrop = shell?.querySelector(".sn-side-backdrop");
  const toggle = shell?.querySelector(".sn-sidebar-toggle");
  if (!shell || !sidebar || !main || !toggle) return;

  const drawerMode = isDrawerFamily(family) || shell.dataset.deviceMode === "small";
  const open = drawerMode && sidebar.classList.contains("mobile-open");
  shell.dataset.drawerModeV162 = drawerMode ? "overlay" : "sidebar";
  shell.dataset.drawerStateV162 = open ? "open" : "closed";
  sidebar.dataset.drawerInteractionV162 = open ? "interactive" : "hidden";
  sidebar.setAttribute("aria-hidden", drawerMode && !open ? "true" : "false");
  sidebar.toggleAttribute("inert", drawerMode && !open);

  // Backdrop menjaga halaman belakang, tetapi main tidak dibuat inert karena inert lama
  // pada beberapa browser Android ikut mematikan sentuhan di drawer setelah render ulang.
  main.removeAttribute("inert");
  main.dataset.drawerBackgroundV162 = open ? "covered" : "active";

  if (backdrop) {
    backdrop.dataset.drawerBackdropV162 = "below-sidebar";
    backdrop.setAttribute("aria-hidden", open ? "false" : "true");
  }

  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Tutup menu Studio" : "Buka menu Studio");

  if (!open && lastDrawerOpen) unlockDocumentWhenSafe();
  lastDrawerOpen = open;
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (launcher) {
    launcher.dataset.naraLauncherV162 = "compact";
    launcher.setAttribute("title", "Buka Nara AI");
  }

  if (!layer || !shell) {
    root.dataset.naraWindowV162 = "closed";
    if (lastNaraSize !== "closed") unlockDocumentWhenSafe();
    lastNaraSize = "closed";
    return;
  }

  const size = ["small", "medium", "full"].includes(shell.dataset.naraSize)
    ? shell.dataset.naraSize
    : "small";
  const full = size === "full";
  root.dataset.naraWindowV162 = size;
  layer.dataset.naraInteractionV162 = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", full ? "true" : "false");
  shell.dataset.naraGeometryV162 = size;

  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.setAttribute("aria-hidden", full ? "false" : "true");
    backdrop.tabIndex = full ? 0 : -1;
  }

  const close = shell.querySelector(".nara-assistant-header > button:last-child");
  if (close) {
    close.classList.add("nara-close-v162");
    close.setAttribute("aria-label", "Tutup Nara AI");
    close.setAttribute("title", "Tutup Nara AI");
  }

  document.body.classList.toggle("nara-fullscreen-v162", full);
  if (!full) {
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }
  lastNaraSize = size;
}

function scan() {
  frame = 0;
  const family = syncResponsiveFamily();
  syncDrawer(family);
  syncNara();
}

function scheduleScan() {
  if (frame) return;
  frame = requestAnimationFrame(scan);
}

new MutationObserver(scheduleScan).observe(document.documentElement, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ["class", "data-device-mode", "data-nara-size", "aria-expanded", "style"],
});

window.addEventListener("resize", scheduleScan, { passive: true });
window.addEventListener("orientationchange", scheduleScan, { passive: true });
window.addEventListener("pageshow", scheduleScan, { passive: true });
window.visualViewport?.addEventListener("resize", scheduleScan, { passive: true });
window.matchMedia?.("(display-mode: standalone)")?.addEventListener?.("change", scheduleScan);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const sidebar = document.querySelector("#ngeblogging-studio-sidebar.mobile-open");
  if (sidebar) {
    document.querySelector(".sn-side-close")?.click();
    return;
  }
  document.querySelector(".nara-close-v162")?.click();
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".sn-side-backdrop")) {
    document.querySelector(".sn-side-close")?.click();
    requestAnimationFrame(scheduleScan);
  }
  if (event.target.closest("#ngeblogging-studio-sidebar nav button,#ngeblogging-studio-sidebar .sn-account-footer button")) {
    requestAnimationFrame(scheduleScan);
  }
});

scan();

export { RELEASE, RESPONSIVE_FAMILIES, VIEWPORT_MATRIX, responsiveFamily, desktopVariant };
