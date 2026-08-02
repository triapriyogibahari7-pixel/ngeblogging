import "./studio-production-v219.css";

const RELEASE = "studio-production-v219-20260802";
const MAX_CODE_LINES = 10000;
let frame = 0;

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function physicalShortEdge() {
  try {
    const values = [screen?.width, screen?.height, window.visualViewport?.width, window.visualViewport?.height]
      .map(finite)
      .filter(Boolean);
    return values.length ? Math.min(...values) : Math.min(window.innerWidth || 0, window.innerHeight || 0);
  } catch {
    return Math.min(window.innerWidth || 0, window.innerHeight || 0);
  }
}

function installedApp() {
  try {
    return window.matchMedia?.("(display-mode: standalone)")?.matches
      || window.matchMedia?.("(display-mode: fullscreen)")?.matches
      || navigator.standalone === true;
  } catch {
    return false;
  }
}

function responsiveFamily() {
  if (installedApp()) return "application";
  const edge = physicalShortEdge();
  const touch = Number(navigator.maxTouchPoints || 0) > 0;
  const handheld = navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "");
  if ((touch || handheld) && edge && edge <= 430) return "phone";
  if ((touch || handheld) && edge && edge <= 560) return "mobile";
  if ((touch || handheld) && edge && edge < 768) return "compact";
  if (touch && edge && edge < 1100) return "tablet";
  if (window.innerWidth < 768 && (touch || handheld)) return "compact";
  return "desktop";
}

function desktopVariant() {
  const width = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
  if (width <= 1366) return "laptop";
  if (width <= 1680) return "desktop";
  return "computer";
}

function smallDevice() {
  return ["application", "phone", "mobile", "compact"].includes(responsiveFamily());
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

function markRoot() {
  const root = document.documentElement;
  const family = responsiveFamily();
  root.dataset.studioProductionV219 = RELEASE;
  root.dataset.studioV219Family = family;
  root.dataset.studioV219Small = String(["application", "phone", "mobile", "compact"].includes(family));
  root.dataset.studioV219DesktopVariant = family === "desktop" ? desktopVariant() : family;
}

function updateLineNumbers(textarea, gutter) {
  if (!textarea || !gutter) return;
  const count = Math.max(1, Math.min(MAX_CODE_LINES, String(textarea.value || "").split("\n").length));
  if (gutter.dataset.v219LineCount !== String(count)) {
    gutter.dataset.v219LineCount = String(count);
    gutter.textContent = Array.from({ length: count }, (_, index) => String(index + 1)).join("\n");
  }
  gutter.scrollTop = textarea.scrollTop;
}

function ensureLineNumbers(pane) {
  const textarea = pane?.querySelector(":scope > textarea");
  if (!textarea) return;
  let gutter = pane.querySelector(":scope > .v216-code-line-gutter, :scope > .v219-code-line-gutter");
  if (!gutter) {
    gutter = document.createElement("pre");
    gutter.className = "v219-code-line-gutter";
    gutter.setAttribute("aria-hidden", "true");
    pane.insertBefore(gutter, textarea);
  }
  if (textarea.dataset.v219LineListener !== "true") {
    textarea.dataset.v219LineListener = "true";
    textarea.addEventListener("input", () => updateLineNumbers(textarea, gutter));
    textarea.addEventListener("scroll", () => updateLineNumbers(textarea, gutter), { passive: true });
  }
  textarea.dataset.v219LineNumbers = `1-${MAX_CODE_LINES}`;
  updateLineNumbers(textarea, gutter);

  const status = pane.querySelector(":scope > .tn-code-status");
  if (status && !status.querySelector(".v219-code-capacity")) {
    const capacity = document.createElement("span");
    capacity.className = "v219-code-capacity";
    capacity.textContent = "1–10.000 baris didukung";
    status.append(capacity);
  }
}

function normalizeTheme() {
  document.querySelectorAll(".tn-studio").forEach((studio) => {
    studio.dataset.v219ThemeSurface = "visible";
    studio.hidden = false;
    studio.removeAttribute("hidden");
    studio.removeAttribute("inert");
    studio.removeAttribute("aria-hidden");
    setImportant(studio, "visibility", "visible");
    setImportant(studio, "opacity", "1");
  });

  document.querySelectorAll(".tn-layout-studio-header > div > h2, .tn-layout-studio-header > div > p").forEach((node) => {
    node.dataset.v219LayoutProse = "hidden";
  });

  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    const small = smallDevice();
    workspace.dataset.v219Workspace = small ? "preview-above-code" : "split-50-50";
    workspace.querySelectorAll(".tn-code-pane").forEach((pane) => {
      pane.dataset.v219CodePane = "readable";
      ensureLineNumbers(pane);
    });
    workspace.querySelectorAll(".tn-code-preview-pane").forEach((preview) => {
      preview.dataset.v219PreviewPane = small ? "compact" : "half";
    });
  });

  document.querySelectorAll(".tn-modal-layer").forEach((layer) => {
    const modal = layer.querySelector(":scope > .tn-modal");
    if (!modal) return;
    layer.removeAttribute("inert");
    layer.removeAttribute("aria-hidden");
    modal.removeAttribute("inert");
    modal.removeAttribute("aria-hidden");
    if (layer.querySelector(".tn-code-workspace")) {
      layer.dataset.v219ThemeCodeModal = smallDevice() ? "small" : "large";
      modal.dataset.v219ThemeCode = "visible";
      const close = modal.querySelector(":scope > header button[aria-label='Tutup']");
      if (close) {
        close.hidden = false;
        close.removeAttribute("hidden");
        close.removeAttribute("inert");
        close.dataset.v219Close = "visible";
      }
    }
  });

  const map = document.querySelector("#ngeblogging-layout-map.tn-layout-studio, .tn-layout-studio[data-v212-layout-areas]");
  const canvas = map?.querySelector(".tn-layout-canvas-v170");
  if (map && canvas) {
    map.dataset.v219Layout = smallDevice() ? "compact-four-four" : "large-four-four";
    canvas.dataset.v219LayoutCanvas = smallDevice() ? "compact" : "large";
    const left = canvas.querySelectorAll(".sidebar-left-1,.sidebar-left-2,.sidebar-left-3,.sidebar-left-4");
    const right = canvas.querySelectorAll(".sidebar-right-1,.sidebar-right-2,.sidebar-right-3,.sidebar-right-4");
    map.dataset.v219LeftSlots = String(left.length);
    map.dataset.v219RightSlots = String(right.length);
    canvas.querySelectorAll(".tn-layout-slot-v170").forEach((slot) => {
      slot.removeAttribute("inert");
      slot.removeAttribute("aria-hidden");
      slot.dataset.v219Slot = "clickable";
      slot.querySelectorAll("span,small,b,strong").forEach(horizontal);
    });
  }
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v219Stable = "true";
    for (const property of ["animation", "transition", "filter", "transform"]) setImportant(launcher, property, "none");
    setImportant(launcher, "opacity", "1");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v219NaraMode = full ? "modal" : "nonmodal";
  shell.dataset.v219NaraSize = size;
  layer.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.inert = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
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
    close.removeAttribute("hidden");
    close.removeAttribute("inert");
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara AI");
    close.dataset.v219Close = "visible";
  }

  shell.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.intelligence,.nara-select.model,.nara-composer-tools").forEach((control) => {
    control.hidden = false;
    control.removeAttribute("hidden");
    control.removeAttribute("inert");
    control.removeAttribute("aria-hidden");
    control.dataset.v219Control = "visible";
  });

  const wrap = shell.querySelector(".nara-attachment-menu-wrap");
  const plus = wrap?.querySelector(":scope > button");
  const menu = wrap?.querySelector(":scope > .nara-attachment-menu");
  if (wrap) wrap.dataset.v219AttachmentWrap = "visible";
  if (plus) {
    plus.hidden = false;
    plus.removeAttribute("hidden");
    plus.removeAttribute("inert");
    plus.removeAttribute("aria-hidden");
    plus.setAttribute("aria-haspopup", "menu");
    plus.setAttribute("aria-expanded", String(Boolean(menu)));
    plus.setAttribute("aria-label", "Tambah Kamera, Foto, atau File");
    plus.dataset.v219Plus = "visible";
  }
  if (menu && plus) {
    menu.dataset.v219AttachmentMenu = "camera-photo-file";
    menu.setAttribute("role", "menu");
    menu.hidden = false;
    menu.removeAttribute("hidden");
    menu.removeAttribute("inert");
    menu.removeAttribute("aria-hidden");
    const rect = plus.getBoundingClientRect();
    const width = Math.min(300, Math.max(220, window.innerWidth - 24));
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left));
    const top = Math.max(12, rect.top - 198);
    setImportant(menu, "position", "fixed");
    setImportant(menu, "left", `${left}px`);
    setImportant(menu, "right", "auto");
    setImportant(menu, "top", `${top}px`);
    setImportant(menu, "bottom", "auto");
    setImportant(menu, "width", `${width}px`);
    setImportant(menu, "max-width", "calc(100vw - 24px)");
    setImportant(menu, "z-index", "2147483900");
    menu.querySelectorAll("button").forEach((button) => {
      button.hidden = false;
      button.removeAttribute("hidden");
      button.removeAttribute("inert");
      button.removeAttribute("aria-hidden");
      button.setAttribute("role", "menuitem");
    });
  }
}

function normalizeDomain() {
  const page = document.querySelector(".sv124-domain-page");
  if (!page) return;
  page.dataset.v219Domain = smallDevice() ? "small" : "large";
  page.querySelectorAll("h1,h2,h3,p,b,strong,small,label,span,code,a").forEach(horizontal);
  page.querySelectorAll("button,a").forEach((node) => {
    const label = String(node.textContent || "").replace(/\s+/g, " ").trim();
    if (/jadikan draf|terbitkan|buka|hubungkan domain|muat ulang|verifikasi|refresh|salin|hapus|jadikan utama|audit/i.test(label)) {
      node.dataset.v219DomainAction = "full-horizontal";
      horizontal(node);
    }
  });
}

function normalizeAnalytics() {
  document.querySelectorAll(".op41-host,.op41-panel,.op41-card").forEach((node) => {
    node.dataset.v219Analytics = smallDevice() ? "small" : "large";
  });
  document.querySelectorAll(".op41-line,.op41-line-v213").forEach((node) => { node.dataset.v219Chart = "detail-line"; });
  document.querySelectorAll(".op41-donut").forEach((node) => { node.dataset.v219Donut = "detail-donut"; });
}

function normalizeSidebar() {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const toggle = document.querySelector(".sn-sidebar-toggle");
  const mark = document.querySelector(".sn-mobile-menu-mark");
  const backdrop = document.querySelector(".sn-side-backdrop");
  for (const node of [sidebar, toggle, mark]) {
    if (!node) continue;
    node.dataset.v219Stable = "true";
    for (const property of ["animation", "transition", "filter"]) setImportant(node, property, "none");
    setImportant(node, "opacity", "1");
  }
  for (const node of [toggle, mark]) {
    if (!node) continue;
    setImportant(node, "place-items", "center");
    setImportant(node, "align-items", "center");
    setImportant(node, "justify-content", "center");
  }
  sidebar?.removeAttribute("inert");
  sidebar?.querySelectorAll("button,a,input,select,textarea").forEach((node) => node.removeAttribute("inert"));
  if (backdrop) {
    setImportant(backdrop, "backdrop-filter", "none");
    setImportant(backdrop, "-webkit-backdrop-filter", "none");
    setImportant(backdrop, "filter", "none");
  }
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-shell", ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*",
    ".tn-studio", ".tn-studio>*", ".tn-modal", ".tn-modal-body", ".tn-code-workspace",
    ".tn-code-pane", ".tn-code-preview-pane", ".tn-layout-studio", ".tn-layout-canvas-v170",
    ".sv124-domain-page", ".op41-host", ".op41-panel", ".op41-card",
  ].join(",")).forEach((node) => {
    setImportant(node, "min-width", "0");
    setImportant(node, "max-width", "100%");
  });
}

function sync() {
  frame = 0;
  markRoot();
  normalizeTheme();
  normalizeNara();
  normalizeDomain();
  normalizeAnalytics();
  normalizeSidebar();
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
  responsiveFamily,
  desktopVariant,
  normalizeTheme,
  normalizeNara,
  normalizeDomain,
  normalizeAnalytics,
  normalizeSidebar,
  sync,
};
