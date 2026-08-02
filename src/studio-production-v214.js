import "./studio-production-v214.css";

const RELEASE = "studio-production-v214-20260802";
const SMALL_MODES = new Set(["application", "phone", "mobile", "compact"]);
const LARGE_MODES = new Set(["tablet", "laptop", "desktop", "computer"]);
const TABLET_EDGE = 768;
let animationFrame = 0;

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function physicalShortEdge() {
  try {
    const values = [screen?.width, screen?.height, visualViewport?.width, visualViewport?.height]
      .map(finite)
      .filter(Boolean);
    return values.length ? Math.min(...values) : 0;
  } catch {
    return 0;
  }
}

function requestedMode() {
  const root = document.documentElement;
  const responsive = String(root.dataset.studioResponsiveMode || "");
  const variant = String(root.dataset.studioDeviceVariant || "");
  if (root.dataset.studioDesktopSitePhone === "true") return "desktop";
  if (LARGE_MODES.has(variant)) return variant;
  if (SMALL_MODES.has(variant)) return variant;
  if (responsive === "desktop") return variant === "computer" ? "computer" : variant === "laptop" ? "laptop" : "desktop";
  if (responsive === "tablet") return "tablet";
  if (SMALL_MODES.has(responsive)) return responsive;
  if (root.dataset.studioDeviceMode === "large") return window.innerWidth >= 1600 ? "computer" : window.innerWidth >= 1180 ? "desktop" : "tablet";

  const edge = physicalShortEdge();
  if (root.dataset.studioHandheld === "true" || navigator.userAgentData?.mobile === true || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")) {
    if (edge >= TABLET_EDGE) return "tablet";
    if (edge && edge <= 375) return "phone";
    if (edge && edge <= 430) return "mobile";
    return "compact";
  }
  if (window.matchMedia?.("(display-mode: standalone)")?.matches) return "application";
  if (window.innerWidth <= 375) return "phone";
  if (window.innerWidth <= 430) return "mobile";
  if (window.innerWidth <= 760) return "compact";
  if (window.innerWidth <= 1024) return "tablet";
  if (window.innerWidth <= 1440) return "laptop";
  if (window.innerWidth <= 1800) return "desktop";
  return "computer";
}

function family(mode = requestedMode()) {
  return LARGE_MODES.has(mode) ? "large" : "small";
}

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function horizontal(node) {
  if (!node) return;
  setImportant(node, "writing-mode", "horizontal-tb");
  setImportant(node, "text-orientation", "mixed");
  setImportant(node, "word-break", "normal");
}

function normalizeRoot() {
  const root = document.documentElement;
  const mode = requestedMode();
  root.dataset.studioProductionV214 = RELEASE;
  root.dataset.studioV214Mode = mode;
  root.dataset.studioV214Family = family(mode);
}

function normalizeSidebar() {
  const root = document.documentElement;
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const main = document.querySelector(".sn-main");
  const toggle = document.querySelector(".sn-sidebar-toggle");
  const backdrop = document.querySelector(".sn-side-backdrop");
  if (!sidebar) return;

  sidebar.dataset.v214Sidebar = root.dataset.studioV214Family || "small";
  sidebar.removeAttribute("inert");
  sidebar.removeAttribute("aria-hidden");
  for (const property of ["animation", "transition", "filter", "backdrop-filter", "-webkit-backdrop-filter"]) {
    setImportant(sidebar, property, "none");
  }
  sidebar.querySelectorAll("button,a,input,select,textarea").forEach((control) => {
    control.removeAttribute("inert");
    control.removeAttribute("aria-hidden");
  });

  if (toggle) {
    toggle.dataset.v214Toggle = "centered";
    setImportant(toggle, "animation", "none");
    setImportant(toggle, "transition", "none");
    setImportant(toggle, "filter", "none");
  }
  if (backdrop) {
    backdrop.dataset.v214Backdrop = "outside-only";
    setImportant(backdrop, "background", "transparent");
    setImportant(backdrop, "filter", "none");
    setImportant(backdrop, "backdrop-filter", "none");
    setImportant(backdrop, "-webkit-backdrop-filter", "none");
  }
  if (main) {
    main.removeAttribute("inert");
    setImportant(main, "filter", "none");
    setImportant(main, "opacity", "1");
  }
}

function normalizeTheme() {
  const currentFamily = family();
  const studio = document.querySelector(".tn-studio");
  if (studio) studio.dataset.v214ThemeFamily = currentFamily;

  document.querySelectorAll(".tn-hero-actions > button").forEach((button) => {
    button.removeAttribute("inert");
    button.removeAttribute("aria-hidden");
  });

  document.querySelectorAll(".tn-modal-layer").forEach((layer) => {
    const modal = layer.querySelector(":scope > .tn-modal");
    if (!modal) return;
    const codeWorkspace = modal.querySelector(".tn-code-workspace");
    layer.dataset.v214Modal = codeWorkspace ? "code" : "standard";
    modal.removeAttribute("inert");
    modal.removeAttribute("aria-hidden");
  });

  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    workspace.dataset.v214Workspace = currentFamily === "large" ? "split-50-50" : "preview-above-code";
    workspace.querySelectorAll("button,textarea,select").forEach((control) => {
      control.removeAttribute("inert");
      control.removeAttribute("aria-hidden");
    });
  });

  document.querySelectorAll(".tn-frame-shell[data-preview-device]").forEach((frameShell) => {
    frameShell.dataset.v214Preview = currentFamily === "large" ? "large-preview" : "small-fit-preview";
  });

  const layout = document.querySelector("#ngeblogging-layout-map.tn-layout-studio,.tn-layout-studio[data-v212-layout-areas]");
  const canvas = layout?.querySelector(".tn-layout-canvas-v170");
  if (layout && canvas) {
    layout.dataset.v214Layout = currentFamily === "large" ? "large-four-left-four-right" : "small-paired-four-left-four-right";
    canvas.dataset.v214LayoutCanvas = currentFamily;
    canvas.querySelectorAll(":scope > .tn-layout-slot-v170").forEach((slot) => {
      const mainContent = slot.classList.contains("content-main");
      slot.dataset.v214Slot = mainContent ? "main-content" : "widget";
      slot.removeAttribute("inert");
      slot.removeAttribute("aria-hidden");
      slot.querySelectorAll("span,small,b").forEach(horizontal);
      if (mainContent) {
        slot.setAttribute("aria-disabled", "true");
        slot.setAttribute("tabindex", "-1");
      }
    });
  }

  document.querySelectorAll(".tn-widget-grid > article").forEach((article) => {
    if (/html\s*\/\s*javascript|html\/javascript/i.test(article.textContent || "")) {
      article.dataset.v214CustomWidget = "html-javascript";
      article.removeAttribute("hidden");
    }
  });
}

function normalizeNara() {
  const root = document.documentElement;
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v214Launcher = "stable-centered";
    for (const property of ["animation", "transition", "transform", "filter"]) setImportant(launcher, property, "none");
    setImportant(launcher, "opacity", "1");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  shell.dataset.v214Size = size;
  shell.dataset.v214Family = root.dataset.studioV214Family || family();
  layer.dataset.v214NaraMode = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.tabIndex = full ? 0 : -1;
    backdrop.setAttribute("aria-hidden", String(!full));
    if (!full) setImportant(backdrop, "display", "none");
    else backdrop.style.removeProperty("display");
  }
  if (!full) {
    setImportant(layer, "pointer-events", "none");
    setImportant(layer, "background", "transparent");
    setImportant(layer, "backdrop-filter", "none");
    setImportant(layer, "-webkit-backdrop-filter", "none");
    setImportant(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }

  const close = shell.querySelector('button[title="Tutup"],button[aria-label="Tutup Nara AI"],button[aria-label="Tutup Nara"]');
  if (close) {
    close.removeAttribute("hidden");
    close.removeAttribute("inert");
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara AI");
    close.dataset.v214Close = "visible";
  }

  const wrap = shell.querySelector(".nara-attachment-menu-wrap");
  const plus = wrap?.querySelector(":scope > button");
  const menu = wrap?.querySelector(":scope > .nara-attachment-menu");
  if (wrap) wrap.dataset.v214AttachmentState = menu ? "open" : "closed";
  if (plus) {
    plus.removeAttribute("hidden");
    plus.removeAttribute("inert");
    plus.removeAttribute("aria-hidden");
    plus.setAttribute("aria-haspopup", "menu");
    plus.setAttribute("aria-expanded", String(Boolean(menu)));
    plus.setAttribute("aria-label", "Tambah Kamera, Foto, atau File");
  }
  if (menu) {
    menu.dataset.v214AttachmentMenu = "camera-photo-file";
    menu.removeAttribute("hidden");
    menu.removeAttribute("inert");
    menu.removeAttribute("aria-hidden");
    menu.querySelectorAll("button").forEach((button) => {
      button.removeAttribute("hidden");
      button.removeAttribute("inert");
      button.removeAttribute("aria-hidden");
    });
  }

  shell.querySelectorAll(".nara-select.intelligence,.nara-select.model").forEach((control) => {
    control.removeAttribute("hidden");
    control.removeAttribute("aria-hidden");
    control.dataset.v214Control = "visible";
  });
}

function normalizeDomain() {
  const page = document.querySelector(".sv124-domain-page");
  if (!page) return;
  page.dataset.v214Domain = family();
  page.querySelectorAll("h1,h2,h3,p,b,small,label,span,code").forEach(horizontal);
  page.querySelectorAll("button,a").forEach((node) => {
    const label = String(node.textContent || "").replace(/\s+/g, " ").trim();
    if (/jadikan draf|terbitkan|buka|hubungkan domain|muat ulang|verifikasi|refresh|salin|hapus|jadikan utama/i.test(label)) {
      node.dataset.v214DomainAction = "horizontal";
      horizontal(node);
    }
  });
}

function normalizeAnalytics() {
  const currentFamily = family();
  document.querySelectorAll(".op41-host,.op41-panel,.op41-card").forEach((panel) => panel.dataset.v214Analytics = currentFamily);
  document.querySelectorAll(".op41-line-v213").forEach((chart) => chart.dataset.v214Chart = "large-real-timeseries");
  document.querySelectorAll(".op41-donut").forEach((chart) => chart.dataset.v214Donut = "large-real-breakdown");
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*", ".sn-content-card", ".sn-doc-row",
    ".ce-app", ".ce-app>*", ".ce-workspace", ".ce-paper-shell", ".ce-paper", ".ce-sidebar",
    ".tn-studio", ".tn-studio>*", ".tn-modal", ".tn-modal-body", ".tn-code-workspace", ".tn-code-pane", ".tn-code-preview-pane",
    ".tn-layout-studio", ".tn-layout-canvas-v170", ".mv176-page", ".sv124-page", ".sn-api-page", ".op41-host", ".op41-panel",
  ].join(",")).forEach((node) => {
    setImportant(node, "min-width", "0");
    setImportant(node, "max-width", "100%");
  });
}

function sync() {
  animationFrame = 0;
  normalizeRoot();
  normalizeSidebar();
  normalizeTheme();
  normalizeNara();
  normalizeDomain();
  normalizeAnalytics();
  normalizeContainment();
}

function schedule() {
  if (!animationFrame) animationFrame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    "class", "hidden", "aria-expanded", "data-nara-size", "data-preview-device",
    "data-studio-responsive-mode", "data-studio-device-mode", "data-studio-device-variant",
    "data-studio-handheld", "data-studio-desktop-site-phone",
  ],
});
for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) {
  window.addEventListener(eventName, schedule, { passive: true });
}
window.visualViewport?.addEventListener?.("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
sync();

export {
  RELEASE,
  SMALL_MODES,
  LARGE_MODES,
  TABLET_EDGE,
  requestedMode,
  family,
  normalizeSidebar,
  normalizeTheme,
  normalizeNara,
  normalizeDomain,
  normalizeAnalytics,
  normalizeContainment,
  sync,
};
