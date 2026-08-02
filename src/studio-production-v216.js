import "./studio-production-v216.css";

const RELEASE = "studio-production-v216-20260802";
const MAX_CODE_LINES = 10000;
let animationFrame = 0;

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function physicalShortEdge() {
  try {
    const values = [screen?.width, screen?.height]
      .map(finite)
      .filter(Boolean);
    return values.length ? Math.min(...values) : Math.min(window.innerWidth || 0, window.innerHeight || 0);
  } catch {
    return Math.min(window.innerWidth || 0, window.innerHeight || 0);
  }
}

function physicalFamily() {
  const edge = physicalShortEdge();
  const touch = Number(navigator.maxTouchPoints || 0) > 0;
  const handheldUa = navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "");
  if ((touch || handheldUa) && edge && edge < 768) return "small";
  if (window.innerWidth < 768 && (touch || handheldUa)) return "small";
  return "large";
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
  root.dataset.studioProductionV216 = RELEASE;
  root.dataset.studioV216PhysicalFamily = physicalFamily();
  root.dataset.studioV216ThemeEditor = physicalFamily() === "small" ? "preview-above-code" : "split-50-50";
}

function normalizeSidebar() {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const toggle = document.querySelector(".sn-sidebar-toggle");
  const mobileMark = document.querySelector(".sn-mobile-menu-mark");
  const launcher = document.querySelector(".nara-floating-button");
  for (const node of [sidebar, toggle, mobileMark, launcher]) {
    if (!node) continue;
    node.dataset.v216Stable = "true";
    for (const property of ["animation", "transition", "filter"]) setImportant(node, property, "none");
    setImportant(node, "opacity", "1");
  }
  for (const node of [toggle, mobileMark, launcher]) {
    if (!node) continue;
    setImportant(node, "place-items", "center");
    setImportant(node, "align-items", "center");
    setImportant(node, "justify-content", "center");
  }
}

function lineCount(value) {
  const count = String(value || "").split("\n").length;
  return Math.max(1, Math.min(MAX_CODE_LINES, count));
}

function updateLineNumbers(textarea, gutter) {
  if (!textarea || !gutter) return;
  const count = lineCount(textarea.value);
  if (gutter.dataset.v216LineCount !== String(count)) {
    gutter.dataset.v216LineCount = String(count);
    gutter.textContent = Array.from({ length: count }, (_, index) => String(index + 1)).join("\n");
  }
  gutter.scrollTop = textarea.scrollTop;
}

function installLineNumbers(pane, textarea) {
  if (!pane || !textarea) return;
  let gutter = pane.querySelector(":scope > .v216-code-line-gutter");
  if (!gutter) {
    gutter = document.createElement("pre");
    gutter.className = "v216-code-line-gutter";
    gutter.setAttribute("aria-hidden", "true");
    pane.insertBefore(gutter, textarea);
  }
  if (textarea.dataset.v216LineListener !== "true") {
    textarea.dataset.v216LineListener = "true";
    textarea.addEventListener("input", () => updateLineNumbers(textarea, gutter));
    textarea.addEventListener("scroll", () => updateLineNumbers(textarea, gutter), { passive: true });
  }
  textarea.dataset.v216LineNumbers = `1-${MAX_CODE_LINES}`;
  updateLineNumbers(textarea, gutter);
}

function normalizeThemeEditor() {
  const small = physicalFamily() === "small";
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    workspace.dataset.v216Workspace = small ? "preview-above-code" : "split-50-50";
    workspace.querySelectorAll(".tn-code-pane").forEach((pane) => {
      pane.dataset.v216CodePane = "readable-lines";
      const textarea = pane.querySelector("textarea");
      if (textarea) installLineNumbers(pane, textarea);
    });
    workspace.querySelectorAll(".tn-code-preview-pane").forEach((preview) => {
      preview.dataset.v216PreviewPane = small ? "compact-preview" : "half-preview";
    });
  });

  document.querySelectorAll(".tn-modal-layer").forEach((layer) => {
    if (!layer.querySelector(".tn-code-workspace")) return;
    layer.dataset.v216Modal = "theme-code";
    const modal = layer.querySelector(":scope > .tn-modal");
    if (modal) modal.dataset.v216ModalPhysical = small ? "small" : "large";
  });

  document.querySelectorAll(".tn-device-switch").forEach((switcher) => {
    switcher.dataset.v216DeviceSwitch = "scrollable-eight-modes";
  });
}

function normalizeThemeLayout() {
  const small = physicalFamily() === "small";
  const layout = document.querySelector("#ngeblogging-layout-map.tn-layout-studio,.tn-layout-studio[data-v212-layout-areas]");
  const canvas = layout?.querySelector(".tn-layout-canvas-v170");
  if (!layout || !canvas) return;
  layout.dataset.v216Layout = small ? "small-compact-four-plus-four" : "large-four-plus-four";
  canvas.dataset.v216LayoutCanvas = small ? "small" : "large";
  canvas.querySelectorAll(":scope > .tn-layout-slot-v170").forEach((slot) => {
    slot.dataset.v216Slot = slot.classList.contains("content-main") ? "content-main" : "widget-area";
    for (const property of ["position", "inset", "transform"]) slot.style.removeProperty(property);
    slot.querySelectorAll("span,small,b").forEach(horizontal);
  });
  layout.querySelectorAll("h1,h2,h3,p,small,b,span").forEach(horizontal);
}

function normalizeNara() {
  const small = physicalFamily() === "small";
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v216NaraMode = full ? "modal" : "nonmodal";
  shell.dataset.v216NaraSize = size;
  shell.dataset.v216NaraPhysical = small ? "small" : "large";
  layer.setAttribute("aria-modal", String(full));

  if (!full) {
    setImportant(layer, "pointer-events", "none");
    setImportant(layer, "background", "transparent");
    setImportant(layer, "backdrop-filter", "none");
    setImportant(layer, "-webkit-backdrop-filter", "none");
    setImportant(shell, "pointer-events", "auto");
    setImportant(shell, "overflow", "visible");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }

  const close = shell.querySelector('button[title="Tutup"],button[aria-label="Tutup Nara AI"],button[aria-label="Tutup Nara"]');
  if (close) {
    close.removeAttribute("hidden");
    close.removeAttribute("inert");
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara AI");
    close.dataset.v216Close = "visible";
  }

  shell.querySelectorAll(".nara-select.intelligence,.nara-select.model,.nara-auto-voice-v148,.nara-size-controls-v147").forEach((control) => {
    control.removeAttribute("hidden");
    control.removeAttribute("inert");
    control.removeAttribute("aria-hidden");
    control.dataset.v216Control = "visible";
  });

  const wrap = shell.querySelector(".nara-attachment-menu-wrap");
  const plus = wrap?.querySelector(":scope > button");
  const menu = wrap?.querySelector(":scope > .nara-attachment-menu");
  if (plus) {
    plus.removeAttribute("hidden");
    plus.removeAttribute("inert");
    plus.removeAttribute("aria-hidden");
    plus.setAttribute("aria-haspopup", "menu");
    plus.setAttribute("aria-expanded", String(Boolean(menu)));
    plus.setAttribute("aria-label", "Tambah Kamera, Foto, atau File");
    plus.dataset.v216Plus = "visible";
  }
  if (menu && plus) {
    menu.dataset.v216AttachmentMenu = "camera-photo-file";
    menu.setAttribute("role", "menu");
    menu.removeAttribute("hidden");
    menu.removeAttribute("inert");
    menu.removeAttribute("aria-hidden");
    const rect = plus.getBoundingClientRect();
    const width = Math.min(286, Math.max(220, window.innerWidth - 24));
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left));
    const top = Math.max(12, rect.top - 188);
    setImportant(menu, "position", "fixed");
    setImportant(menu, "left", `${left}px`);
    setImportant(menu, "right", "auto");
    setImportant(menu, "top", `${top}px`);
    setImportant(menu, "bottom", "auto");
    setImportant(menu, "width", `${width}px`);
    setImportant(menu, "max-width", "calc(100vw - 24px)");
    setImportant(menu, "z-index", "2147483646");
    menu.querySelectorAll("button").forEach((button) => {
      button.removeAttribute("hidden");
      button.removeAttribute("inert");
      button.removeAttribute("aria-hidden");
    });
  }
}

function normalizeDomain() {
  const small = physicalFamily() === "small";
  const page = document.querySelector(".sv124-domain-page");
  if (!page) return;
  page.dataset.v216Domain = small ? "small" : "large";
  page.querySelectorAll("h1,h2,h3,p,b,strong,small,label,span,code").forEach(horizontal);
  page.querySelectorAll("button,a").forEach((node) => {
    const label = String(node.textContent || "").replace(/\s+/g, " ").trim();
    if (/jadikan draf|terbitkan|buka|hubungkan domain|muat ulang|verifikasi|refresh|salin|hapus|jadikan utama|audit/i.test(label)) {
      node.dataset.v216DomainAction = "horizontal-full";
      horizontal(node);
    }
  });
}

function normalizeAnalytics() {
  const small = physicalFamily() === "small";
  document.querySelectorAll(".op41-panel,.op41-card,.op41-host").forEach((node) => {
    node.dataset.v216Analytics = small ? "small" : "large";
  });
  document.querySelectorAll(".op41-line-v213,.op41-line").forEach((chart) => {
    chart.dataset.v216Chart = "stock-style-real-series";
  });
  document.querySelectorAll(".op41-donut").forEach((chart) => {
    chart.dataset.v216Donut = "large-real-breakdown";
  });
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*", ".ce-app", ".ce-app>*",
    ".tn-studio", ".tn-studio>*", ".tn-modal", ".tn-modal-body", ".tn-code-workspace",
    ".tn-code-pane", ".tn-code-preview-pane", ".tn-layout-studio", ".tn-layout-canvas-v170",
    ".sv124-domain-page", ".op41-host", ".op41-panel", ".op41-card",
  ].join(",")).forEach((node) => {
    setImportant(node, "min-width", "0");
    setImportant(node, "max-width", "100%");
  });
}

function sync() {
  animationFrame = 0;
  normalizeRoot();
  normalizeSidebar();
  normalizeThemeEditor();
  normalizeThemeLayout();
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
  MAX_CODE_LINES,
  physicalFamily,
  normalizeThemeEditor,
  normalizeThemeLayout,
  normalizeNara,
  normalizeDomain,
  normalizeAnalytics,
  sync,
};
