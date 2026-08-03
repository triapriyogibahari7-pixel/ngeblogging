import "./studio-production-v223.css";

const RELEASE = "studio-production-v223-20260803";
const SMALL_UA = /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i;
let frame = 0;

const LARGE_SLOT_LABELS = Object.freeze({
  "top-left-1": "Header kiri · kotak 1",
  "top-right-1": "Header kanan · kotak 1",
  "top-left-2": "Header kiri · kotak 2",
  "top-right-2": "Header kanan · kotak 2",
  "top-left-3": "Navigasi / area atas",
  "top-right-3": "Kotak panjang di bawah header",
  "before-content": "Kotak di atas postingan",
  "sidebar-left-1": "Widget kiri 1",
  "sidebar-left-2": "Widget kiri 2",
  "sidebar-left-3": "Widget kiri 3",
  "sidebar-left-4": "Widget kiri 4",
  "sidebar-right-1": "Widget kanan 1",
  "sidebar-right-2": "Widget kanan 2",
  "sidebar-right-3": "Widget kanan 3",
  "sidebar-right-4": "Widget kanan 4",
  "after-content": "Kotak panjang di bawah postingan",
  "bottom-left-1": "Footer kiri · kotak 1",
  "bottom-right-1": "Footer kanan · kotak 1",
  "bottom-left-2": "Footer kiri · kotak 2",
  "bottom-right-2": "Footer kanan · kotak 2",
  "bottom-left-3": "Kotak footer panjang",
  "bottom-right-3": "Copyright / identitas situs",
});

const SMALL_SLOT_LABELS = Object.freeze({
  ...LARGE_SLOT_LABELS,
  "top-left-1": "Header kiri 1",
  "top-right-1": "Header kanan 1",
  "top-left-2": "Header kiri 2",
  "top-right-2": "Header kanan 2",
  "top-left-3": "Navigasi",
  "top-right-3": "Bawah header",
  "before-content": "Atas postingan",
  "sidebar-left-1": "Kiri 1",
  "sidebar-left-2": "Kiri 2",
  "sidebar-left-3": "Kiri 3",
  "sidebar-left-4": "Kiri 4",
  "sidebar-right-1": "Kanan 1",
  "sidebar-right-2": "Kanan 2",
  "sidebar-right-3": "Kanan 3",
  "sidebar-right-4": "Kanan 4",
  "after-content": "Bawah postingan",
  "bottom-left-1": "Footer kiri 1",
  "bottom-right-1": "Footer kanan 1",
  "bottom-left-2": "Footer kiri 2",
  "bottom-right-2": "Footer kanan 2",
  "bottom-left-3": "Footer panjang",
  "bottom-right-3": "Copyright",
});

function important(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function physicalShortSide() {
  const values = [screen?.width, screen?.height]
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? Math.min(...values) : Math.min(innerWidth, innerHeight);
}

function physicalPhone() {
  return navigator.userAgentData?.mobile === true
    || SMALL_UA.test(navigator.userAgent || "")
    || physicalShortSide() < 768;
}

function syntheticDesktopOnPhone() {
  if (!physicalPhone()) return false;
  const viewport = Math.max(Number(innerWidth || 0), Number(visualViewport?.width || 0));
  const shortSide = physicalShortSide();
  return viewport >= 760 && shortSide > 0 && viewport >= shortSide * 1.35;
}

function family() {
  const root = document.documentElement;
  if (root.dataset.studioDesktopSitePhone === "true" || syntheticDesktopOnPhone()) return "large";
  if (physicalPhone()) return "small";
  const responsive = root.dataset.studioResponsiveMode || "";
  const variant = root.dataset.studioDeviceVariant || "";
  if (["tablet", "desktop"].includes(responsive) || ["laptop", "desktop", "computer"].includes(variant)) return "large";
  return innerWidth >= 768 ? "large" : "small";
}

function normalizeRoot() {
  const root = document.documentElement;
  const next = family();
  const inferredDesktop = syntheticDesktopOnPhone();
  root.dataset.studioProductionV223 = RELEASE;
  root.dataset.studioV223Family = next;
  root.dataset.studioV223PhysicalPhone = String(physicalPhone());
  root.dataset.studioV223SyntheticDesktop = String(inferredDesktop);

  if (inferredDesktop) {
    root.dataset.studioDesktopSitePhone = "true";
    root.dataset.studioResponsiveMode = "desktop";
    root.dataset.studioDeviceVariant = "desktop";
    root.dataset.studioV223ModeLock = "synthetic-desktop-on-phone";
  } else if (root.dataset.studioV223ModeLock === "synthetic-desktop-on-phone" && !inferredDesktop) {
    delete root.dataset.studioDesktopSitePhone;
    root.dataset.studioResponsiveMode = "phone";
    root.dataset.studioDeviceVariant = "phone";
    root.dataset.studioV223ModeLock = "physical-phone";
  } else {
    root.dataset.studioV223ModeLock = next === "large" ? "large" : "physical-phone";
  }
}

function normalizeThemeActions() {
  document.querySelectorAll(".tn-studio .tn-hero-actions,.tn-command nav").forEach((group) => {
    const explicit = [...group.querySelectorAll("button[data-v222-code-tab]")];
    explicit.forEach((button) => {
      button.hidden = false;
      button.disabled = false;
      button.tabIndex = 0;
      button.removeAttribute("hidden");
      button.removeAttribute("inert");
      button.removeAttribute("aria-hidden");
      button.dataset.v223CodeAction = button.dataset.v222CodeTab || "code";
      important(button, "display", "inline-flex");
      important(button, "visibility", "visible");
      important(button, "opacity", "1");
    });
    if (explicit.length) group.dataset.v223ThemeActions = "html-css-javascript-visible";
  });
}

function normalizeLayout() {
  const map = document.querySelector("#ngeblogging-layout-map.tn-layout-studio,.tn-layout-studio");
  const canvas = map?.querySelector(".tn-layout-canvas-v170");
  if (!map || !canvas) return;
  const small = family() === "small";
  map.dataset.v223Layout = "green-reference-deterministic";
  canvas.dataset.v223LayoutCanvas = small ? "compact-four-left-four-right" : "large-four-left-four-right";
  map.querySelectorAll(".tn-layout-studio-header h2,.tn-layout-studio-header p").forEach((node) => { node.hidden = true; });
  const kicker = map.querySelector(".tn-layout-studio-header small");
  if (kicker) kicker.textContent = "PETA TATA LETAK SITUS";
  const labels = small ? SMALL_SLOT_LABELS : LARGE_SLOT_LABELS;

  canvas.querySelectorAll(":scope>.tn-layout-slot-v170").forEach((slot) => {
    const area = Object.keys(labels).find((id) => slot.classList.contains(id));
    if (!area) return;
    slot.dataset.v223Slot = area;
    slot.removeAttribute("inert");
    slot.removeAttribute("aria-hidden");
    slot.removeAttribute("aria-disabled");
    const label = slot.querySelector(":scope>small");
    if (label) label.textContent = labels[area];
    slot.setAttribute("aria-label", `${labels[area]}. Pilih widget untuk area ini.`);
    important(slot, "pointer-events", "auto");
  });

  const main = canvas.querySelector(":scope>.content-main");
  if (main) {
    main.dataset.v223Slot = "content-main";
    const label = main.querySelector(":scope>small");
    const detail = main.querySelector(":scope>b");
    if (label) label.textContent = "Post / Page";
    if (detail) detail.textContent = "Konten utama";
    main.removeAttribute("inert");
    main.removeAttribute("aria-hidden");
    important(main, "pointer-events", "auto");
  }

  const side = map.querySelector(":scope>.tn-layout-side");
  if (side) side.dataset.v223WidgetList = "below-map";
}

function normalizeCode() {
  document.querySelectorAll(".tn-modal-layer").forEach((layer) => {
    const workspace = layer.querySelector(".tn-code-workspace");
    if (!workspace) return;
    const next = family();
    layer.dataset.v223ThemeCodeModal = next;
    workspace.dataset.v223Workspace = next === "small" ? "preview-above-code" : "code-left-preview-right";
    workspace.querySelectorAll(".tn-code-preview-pane").forEach((preview) => { preview.dataset.v223Preview = next; });
    workspace.querySelectorAll(".tn-code-editor-grid-v223 textarea").forEach((textarea) => {
      textarea.setAttribute("wrap", "off");
      textarea.setAttribute("autocomplete", "off");
      textarea.setAttribute("autocapitalize", "off");
      textarea.setAttribute("spellcheck", "false");
    });
  });
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v223Launcher = "icon-only-stable";
    for (const property of ["animation", "transition", "filter", "transform"]) important(launcher, property, "none");
    important(launcher, "opacity", "1");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope>.nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v223NaraMode = full ? "modal" : "nonmodal";
  shell.dataset.v223NaraSize = size;
  shell.dataset.v223NaraFamily = family();
  layer.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(":scope>.nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.inert = !full;
    backdrop.tabIndex = full ? 0 : -1;
    backdrop.setAttribute("aria-hidden", String(!full));
  }

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
    node.dataset.v223Control = "visible";
  });

  const plus = shell.querySelector(".nara-attachment-menu-wrap>button");
  if (plus) {
    plus.dataset.v223Plus = "camera-photo-file";
    plus.setAttribute("aria-haspopup", "menu");
  }
  const menu = shell.querySelector(".nara-attachment-menu");
  if (!menu || !plus) return;
  menu.dataset.v223AttachmentMenu = "viewport-fixed";
  menu.setAttribute("role", "menu");
  const rect = plus.getBoundingClientRect();
  const width = Math.min(280, Math.max(224, innerWidth - 24));
  const height = Math.min(190, innerHeight - 24);
  const left = Math.max(12, Math.min(innerWidth - width - 12, rect.left));
  const preferredTop = rect.top - height - 10;
  const top = preferredTop >= 12 ? preferredTop : Math.min(innerHeight - height - 12, rect.bottom + 10);
  important(menu, "position", "fixed");
  important(menu, "left", `${left}px`);
  important(menu, "right", "auto");
  important(menu, "top", `${Math.max(12, top)}px`);
  important(menu, "bottom", "auto");
  important(menu, "width", `${width}px`);
  important(menu, "max-width", "calc(100vw - 24px)");
  important(menu, "display", "grid");
  important(menu, "visibility", "visible");
  important(menu, "opacity", "1");
  important(menu, "pointer-events", "auto");
  important(menu, "z-index", "2147484500");
}

function normalizeChrome() {
  document.querySelectorAll(".sn-side,.sn-sidebar-toggle,.sn-mobile-menu-mark,.nara-floating-button").forEach((node) => {
    node.dataset.v223Stable = "true";
    for (const property of ["animation", "transition", "filter"]) important(node, property, "none");
    important(node, "opacity", "1");
  });
  document.querySelectorAll(".sn-side-backdrop").forEach((node) => {
    important(node, "backdrop-filter", "none");
    important(node, "-webkit-backdrop-filter", "none");
  });
}

function normalizeDomain() {
  if (family() !== "small") return;
  document.querySelectorAll(".sv124-domain-page button,.sv124-domain-page a").forEach((node) => {
    const label = String(node.textContent || "").replace(/\s+/g, " ").trim();
    if (/jadikan draf|terbitkan|hubungkan|verifikasi|muat ulang|refresh|salin|hapus|jadikan utama/i.test(label)) {
      node.dataset.v223DomainAction = "full-horizontal";
    }
  });
}

function sync() {
  frame = 0;
  normalizeRoot();
  normalizeThemeActions();
  normalizeLayout();
  normalizeCode();
  normalizeNara();
  normalizeChrome();
  normalizeDomain();
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
schedule();

export { RELEASE, family, syntheticDesktopOnPhone };
