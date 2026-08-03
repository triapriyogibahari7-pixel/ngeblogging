import "./studio-production-v223.css";

const RELEASE = "studio-production-v223-20260803";
let frame = 0;

function number(value, fallback = 1) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : fallback;
}

function physicalMetrics() {
  const root = document.documentElement;
  const layoutWidth = number(root.clientWidth || innerWidth, 1);
  const layoutHeight = number(root.clientHeight || innerHeight, 1);
  const density = number(devicePixelRatio, 1);
  const rawWidth = number(screen?.width, layoutWidth);
  const rawHeight = number(screen?.height, layoutHeight);
  const normalize = (value, fallback) => value <= 900 ? value : density >= 1.25 ? value / density : fallback;
  const screenWidth = normalize(rawWidth, layoutWidth);
  const screenHeight = normalize(rawHeight, layoutHeight);
  const shortSide = Math.min(screenWidth, screenHeight);
  const portrait = layoutHeight >= layoutWidth;
  const physicalWidth = portrait ? shortSide : Math.max(screenWidth, screenHeight);
  const ua = navigator.userAgent || "";
  const handheld = navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)
    || root.dataset.studioHandheld === "true"
    || shortSide < 768;
  const desktopSitePhone = root.dataset.studioDesktopSitePhone === "true" || (handheld && layoutWidth > physicalWidth * 1.35);
  const uiScale = desktopSitePhone ? Math.min(3.2, Math.max(1, layoutWidth / Math.max(physicalWidth, 1))) : 1;
  return { layoutWidth, layoutHeight, physicalWidth, shortSide, handheld, desktopSitePhone, uiScale };
}

function markRoot() {
  const root = document.documentElement;
  const view = physicalMetrics();
  root.dataset.studioProductionV223 = RELEASE;
  root.dataset.v223PhysicalSmall = String(view.handheld || view.shortSide < 768);
  root.dataset.v223DesktopSitePhone = String(view.desktopSitePhone);
  root.dataset.v223UiFamily = view.handheld || view.shortSide < 768 ? "physical-small" : "large";
  root.style.setProperty("--v223-ui-scale", view.uiScale.toFixed(3));
  root.style.setProperty("--v223-layout-width", `${view.layoutWidth}px`);
  root.style.setProperty("--v223-physical-width", `${view.physicalWidth}px`);

  // v223 never rewrites the selected preview mode. The preview can stay Desktop,
  // Laptop or Computer while the controls still use the physical device geometry.
  root.dataset.v223PreviewModeLock = root.dataset.studioDeviceVariant || root.dataset.studioResponsiveMode || "auto";
}

function normalizeThemeStudio() {
  const studio = document.querySelector(".tn-studio");
  if (!studio) return;
  studio.dataset.v223ThemeSurface = "visible";
  studio.hidden = false;
  studio.removeAttribute("inert");
  studio.removeAttribute("aria-hidden");

  const map = studio.querySelector("#ngeblogging-layout-map.tn-layout-studio,.tn-layout-studio");
  const canvas = map?.querySelector(".tn-layout-canvas-v170");
  if (map) {
    map.dataset.v223Layout = "green-reference";
    map.querySelectorAll(".tn-layout-studio-header h2,.tn-layout-studio-header p").forEach((node) => { node.hidden = true; });
    const small = document.documentElement.dataset.v223UiFamily === "physical-small";
    map.dataset.v223LayoutFamily = small ? "physical-small" : "large";
  }
  if (canvas) {
    canvas.dataset.v223LayoutCanvas = "four-left-four-right";
    canvas.querySelectorAll(":scope>.tn-layout-slot-v170").forEach((slot) => {
      slot.hidden = false;
      slot.removeAttribute("inert");
      slot.removeAttribute("aria-hidden");
      slot.style.setProperty("pointer-events", "auto", "important");
    });
    const main = canvas.querySelector(":scope>.content-main");
    if (main) {
      main.hidden = false;
      main.removeAttribute("inert");
      main.style.setProperty("pointer-events", "auto", "important");
    }
  }

  const widgetList = map?.querySelector(":scope>.tn-layout-side");
  if (widgetList) widgetList.dataset.v223WidgetList = "below-map";
}

function normalizeCodeEditor() {
  const small = document.documentElement.dataset.v223UiFamily === "physical-small";
  document.querySelectorAll(".tn-modal-layer").forEach((layer) => {
    const workspace = layer.querySelector(".tn-code-workspace");
    if (!workspace) return;
    layer.dataset.v223ThemeCodeModal = small ? "physical-small" : "large";
    workspace.dataset.v223Workspace = small ? "preview-above-code" : "code-left-preview-right";

    const modal = layer.querySelector(":scope>.tn-modal");
    if (modal) modal.dataset.v223PhysicalEditor = small ? "true" : "false";

    workspace.querySelectorAll(".tn-code-pane>nav button").forEach((button) => {
      button.hidden = false;
      button.removeAttribute("inert");
      button.removeAttribute("aria-hidden");
      button.dataset.v223CodeTab = "visible";
    });

    workspace.querySelectorAll(".tn-code-pane>textarea").forEach((textarea) => {
      textarea.setAttribute("wrap", "off");
      textarea.dataset.v223CodeEditor = "responsive-readable";
    });

    const preview = workspace.querySelector(".tn-code-preview-pane");
    if (preview) preview.dataset.v223PreviewPane = small ? "physical-small" : "large";
  });
}

function normalizeNara() {
  const smallPhysical = document.documentElement.dataset.v223UiFamily === "physical-small";
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v223Launcher = "stable";
    for (const prop of ["animation", "transition", "filter", "transform"]) launcher.style.setProperty(prop, "none", "important");
    launcher.style.setProperty("opacity", "1", "important");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope>.nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v223NaraMode = full ? "modal" : "nonmodal";
  shell.dataset.v223NaraPhysical = smallPhysical ? "small" : "large";
  if (!full) {
    layer.style.setProperty("pointer-events", "none", "important");
    layer.style.setProperty("background", "transparent", "important");
    layer.style.setProperty("backdrop-filter", "none", "important");
    layer.style.setProperty("-webkit-backdrop-filter", "none", "important");
    shell.style.setProperty("pointer-events", "auto", "important");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }

  shell.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.intelligence,.nara-select.model,.nara-attachment-menu-wrap").forEach((control) => {
    control.hidden = false;
    control.removeAttribute("inert");
    control.removeAttribute("aria-hidden");
    control.dataset.v223Control = "visible";
  });

  const plus = shell.querySelector(".nara-attachment-menu-wrap>button");
  const menu = shell.querySelector(".nara-attachment-menu");
  if (plus) {
    plus.dataset.v223Plus = "camera-photo-file";
    plus.setAttribute("aria-haspopup", "menu");
    plus.setAttribute("aria-expanded", String(Boolean(menu)));
  }
  if (!plus || !menu) return;

  const rect = plus.getBoundingClientRect();
  const width = Math.min(320, Math.max(230, innerWidth * .72));
  const height = Math.min(210, innerHeight * .38);
  let top = rect.top - height - 10;
  if (top < 10) top = Math.min(innerHeight - height - 10, rect.bottom + 10);
  const left = Math.max(10, Math.min(innerWidth - width - 10, rect.left));
  menu.dataset.v223AttachmentMenu = "viewport-visible";
  menu.style.setProperty("position", "fixed", "important");
  menu.style.setProperty("left", `${left}px`, "important");
  menu.style.setProperty("right", "auto", "important");
  menu.style.setProperty("top", `${Math.max(10, top)}px`, "important");
  menu.style.setProperty("bottom", "auto", "important");
  menu.style.setProperty("width", `${width}px`, "important");
  menu.style.setProperty("max-width", "calc(100vw - 20px)", "important");
  menu.style.setProperty("display", "grid", "important");
  menu.style.setProperty("visibility", "visible", "important");
  menu.style.setProperty("opacity", "1", "important");
  menu.style.setProperty("pointer-events", "auto", "important");
  menu.style.setProperty("z-index", "2147485000", "important");
}

function normalizeDomain() {
  if (document.documentElement.dataset.v223UiFamily !== "physical-small") return;
  document.querySelectorAll(".sv124-domain-page button,.sv124-domain-page a").forEach((node) => {
    node.dataset.v223DomainAction = "full-row";
  });
}

function normalizeChrome() {
  document.querySelectorAll(".sn-side,.sn-sidebar-toggle,.sn-mobile-menu-mark").forEach((node) => {
    node.dataset.v223Stable = "true";
    for (const prop of ["animation", "transition", "filter"]) node.style.setProperty(prop, "none", "important");
    node.style.setProperty("opacity", "1", "important");
  });
}

function sync() {
  frame = 0;
  markRoot();
  normalizeThemeStudio();
  normalizeCodeEditor();
  normalizeNara();
  normalizeDomain();
  normalizeChrome();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "aria-expanded", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-variant", "data-studio-desktop-site-phone"],
});
for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) window.addEventListener(eventName, schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
schedule();
