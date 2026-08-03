import "./studio-production-v231.css";

const RELEASE = "studio-production-v231-sidebar-theme-nara-final-20260803";
const MAX_CODE_LINES = 10000;
let frame = 0;

const LARGE_MODES = new Set(["tablet", "desktop", "laptop", "computer"]);
const SMALL_MODES = new Set(["application", "phone", "mobile", "compact"]);
const SLOT_LABELS = Object.freeze({
  "top-left-1": "Header kiri · kotak 1",
  "top-right-1": "Header kanan · kotak 1",
  "top-left-3": "Kotak panjang di bawah header",
  "top-left-2": "Header kiri · kotak 2",
  "top-right-2": "Header kanan · kotak 2",
  "top-right-3": "Area atas",
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
  "bottom-right-3": "Copyright",
});

function important(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function physicalHandheld() {
  const ua = navigator.userAgent || "";
  const mobileUa = navigator.userAgentData?.mobile === true || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua);
  const density = Math.max(1, Number(devicePixelRatio || 1));
  const normalize = (raw, fallback) => {
    const value = Number(raw || fallback || 1);
    if (value <= 900) return value;
    return density >= 1.25 ? value / density : fallback;
  };
  const shortSide = Math.min(normalize(screen?.width, innerWidth), normalize(screen?.height, innerHeight));
  return mobileUa || (Number(navigator.maxTouchPoints || 0) > 1 && shortSide <= 760);
}

function family() {
  const root = document.documentElement;
  const responsive = root.dataset.studioResponsiveMode || "";
  const variant = root.dataset.studioDeviceVariant || "";
  const explicitLarge = root.dataset.v229Family === "large"
    || root.dataset.v229ModeLock === "desktop-site-large-locked"
    || LARGE_MODES.has(responsive)
    || LARGE_MODES.has(variant);
  if (explicitLarge) return "large";
  if (SMALL_MODES.has(responsive) || SMALL_MODES.has(variant)) return "small";
  return physicalHandheld() ? "small" : (innerWidth >= 768 ? "large" : "small");
}

function setHidden(node, hidden) {
  if (!node) return;
  if (node.hidden !== hidden) node.hidden = hidden;
  node.setAttribute("aria-hidden", hidden ? "true" : "false");
  if (hidden) node.setAttribute("tabindex", "-1");
  else node.removeAttribute("tabindex");
}

function hideDuplicateSidebarControls(sidebar, topToggle) {
  const selectors = [
    ".v227-sidebar-fab",
    ".studio-external-sidebar-toggle",
    "[data-v173-collapse-toggle]",
    "[data-v187-sidebar-toggle]",
    "[data-v208-sidebar-toggle]",
    "[data-v223-sidebar-toggle]",
    "[data-v229-sidebar-toggle]",
    ".sn-desktop-sidebar-icon",
    ".sn-side-close",
  ].join(",");
  document.querySelectorAll(selectors).forEach((node) => {
    if (node === topToggle) return;
    setHidden(node, true);
    important(node, "display", "none");
    node.dataset.v231RemovedDuplicate = "true";
  });

  document.querySelectorAll("button,[role=button]").forEach((node) => {
    if (node === topToggle || sidebar.contains(node) || node.closest(".nara-assistant-layer")) return;
    const label = `${node.getAttribute("aria-label") || ""} ${node.getAttribute("title") || ""}`.toLowerCase();
    const text = String(node.textContent || "").trim().toLowerCase();
    const likelyLegacySidebar = text === "n" && /sidebar|menu|navigasi|buka|tutup/.test(label);
    if (!likelyLegacySidebar) return;
    setHidden(node, true);
    important(node, "display", "none");
    node.dataset.v231RemovedDuplicate = "true";
  });
}

function bindInternalLogo(sidebar, topToggle) {
  const logo = sidebar.querySelector(".sn-logo-mark");
  if (!logo || !topToggle) return;
  logo.dataset.v231SidebarToggle = "single-internal-n";
  logo.setAttribute("role", "button");
  logo.setAttribute("tabindex", "0");
  logo.setAttribute("aria-label", "Buka atau tutup menu Studio");
  if (logo.dataset.v231Bound === "true") return;
  logo.dataset.v231Bound = "true";
  const activate = (event) => {
    if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    topToggle.click();
  };
  logo.addEventListener("click", activate);
  logo.addEventListener("keydown", activate);
}

function normalizeSidebar() {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const topToggle = document.querySelector(".sn-sidebar-toggle");
  const main = document.querySelector(".sn-main");
  if (!sidebar || !main || !topToggle) return;
  const next = family();
  const drawerOpen = sidebar.classList.contains("mobile-open");
  const collapsed = sidebar.classList.contains("collapsed");
  document.documentElement.dataset.v231Family = next;
  sidebar.dataset.v231Sidebar = next === "small" ? (drawerOpen ? "mobile-open" : "mobile-closed") : (collapsed ? "desktop-icons" : "desktop-open");
  hideDuplicateSidebarControls(sidebar, topToggle);
  bindInternalLogo(sidebar, topToggle);

  const nav = sidebar.querySelector(":scope>nav");
  if (nav) {
    nav.dataset.v231MenuStack = "tight-under-create";
    important(nav, "justify-content", "flex-start");
    important(nav, "align-content", "start");
    important(nav, "gap", next === "small" ? "3px" : "2px");
    important(nav, "padding-top", "6px");
    important(nav, "overflow-y", "auto");
  }
  const footer = sidebar.querySelector(":scope>.sn-account-footer");
  if (footer) important(footer, "margin-top", "auto");

  if (next === "large") {
    setHidden(topToggle, true);
    important(topToggle, "display", "none");
    sidebar.classList.remove("mobile-open");
    sidebar.querySelectorAll(".sn-side-backdrop").forEach((node) => setHidden(node, true));
  } else {
    setHidden(topToggle, drawerOpen);
    important(topToggle, "display", drawerOpen ? "none" : "grid");
  }

  document.querySelectorAll(".sn-side-backdrop").forEach((node) => {
    important(node, "background", "transparent");
    important(node, "backdrop-filter", "none");
    important(node, "-webkit-backdrop-filter", "none");
    main.removeAttribute("inert");
  });
}

function normalizeLayoutMap() {
  const map = document.querySelector('#ngeblogging-layout-map[data-v226-layout-source="native-green-reference"],#ngeblogging-layout-map.tn-layout-studio');
  const canvas = map?.querySelector(".tn-layout-canvas-v170");
  if (!map || !canvas) return;
  const next = family();
  map.dataset.v231LayoutMap = "green-reference-interactive";
  canvas.dataset.v231LayoutCanvas = next === "small" ? "compact-same-blueprint" : "large-blueprint";
  map.querySelectorAll(".tn-layout-studio-header h2,.tn-layout-studio-header p").forEach((node) => setHidden(node, true));

  canvas.querySelectorAll(":scope>.tn-layout-slot-v170").forEach((slot) => {
    slot.hidden = false;
    slot.removeAttribute("inert");
    slot.removeAttribute("aria-hidden");
    slot.removeAttribute("aria-disabled");
    important(slot, "pointer-events", "auto");
    const key = Object.keys(SLOT_LABELS).find((id) => slot.classList.contains(id));
    if (!key) return;
    slot.dataset.v231LayoutArea = key;
    const small = slot.querySelector(":scope>small");
    if (small && small.textContent !== SLOT_LABELS[key]) small.textContent = SLOT_LABELS[key];
    slot.setAttribute("aria-label", `${SLOT_LABELS[key]}. Klik untuk mengatur widget.`);
  });

  const main = canvas.querySelector(":scope>.content-main");
  if (main) {
    main.hidden = false;
    main.removeAttribute("inert");
    main.removeAttribute("aria-hidden");
    important(main, "pointer-events", "auto");
    const label = main.querySelector("small");
    const detail = main.querySelector("b");
    if (label) label.textContent = "Kotak postingan / Page";
    if (detail) detail.textContent = "Konten utama";
  }

  const widgetSide = map.querySelector(":scope>.tn-layout-side");
  if (widgetSide) widgetSide.dataset.v231WidgetPanel = "full-width-below-map";
}

function updateLineGutter(textarea) {
  const pane = textarea.closest(".tn-code-pane");
  if (!pane) return;
  let gutter = pane.querySelector(":scope>.v222-code-line-gutter,:scope>.v231-code-line-gutter");
  if (!gutter) {
    gutter = document.createElement("pre");
    gutter.className = "v231-code-line-gutter";
    gutter.setAttribute("aria-hidden", "true");
    pane.insertBefore(gutter, textarea);
  }
  const actual = Math.max(1, String(textarea.value || "").split("\n").length);
  const shown = Math.min(MAX_CODE_LINES, actual);
  if (gutter.dataset.v231Count !== String(shown)) {
    gutter.dataset.v231Count = String(shown);
    gutter.textContent = Array.from({ length: shown }, (_, index) => String(index + 1)).join("\n");
  }
  gutter.scrollTop = textarea.scrollTop;
}

function normalizeCodeEditor() {
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    const next = family();
    workspace.dataset.v231CodeWorkspace = next === "small" ? "preview-top-code-bottom" : "code-left-preview-right";
    workspace.querySelectorAll(".tn-code-pane textarea").forEach((textarea) => {
      textarea.setAttribute("wrap", "off");
      textarea.setAttribute("spellcheck", "false");
      textarea.dataset.v231CodeEditor = "real-lines-up-to-10000";
      updateLineGutter(textarea);
      if (textarea.dataset.v231Bound !== "true") {
        textarea.dataset.v231Bound = "true";
        textarea.addEventListener("input", () => updateLineGutter(textarea));
        textarea.addEventListener("scroll", () => updateLineGutter(textarea), { passive: true });
      }
    });
    workspace.querySelectorAll(".tn-code-preview-pane").forEach((preview) => {
      preview.dataset.v231Preview = "centered-responsive";
    });
  });
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v231Launcher = "stable-centered";
    for (const prop of ["animation", "transition", "transform", "filter"]) important(launcher, prop, "none");
    important(launcher, "opacity", "1");
  }
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope>.nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v231NaraMode = full ? "modal" : "nonmodal";
  shell.dataset.v231NaraSize = size;
  shell.dataset.v231NaraFamily = family();
  if (!full) {
    important(layer, "pointer-events", "none");
    important(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }
  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    setHidden(backdrop, !full);
    if (!full) important(backdrop, "pointer-events", "none");
  }
  const menu = shell.querySelector(".nara-attachment-menu");
  if (menu) menu.dataset.v231AttachmentMenu = "camera-photo-file-visible";
  const intelligence = shell.querySelector('.nara-select.intelligence');
  const model = shell.querySelector('.nara-select.model');
  if (intelligence) intelligence.dataset.v231Control = "intelligence";
  if (model) model.dataset.v231Control = "model";
}

function normalizeDomain() {
  document.querySelectorAll(".sn-domain-page,.sv124-domain-page,.domain-page,[data-domain-page]").forEach((page) => {
    page.dataset.v231Domain = "responsive-actions";
    page.querySelectorAll("button,a").forEach((control) => {
      if (/jadikan|verifikasi|hubungkan|tambahkan|refresh|muat|hapus|domain/i.test(String(control.textContent || ""))) {
        control.dataset.v231DomainAction = "true";
      }
    });
  });
}

function normalizeAnalytics() {
  document.querySelectorAll(".op41-chart,.sn-analytics-chart,.analytics-chart,[data-analytics-chart]").forEach((chart) => {
    chart.dataset.v231AnalyticsChart = "large-detail";
  });
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  root.dataset.studioProductionV231 = RELEASE;
  normalizeSidebar();
  normalizeLayoutMap();
  normalizeCodeEditor();
  normalizeNara();
  normalizeDomain();
  normalizeAnalytics();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "data-nara-size", "data-v229-family", "data-studio-responsive-mode", "data-studio-device-variant"],
});
for (const eventName of ["pageshow", "resize", "orientationchange"]) window.addEventListener(eventName, schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
schedule();

export { RELEASE, MAX_CODE_LINES, SLOT_LABELS };
