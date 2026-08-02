import "./studio-production-v214.css";

const RELEASE = "studio-production-v214-20260802";
const SMALL_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
const LARGE_FAMILIES = new Set(["tablet", "laptop", "desktop", "computer"]);
const TABLET_EDGE = 768;
let frame = 0;

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function shortEdge() {
  try {
    const values = [screen?.width, screen?.height, visualViewport?.width, visualViewport?.height]
      .map(finite).filter(Boolean);
    return values.length ? Math.min(...values) : 0;
  } catch {
    return 0;
  }
}

function responsiveFamily() {
  const root = document.documentElement;
  return root.dataset.studioResponsiveMode
    || root.dataset.studioDeviceVariant
    || root.dataset.studioResponsiveFamilyV193
    || "";
}

function interfaceFamily() {
  const root = document.documentElement;
  const family = responsiveFamily();
  const variant = root.dataset.studioDeviceVariant || "";
  const edge = shortEdge();

  // An explicit desktop-site request and a physical tablet are large surfaces.
  // Phones/apps/mobile/compact stay purpose-built small layouts instead of
  // receiving a scaled desktop page.
  if (root.dataset.studioDesktopSitePhone === "true"
      || root.dataset.studioDeviceMode === "large"
      || LARGE_FAMILIES.has(family)
      || LARGE_FAMILIES.has(variant)
      || (root.dataset.studioHandheld === "true" && edge >= TABLET_EDGE)) return "large";
  if (SMALL_FAMILIES.has(family) || SMALL_FAMILIES.has(variant)) return "small";
  if (navigator.userAgentData?.mobile === true) return edge >= TABLET_EDGE ? "large" : "small";
  if (/Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")) return "small";
  if (edge > 0) return edge >= TABLET_EDGE ? "large" : "small";
  return window.innerWidth >= TABLET_EDGE ? "large" : "small";
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

function normalizeSidebar() {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const toggle = document.querySelector(".sn-sidebar-toggle");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const main = document.querySelector(".sn-main");
  if (!sidebar) return;

  sidebar.dataset.v214Sidebar = "stable";
  sidebar.removeAttribute("inert");
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
  const family = interfaceFamily();
  const studio = document.querySelector(".tn-studio");
  if (studio) studio.dataset.v214ThemeFamily = family;

  document.querySelectorAll(".tn-hero-actions > button").forEach((button) => {
    button.removeAttribute("inert");
    button.removeAttribute("aria-hidden");
    if (button.dataset.v209ThemeAction) button.hidden = false;
  });

  document.querySelectorAll(".tn-modal-layer").forEach((layer) => {
    const modal = layer.querySelector(":scope > .tn-modal");
    if (!modal) return;
    layer.dataset.v214Modal = modal.classList.contains("fullscreen") ? "code" : "standard";
    layer.removeAttribute("inert");
    layer.removeAttribute("aria-hidden");
    modal.hidden = false;
    modal.removeAttribute("hidden");
    modal.removeAttribute("inert");
    modal.removeAttribute("aria-hidden");
  });

  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    workspace.dataset.v214Workspace = family === "large" ? "split-50-50" : "preview-above-code";
    workspace.querySelectorAll("button,textarea,select").forEach((control) => {
      control.removeAttribute("inert");
      control.removeAttribute("aria-hidden");
    });
  });

  document.querySelectorAll(".tn-frame-shell[data-preview-device]").forEach((frameShell) => {
    frameShell.dataset.v214Preview = family === "large" ? "native-width" : "fit-small-surface";
  });

  const layout = document.querySelector(".tn-layout-studio");
  const canvas = layout?.querySelector(".tn-layout-canvas-v170");
  if (layout && canvas) {
    layout.dataset.v214Layout = family === "large" ? "large-four-plus-four" : "small-paired-four-plus-four";
    canvas.dataset.v214LayoutCanvas = family;
    canvas.querySelectorAll(".tn-layout-slot-v170").forEach((slot) => {
      slot.dataset.v214Slot = slot.classList.contains("content-main") ? "locked-content" : "widget";
      slot.removeAttribute("inert");
      slot.removeAttribute("aria-hidden");
      slot.querySelectorAll("span,small,b").forEach(horizontal);
    });
  }

  document.querySelectorAll(".tn-widget-grid > article").forEach((article) => {
    if (/html\s*\/\s*javascript|html\/javascript/i.test(article.textContent || "")) {
      article.dataset.v214CustomWidget = "html-javascript";
      article.hidden = false;
      article.removeAttribute("hidden");
    }
  });
}

function normalizeNara() {
  const family = interfaceFamily();
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
  layer.dataset.v214Mode = full ? "modal" : "nonmodal";
  shell.dataset.v214Size = size;
  shell.dataset.v214Family = family;
  layer.setAttribute("aria-modal", String(full));
  shell.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.inert = !full;
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
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("hidden");
    close.removeAttribute("inert");
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara AI");
    close.dataset.v214Close = "visible";
  }

  const wrap = shell.querySelector(".nara-attachment-menu-wrap");
  const plus = wrap?.querySelector(":scope > button");
  const menu = wrap?.querySelector(":scope > .nara-attachment-menu");
  if (wrap) wrap.dataset.v214Attachments = menu ? "open" : "closed";
  if (plus) {
    plus.hidden = false;
    plus.disabled = false;
    plus.removeAttribute("hidden");
    plus.removeAttribute("inert");
    plus.removeAttribute("aria-hidden");
    plus.setAttribute("aria-haspopup", "menu");
    plus.setAttribute("aria-expanded", String(Boolean(menu)));
    plus.setAttribute("aria-label", "Tambah Kamera, Foto, atau File");
  }
  if (menu) {
    menu.dataset.v214AttachmentMenu = "camera-photo-file";
    menu.hidden = false;
    menu.removeAttribute("hidden");
    menu.removeAttribute("inert");
    menu.removeAttribute("aria-hidden");
    menu.querySelectorAll("button").forEach((button) => {
      button.hidden = false;
      button.disabled = false;
      button.removeAttribute("hidden");
      button.removeAttribute("inert");
      button.removeAttribute("aria-hidden");
    });
  }

  shell.querySelectorAll(".nara-select.intelligence,.nara-select.model").forEach((control) => {
    control.hidden = false;
    control.removeAttribute("hidden");
    control.removeAttribute("aria-hidden");
    control.dataset.v214Control = "visible";
  });
}

function normalizeDomain() {
  const page = document.querySelector(".sv124-domain-page");
  if (!page) return;
  const family = interfaceFamily();
  page.dataset.v214Domain = family;
  page.querySelectorAll("h1,h2,h3,p,b,small,label,span,code").forEach(horizontal);
  page.querySelectorAll("button,a").forEach((node) => {
    const label = String(node.textContent || "").replace(/\s+/g, " ").trim();
    if (/jadikan draf|terbitkan|buka|hubungkan domain|muat ulang|verifikasi|refresh|salin/i.test(label)) {
      node.dataset.v214DomainAction = "horizontal";
      horizontal(node);
      setImportant(node, "white-space", "nowrap");
    }
  });
}

function normalizeAnalytics() {
  const family = interfaceFamily();
  document.querySelectorAll(".op41-host,.op41-panel").forEach((panel) => panel.dataset.v214Analytics = family);
  document.querySelectorAll(".op41-line-v213").forEach((chart) => chart.dataset.v214Chart = "large-smooth-real-series");
  document.querySelectorAll(".op41-donut").forEach((chart) => chart.dataset.v214Donut = "readable-real-breakdown");
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*", ".tn-studio", ".tn-studio>*",
    ".tn-modal", ".tn-modal-body", ".tn-code-workspace", ".tn-code-pane", ".tn-code-preview-pane",
    ".tn-layout-studio", ".tn-layout-canvas-v170", ".ce-app", ".ce-app>*", ".mv176-page",
    ".sv124-page", ".sn-api-page", ".op41-host", ".op41-panel",
  ].join(",")).forEach((node) => {
    setImportant(node, "min-width", "0");
    setImportant(node, "max-width", "100%");
  });
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  root.dataset.studioProductionV214 = RELEASE;
  root.dataset.studioV214Family = interfaceFamily();
  normalizeSidebar();
  normalizeTheme();
  normalizeNara();
  normalizeDomain();
  normalizeAnalytics();
  normalizeContainment();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    "class", "hidden", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-mode",
    "data-studio-device-variant", "data-studio-handheld", "data-studio-desktop-site-phone", "data-preview-device",
  ],
});
for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) {
  window.addEventListener(eventName, schedule, { passive: true });
}
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
sync();

export {
  RELEASE,
  TABLET_EDGE,
  interfaceFamily,
  normalizeSidebar,
  normalizeTheme,
  normalizeNara,
  normalizeDomain,
  normalizeAnalytics,
  normalizeContainment,
  sync,
};
