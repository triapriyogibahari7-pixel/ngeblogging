import "./studio-source-stability-v237.css";
import "./studio-operations-v41.js";

export const RELEASE = "studio-source-stability-v237-20260803";
export const HOTFIX_RELEASE = "studio-desktop-sidebar-v238-20260803";

const SMALL_MODES = new Set(["application", "phone", "mobile", "compact"]);
const LARGE_MODES = new Set(["tablet", "desktop", "laptop", "computer"]);
let frame = 0;
let lastFamily = "";

function normalizedScreen(value, density, fallback) {
  const numeric = Number(value || fallback || 1);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback || 1;
  if (numeric <= 900) return numeric;
  return density >= 1.25 ? numeric / density : fallback;
}

function physicalMetrics() {
  const root = document.documentElement;
  const layoutWidth = Number(root.clientWidth || innerWidth || 1);
  const layoutHeight = Number(root.clientHeight || innerHeight || 1);
  const visualWidth = Number(window.visualViewport?.width || layoutWidth || 1);
  const visualHeight = Number(window.visualViewport?.height || layoutHeight || 1);
  const density = Math.max(1, Number(devicePixelRatio || 1));
  const screenWidth = normalizedScreen(screen?.width, density, layoutWidth);
  const screenHeight = normalizedScreen(screen?.height, density, visualHeight);
  const shortSide = Math.min(screenWidth, screenHeight);
  const longSide = Math.max(screenWidth, screenHeight);
  const portrait = layoutHeight >= layoutWidth;
  const physicalViewportWidth = portrait ? shortSide : longSide;
  const ua = navigator.userAgent || "";
  const handheld = navigator.userAgentData?.mobile === true
    || root.dataset.studioHandheld === "true"
    || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)
    || (Number(navigator.maxTouchPoints || 0) > 1 && shortSide <= 760);
  const responsive = root.dataset.studioResponsiveMode || "";
  const variant = root.dataset.studioDeviceVariant || "";
  const desktopSitePhone = root.dataset.studioDesktopSitePhone === "true"
    || root.dataset.v232ModeLock === "desktop-site-large"
    || (handheld && layoutWidth > physicalViewportWidth * 1.35);
  const explicitLarge = desktopSitePhone || LARGE_MODES.has(responsive) || LARGE_MODES.has(variant);
  const physicalSmall = !explicitLarge && (handheld || SMALL_MODES.has(responsive) || Math.min(layoutWidth, visualWidth) <= 760);
  return {
    layoutWidth,
    layoutHeight,
    visualWidth,
    visualHeight,
    density,
    shortSide,
    longSide,
    handheld,
    responsive,
    variant,
    desktopSitePhone,
    family: explicitLarge || !physicalSmall ? "large" : "small",
  };
}

function forceFamily(metrics) {
  const root = document.documentElement;
  const family = metrics.family;
  root.dataset.studioSourceStabilityV237 = RELEASE;
  root.dataset.studioDesktopSidebarV238 = HOTFIX_RELEASE;
  root.dataset.v237Family = family;
  root.dataset.v238Family = family;
  root.dataset.v237PhysicalHandheld = String(metrics.handheld);
  root.dataset.v238DesktopSitePhone = String(metrics.desktopSitePhone);
  root.style.setProperty("--v237-visual-width", `${Math.max(1, metrics.visualWidth)}px`);
  root.style.setProperty("--v237-visual-height", `${Math.max(1, metrics.visualHeight)}px`);

  // Desktop-site pada handphone memang sengaja meminta keluarga layout besar.
  // Tablet fisik besar juga tetap berada pada keluarga large. Mobile biasa,
  // aplikasi, handphone dan compact tetap memakai drawer.
  if (root.dataset.v235Family !== family) root.dataset.v235Family = family;
  if (root.dataset.v236Family !== family) root.dataset.v236Family = family;
  lastFamily = family;
}

function syncSidebar(family) {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const main = document.querySelector(".sn-main");
  if (!sidebar || !main) return;
  sidebar.dataset.v237Family = family;
  sidebar.dataset.v238Family = family;
  sidebar.dataset.v237Navigation = family === "small" ? "single-n-drawer" : "single-internal-n";
  sidebar.dataset.v238Navigation = family === "small" ? "single-n-drawer" : "single-internal-n-toggle";
  main.dataset.v237Content = "sidebar-aware";
  main.dataset.v238Content = "sidebar-aware";
  main.removeAttribute("inert");
  main.style.removeProperty("filter");

  const internalN = sidebar.querySelector(".sn-logo-mark");
  if (internalN) {
    internalN.hidden = false;
    internalN.removeAttribute("inert");
    internalN.dataset.v238InternalN = "visible-toggle";
    internalN.setAttribute("role", "button");
    internalN.setAttribute("tabindex", "0");
  }

  document.querySelectorAll(".sn-side-backdrop").forEach((node) => {
    node.dataset.v237Backdrop = "outside-only";
    node.dataset.v238Backdrop = "outside-only";
    node.style.setProperty("backdrop-filter", "none", "important");
    node.style.setProperty("-webkit-backdrop-filter", "none", "important");
    node.style.setProperty("filter", "none", "important");
  });
}

function syncTopbar() {
  document.querySelectorAll(".sn-avatar").forEach((avatar) => {
    avatar.dataset.v237Profile = "avatar-menu";
    avatar.dataset.v238Profile = "avatar-menu";
    avatar.hidden = false;
    avatar.removeAttribute("inert");
    avatar.style.setProperty("display", "grid", "important");
  });
  document.querySelectorAll("[data-studio-mode-badge],[data-device-mode-badge],.studio-device-mode-badge,.v225-mode-badge").forEach((node) => {
    node.hidden = true;
    node.style.setProperty("display", "none", "important");
  });
}

function syncTheme() {
  document.querySelectorAll(".tn-studio").forEach((studio) => {
    studio.dataset.v237Theme = "visible-100";
    studio.dataset.v238Theme = "visible-100";
    studio.style.setProperty("display", "block", "important");
    studio.style.setProperty("visibility", "visible", "important");
    studio.style.setProperty("opacity", "1", "important");
  });
  document.querySelectorAll(".tn-modal").forEach((modal) => {
    modal.dataset.v237Modal = modal.querySelector(".tn-code-workspace")
      ? "code"
      : modal.querySelector(".tn-widget-studio")
        ? "widgets"
        : "theme";
  });
  document.querySelectorAll(".tn-widget-studio").forEach((studio) => studio.dataset.v237Widgets = "readable-26");
  document.querySelectorAll("#ngeblogging-layout-map,.tn-layout-studio[data-v226-layout-source]").forEach((map) => {
    map.dataset.v237Layout = "interactive-map";
    map.dataset.v238Layout = "interactive-map";
    map.querySelector(".content-main")?.setAttribute("data-v237-content-center", "post-page");
  });
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    workspace.dataset.v237Code = lastFamily === "small" ? "preview-top-code-bottom" : "code-left-preview-right";
    workspace.dataset.v238Code = workspace.dataset.v237Code;
  });
}

function syncNara(metrics) {
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (shell) {
    shell.dataset.v237Family = metrics.family;
    shell.dataset.v238Family = metrics.family;
    shell.dataset.v237Size = shell.dataset.naraSize || "small";
    shell.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.intelligence,.nara-select.model,.nara-attachment-menu-wrap").forEach((control) => {
      control.hidden = false;
      control.removeAttribute("inert");
      control.removeAttribute("aria-hidden");
      control.dataset.v237NaraControl = "visible";
      control.dataset.v238NaraControl = "visible";
    });
    const plus = shell.querySelector(".nara-attachment-menu-wrap>button");
    if (plus) {
      plus.hidden = false;
      plus.removeAttribute("inert");
      plus.dataset.v237Attachment = "camera-photo-file";
      plus.dataset.v238Attachment = "camera-photo-file";
      plus.setAttribute("aria-label", "Tambah kamera, foto, atau file");
    }
  }

  document.querySelectorAll(".v235-nara-attachment-portal").forEach((portal) => {
    portal.dataset.v237Portal = "viewport-safe";
    portal.dataset.v238Portal = "viewport-safe";
    portal.hidden = false;
    portal.removeAttribute("inert");
    portal.style.setProperty("display", "grid", "important");
    portal.style.setProperty("visibility", "visible", "important");
    portal.style.setProperty("opacity", "1", "important");
    portal.style.setProperty("pointer-events", "auto", "important");
    const rect = portal.getBoundingClientRect();
    const width = Math.min(280, Math.max(220, metrics.visualWidth - 20));
    const maxLeft = Math.max(10, metrics.visualWidth - width - 10);
    const left = Math.max(10, Math.min(Number.parseFloat(portal.style.left) || rect.left || 10, maxLeft));
    const height = Math.min(rect.height || 190, Math.max(150, metrics.visualHeight - 20));
    const top = Math.max(10, Math.min(Number.parseFloat(portal.style.top) || rect.top || 10, metrics.visualHeight - height - 10));
    portal.style.setProperty("width", `${width}px`, "important");
    portal.style.setProperty("left", `${left}px`, "important");
    portal.style.setProperty("top", `${top}px`, "important");
  });
}

function syncDomain() {
  document.querySelectorAll(".sv124-domain-page,.sn-domain-page").forEach((page) => {
    page.dataset.v237Domain = lastFamily === "small" ? "stacked-actions" : "large-actions";
    page.dataset.v238Domain = lastFamily === "small" ? "stacked-actions" : "large-actions";
    page.querySelectorAll("button,a").forEach((control) => {
      const text = String(control.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (/jadikan draf|terbitkan|hubungkan|verifikasi|muat ulang|refresh|salin|hapus|utama|buka/.test(text)) control.dataset.v237DomainAction = "true";
    });
  });
}

function syncSettings() {
  document.querySelectorAll(".sn-settings-grid").forEach((grid) => grid.dataset.v237Settings = "site-only-bounded");
  document.querySelectorAll(".sn-settings-extras,.sn-backup-host,.bc-center").forEach((node) => node.dataset.v237Backup = "bounded");
}

function syncSiteManager() {
  document.querySelectorAll(".sn-site-manager").forEach((manager) => manager.dataset.v237SiteManager = "bounded");
  document.querySelectorAll(".sn-site-capacity").forEach((node) => node.dataset.v237Capacity = "system-limit-no-number");
}

function sync() {
  frame = 0;
  const metrics = physicalMetrics();
  forceFamily(metrics);
  syncSidebar(metrics.family);
  syncTopbar();
  syncTheme();
  syncNara(metrics);
  syncDomain();
  syncSettings();
  syncSiteManager();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "data-nara-size", "data-studio-device-mode", "data-studio-responsive-mode", "data-studio-device-variant", "data-studio-desktop-site-phone", "data-v235-family", "data-v236-family"],
});
for (const name of ["resize", "orientationchange", "pageshow"]) window.addEventListener(name, schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

sync();