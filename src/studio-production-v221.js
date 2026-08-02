import "./studio-production-v221.css";

const RELEASE = "studio-production-v221-20260802";
const MAX_CODE_LINES = 10000;
let frame = 0;

const GREEN_LABELS = Object.freeze({
  "top-left-1": "Header kiri · kotak 1",
  "top-right-1": "Header kanan · kotak 1",
  "top-left-2": "Header kiri · kotak 2",
  "top-right-2": "Header kanan · kotak 2",
  "top-left-3": "Navigasi / area atas",
  "top-right-3": "Kotak panjang di bawah header",
  "before-content": "Kotak di atas postingan",
  "sidebar-left-1": "Sidebar kiri · kotak 1",
  "sidebar-left-2": "Sidebar kiri · kotak 2",
  "sidebar-left-3": "Sidebar kiri · kotak 3",
  "sidebar-left-4": "Sidebar kiri · kotak 4",
  "sidebar-right-1": "Sidebar kanan · kotak 1",
  "sidebar-right-2": "Sidebar kanan · kotak 2",
  "sidebar-right-3": "Sidebar kanan · kotak 3",
  "sidebar-right-4": "Sidebar kanan · kotak 4",
  "after-content": "Kotak panjang di bawah postingan",
  "bottom-left-1": "Footer kiri · kotak 1",
  "bottom-right-1": "Footer kanan · kotak 1",
  "bottom-left-2": "Footer kiri · kotak 2",
  "bottom-right-2": "Footer kanan · kotak 2",
  "bottom-left-3": "Kotak footer panjang",
  "bottom-right-3": "Copyright / identitas situs",
});

function important(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function isPhysicalSmall() {
  const ua = navigator.userAgent || "";
  const uaMobile = navigator.userAgentData?.mobile === true || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua);
  const screenMin = Math.min(Number(screen?.width || innerWidth), Number(screen?.height || innerHeight));
  return uaMobile || screenMin < 768;
}

function familyV221() {
  const root = document.documentElement;
  // Browser "Situs desktop" is an explicit user choice and wins over physical-phone detection.
  if (root.dataset.studioDesktopSitePhone === "true") return "large";
  // A normal phone/app must never inherit a stale tablet/desktop dataset from an older authority.
  if (isPhysicalSmall()) return "small";
  const responsive = root.dataset.studioResponsiveMode || "";
  const variant = root.dataset.studioDeviceVariant || "";
  if (["tablet", "desktop"].includes(responsive)) return "large";
  if (["laptop", "desktop", "computer"].includes(variant)) return "large";
  return innerWidth >= 768 ? "large" : "small";
}

function normalizeRoot() {
  const root = document.documentElement;
  const family = familyV221();
  root.dataset.studioProductionV221 = RELEASE;
  root.dataset.studioV221Family = family;
  root.dataset.studioV220Family = family;
  root.dataset.studioV216PhysicalFamily = family;
  root.dataset.studioV219Small = String(family === "small");
  root.dataset.studioV221PhysicalSmall = String(isPhysicalSmall());
}

function normalizeLayout() {
  const map = document.querySelector("#ngeblogging-layout-map.tn-layout-studio,.tn-layout-studio[data-v212-layout-areas]");
  const canvas = map?.querySelector(".tn-layout-canvas-v170");
  if (!map || !canvas) return;
  const family = familyV221();
  map.dataset.v221Layout = "green-reference-four-four";
  map.dataset.v221Family = family;
  canvas.dataset.v221LayoutCanvas = family;
  // v213 used this attribute in a capture listener that deliberately blocked the
  // central Post/Page box. v221 owns the map now, so every visible box is interactive.
  canvas.removeAttribute("data-v212-layout-map");
  canvas.dataset.v221LayoutAuthority = "clickable-green-map";

  map.querySelectorAll(".tn-layout-studio-header>div>h2,.tn-layout-studio-header>div>p").forEach((node) => node.hidden = true);
  const kicker = map.querySelector(".tn-layout-studio-header small");
  if (kicker && kicker.textContent !== "PETA TATA LETAK SITUS") kicker.textContent = "PETA TATA LETAK SITUS";

  canvas.querySelectorAll(":scope>.tn-layout-slot-v170").forEach((slot) => {
    slot.dataset.v221Slot = slot.classList.contains("content-main") ? "content-main" : "widget-area";
    slot.removeAttribute("inert");
    slot.removeAttribute("aria-hidden");
    const actualArea = Object.keys(GREEN_LABELS).find((id) => slot.classList.contains(id));
    if (actualArea) {
      slot.dataset.v221Area = actualArea;
      const label = slot.querySelector(":scope>small");
      if (label && label.textContent !== GREEN_LABELS[actualArea]) label.textContent = GREEN_LABELS[actualArea];
      slot.setAttribute("aria-label", `${GREEN_LABELS[actualArea]}. Buka pilihan widget.`);
    }
  });

  const main = canvas.querySelector(":scope>.content-main");
  if (main) {
    main.dataset.v221Slot = "content-main";
    main.removeAttribute("inert");
    main.removeAttribute("aria-hidden");
    main.removeAttribute("aria-disabled");
    main.removeAttribute("tabindex");
    main.removeAttribute("data-v213-locked-content");
    main.setAttribute("aria-label", "Kotak postingan / Page. Buka pilihan widget untuk area di atas postingan.");
    main.setAttribute("title", "Kotak postingan / Page — buka pengaturan area");
    important(main, "pointer-events", "auto");
    const title = main.querySelector(":scope>small");
    if (title) title.textContent = "Kotak postingan / Page";
    const detail = main.querySelector(":scope>b");
    if (detail) detail.textContent = "Area utama situs";
  }
}

function normalizeWidgetModal() {
  document.querySelectorAll(".tn-widget-studio select").forEach((select) => {
    [...select.options].forEach((option) => {
      const next = GREEN_LABELS[option.value];
      if (next && option.textContent !== next) option.textContent = next;
    });
  });
  document.querySelectorAll(".tn-widget-studio[data-v209-preferred-area]").forEach((studio) => {
    studio.dataset.v221WidgetSync = "green-layout-area-aware";
  });
}

function normalizeCode() {
  const family = familyV221();
  document.querySelectorAll(".tn-modal-layer").forEach((layer) => {
    const workspace = layer.querySelector(".tn-code-workspace");
    if (!workspace) return;
    layer.dataset.v221ThemeCodeModal = family;
    workspace.dataset.v221Workspace = family === "small" ? "preview-above-code" : "split-50-50";
    workspace.dataset.v220Workspace = family === "small" ? "preview-above-code" : "split-50-50";
    layer.querySelectorAll(".tn-code-pane").forEach((pane) => {
      pane.dataset.v221CodePane = "line-numbered";
      const textarea = pane.querySelector(":scope>textarea");
      if (!textarea) return;
      textarea.setAttribute("wrap", "off");
      textarea.dataset.v221MaxLines = String(MAX_CODE_LINES);
      const count = Math.max(1, Math.min(MAX_CODE_LINES, String(textarea.value || "").split("\n").length));
      textarea.setAttribute("aria-description", `Editor kode dengan ${count} baris aktif, maksimal ${MAX_CODE_LINES.toLocaleString("id-ID")} baris.`);
      const status = pane.querySelector(".tn-code-status");
      if (status && !status.querySelector(".v221-line-cap")) {
        const cap = document.createElement("small");
        cap.className = "v221-line-cap";
        cap.textContent = "Maks. 10.000 baris";
        status.append(cap);
      }
    });
    workspace.querySelectorAll(".tn-code-preview-pane").forEach((preview) => preview.dataset.v221Preview = family);
  });
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v221Launcher = "square-icon";
    for (const prop of ["animation", "transition", "filter", "transform"]) important(launcher, prop, "none");
    important(launcher, "opacity", "1");
  }
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope>.nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v221NaraMode = full ? "modal" : "nonmodal";
  shell.dataset.v221NaraSize = size;
  shell.dataset.v221NaraFamily = familyV221();
  if (!full) {
    important(layer, "pointer-events", "none");
    important(layer, "background", "transparent");
    important(layer, "backdrop-filter", "none");
    important(layer, "-webkit-backdrop-filter", "none");
    important(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }
  shell.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.intelligence,.nara-select.model,.nara-attachment-menu-wrap").forEach((node) => {
    node.hidden = false;
    node.removeAttribute("inert");
    node.removeAttribute("aria-hidden");
    node.dataset.v221Control = "visible";
  });
  const menu = shell.querySelector(".nara-attachment-menu");
  if (menu) {
    menu.dataset.v221AttachmentMenu = "camera-photo-file-visible";
    important(menu, "display", "grid");
    important(menu, "visibility", "visible");
    important(menu, "opacity", "1");
    important(menu, "pointer-events", "auto");
    important(menu, "z-index", "2147484000");
  }
}

function normalizeDomain() {
  if (familyV221() !== "small") return;
  document.querySelectorAll(".sv124-domain-page button,.sv124-domain-page a").forEach((node) => {
    const text = String(node.textContent || "").replace(/\s+/g, " ").trim();
    if (/jadikan draf|terbitkan|hubungkan|verifikasi|muat ulang|refresh|salin|hapus|jadikan utama/i.test(text)) {
      node.dataset.v221DomainAction = "horizontal-full";
    }
  });
}

function normalizeStableChrome() {
  document.querySelectorAll(".sn-side,.sn-sidebar-toggle,.sn-mobile-menu-mark").forEach((node) => {
    node.dataset.v221Stable = "true";
    for (const prop of ["animation", "transition", "filter"]) important(node, prop, "none");
    important(node, "opacity", "1");
  });
  document.querySelectorAll(".sn-side-backdrop").forEach((node) => {
    important(node, "backdrop-filter", "none");
    important(node, "-webkit-backdrop-filter", "none");
  });
}

function sync() {
  frame = 0;
  normalizeRoot();
  normalizeLayout();
  normalizeWidgetModal();
  normalizeCode();
  normalizeNara();
  normalizeDomain();
  normalizeStableChrome();
}
function schedule() { if (!frame) frame = requestAnimationFrame(sync); }

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "aria-expanded", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-variant", "data-studio-desktop-site-phone"],
});
for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) window.addEventListener(eventName, schedule, { passive: true });
schedule();
