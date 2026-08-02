import "./studio-production-v212.css";

const RELEASE = "studio-production-v212-20260802";
const SMALL_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
const LARGE_FAMILIES = new Set(["tablet", "laptop", "desktop", "computer"]);
const PHYSICAL_TABLET_MIN = 768;
let frame = 0;

function responsiveFamily() {
  const root = document.documentElement;
  return root.dataset.studioResponsiveMode
    || root.dataset.studioDeviceVariant
    || root.dataset.studioResponsiveFamilyV193
    || "";
}

function shortEdge() {
  try {
    const values = [screen?.width, screen?.height, visualViewport?.width, visualViewport?.height]
      .map(Number)
      .filter((value) => Number.isFinite(value) && value > 0);
    return values.length ? Math.min(...values) : 0;
  } catch {
    return 0;
  }
}

function interfaceFamily() {
  const root = document.documentElement;
  const family = responsiveFamily();
  const variant = root.dataset.studioDeviceVariant || "";
  const edge = shortEdge();

  // "Situs desktop" is an explicit large-layout request. Physical tablets,
  // tablet/laptop/desktop/computer variants and the existing large device mode
  // remain large even when Android/iPad UA still reports a mobile device.
  if (root.dataset.studioDesktopSitePhone === "true"
      || root.dataset.studioDeviceMode === "large"
      || LARGE_FAMILIES.has(family)
      || LARGE_FAMILIES.has(variant)
      || (root.dataset.studioHandheld === "true" && edge >= PHYSICAL_TABLET_MIN)) return "large";

  if (SMALL_FAMILIES.has(family) || SMALL_FAMILIES.has(variant)) return "small";
  if (navigator.userAgentData?.mobile === true) return "small";
  if (/Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")) return "small";
  if (edge > 0 && edge < PHYSICAL_TABLET_MIN) return "small";
  return window.innerWidth < PHYSICAL_TABLET_MIN ? "small" : "large";
}

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function normalizeSidebar() {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const toggle = document.querySelector(".sn-sidebar-toggle");
  const backdrop = document.querySelector(".sn-side-backdrop");
  if (sidebar) {
    sidebar.dataset.v212Sidebar = "stable";
    for (const property of ["animation", "filter", "backdrop-filter", "-webkit-backdrop-filter"]) {
      setImportant(sidebar, property, "none");
    }
    sidebar.querySelectorAll("button,a,input,select,textarea").forEach((control) => control.removeAttribute("inert"));
  }
  if (toggle) {
    toggle.dataset.v212Toggle = "centered";
    setImportant(toggle, "animation", "none");
    setImportant(toggle, "filter", "none");
  }
  if (backdrop) {
    setImportant(backdrop, "backdrop-filter", "none");
    setImportant(backdrop, "-webkit-backdrop-filter", "none");
    setImportant(backdrop, "filter", "none");
  }
}

function normalizeTheme() {
  document.querySelectorAll(".tn-modal-layer").forEach((layer) => {
    const modal = layer.querySelector(":scope > .tn-modal");
    if (!modal) return;
    layer.dataset.v212Modal = modal.classList.contains("fullscreen") ? "code" : "standard";
    modal.removeAttribute("inert");
    modal.removeAttribute("aria-hidden");
    modal.hidden = false;
  });

  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    const selected = workspace.dataset.codePreviewDevice
      || workspace.querySelector(".tn-frame-shell[data-preview-device]")?.dataset.previewDevice
      || "desktop";
    workspace.dataset.v212SelectedPreview = selected;
    workspace.dataset.v212Workspace = interfaceFamily() === "large" ? "split" : "preview-above-code";
  });

  document.querySelectorAll(".tn-frame-shell[data-preview-device]").forEach((preview) => {
    const device = preview.dataset.previewDevice || "desktop";
    preview.dataset.v212PreviewFamily = LARGE_FAMILIES.has(device) ? "large-device" : "small-device";
    preview.querySelectorAll(":scope > iframe").forEach((iframe) => {
      iframe.dataset.v212PreviewDevice = device;
      iframe.setAttribute("loading", "eager");
    });
  });

  const map = document.querySelector(".tn-layout-canvas-v170");
  if (map) {
    map.dataset.v212LayoutMap = interfaceFamily() === "large" ? "large" : "compact-three-column";
    map.querySelectorAll(".tn-layout-slot-v170").forEach((slot) => {
      slot.dataset.v212Slot = slot.classList.contains("content-main") ? "content-main" : "widget";
      slot.removeAttribute("inert");
      slot.removeAttribute("aria-hidden");
      slot.querySelectorAll("span,small,b").forEach((label) => {
        setImportant(label, "writing-mode", "horizontal-tb");
        setImportant(label, "text-orientation", "mixed");
        setImportant(label, "word-break", "normal");
      });
    });
  }
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v212Launcher = "stable";
    for (const property of ["animation", "transition", "transform", "filter"]) setImportant(launcher, property, "none");
    setImportant(launcher, "opacity", "1");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v212Mode = full ? "modal" : "nonmodal";
  shell.dataset.v212Size = size;
  shell.dataset.v212Family = interfaceFamily();
  layer.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.inert = !full;
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

  const close = shell.querySelector('button[title="Tutup"],button[aria-label="Tutup Nara AI"]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("hidden");
    close.removeAttribute("inert");
    close.removeAttribute("aria-hidden");
    close.dataset.v212Close = "visible";
  }

  const attachmentWrap = shell.querySelector(".nara-attachment-menu-wrap");
  const attachmentMenu = attachmentWrap?.querySelector(":scope > .nara-attachment-menu");
  const plus = attachmentWrap?.querySelector(":scope > button");
  if (attachmentWrap) attachmentWrap.dataset.v212Attachments = attachmentMenu ? "open" : "closed";
  if (plus) {
    plus.hidden = false;
    plus.disabled = false;
    plus.removeAttribute("hidden");
    plus.removeAttribute("aria-hidden");
    plus.setAttribute("aria-label", "Tambah Kamera, Foto, atau File");
    plus.setAttribute("aria-expanded", String(Boolean(attachmentMenu)));
  }
  if (attachmentMenu) {
    attachmentMenu.dataset.v212Menu = "camera-photo-file";
    attachmentMenu.hidden = false;
    attachmentMenu.removeAttribute("hidden");
    attachmentMenu.removeAttribute("inert");
    attachmentMenu.querySelectorAll("button").forEach((button) => {
      button.hidden = false;
      button.disabled = false;
      button.removeAttribute("hidden");
      button.removeAttribute("inert");
    });
  }

  shell.querySelectorAll(".nara-select.intelligence,.nara-select.model").forEach((control) => {
    control.hidden = false;
    control.removeAttribute("hidden");
    control.removeAttribute("aria-hidden");
    control.dataset.v212Control = "visible";
  });
}

function normalizeDomain() {
  const page = document.querySelector(".sv124-domain-page");
  if (!page) return;
  page.dataset.v212Domain = interfaceFamily();
  page.querySelectorAll("h1,h2,h3,p,b,small,label,span,code").forEach((node) => {
    setImportant(node, "writing-mode", "horizontal-tb");
    setImportant(node, "text-orientation", "mixed");
    setImportant(node, "word-break", "normal");
    setImportant(node, "max-width", "100%");
  });
  page.querySelectorAll("button,a").forEach((node) => {
    const label = String(node.textContent || "").replace(/\s+/g, " ").trim();
    if (/jadikan draf|terbitkan|buka|hubungkan domain|muat ulang|verifikasi|refresh/i.test(label)) {
      node.dataset.v212DomainAction = "horizontal";
      setImportant(node, "writing-mode", "horizontal-tb");
      setImportant(node, "text-orientation", "mixed");
      setImportant(node, "word-break", "normal");
      setImportant(node, "white-space", "nowrap");
    }
  });
}

function normalizeAnalytics() {
  document.querySelectorAll(".op41-panel").forEach((panel) => panel.dataset.v212Analytics = "expanded-detail");
  document.querySelectorAll(".op41-line").forEach((chart) => chart.dataset.v212Chart = "market-style");
  document.querySelectorAll(".op41-donut").forEach((chart) => chart.dataset.v212Donut = "large-detail");
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*", ".tn-studio", ".tn-studio>*",
    ".tn-code-workspace", ".tn-code-pane", ".tn-code-preview-pane", ".tn-layout-studio", ".tn-layout-canvas-v170",
    ".ce-app", ".ce-app>*", ".mv176-page", ".sv124-page", ".sn-api-page", ".op41-host", ".op41-panel",
  ].join(",")).forEach((node) => {
    setImportant(node, "min-width", "0");
    setImportant(node, "max-width", "100%");
  });
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  root.dataset.studioProductionV212 = RELEASE;
  root.dataset.studioV212Family = interfaceFamily();
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
    "class", "hidden", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-mode", "data-studio-device-variant",
    "data-studio-handheld", "data-studio-desktop-site-phone", "data-preview-device", "data-code-preview-device",
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
  PHYSICAL_TABLET_MIN,
  interfaceFamily,
  normalizeSidebar,
  normalizeTheme,
  normalizeNara,
  normalizeDomain,
  normalizeAnalytics,
  normalizeContainment,
  sync,
};
