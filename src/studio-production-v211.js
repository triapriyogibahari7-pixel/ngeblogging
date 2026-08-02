import "./studio-production-v211.css";

const RELEASE = "studio-production-v211-20260802";
const MOBILE_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;

function physicalShortEdge() {
  try {
    const values = [screen?.width, screen?.height, visualViewport?.width, visualViewport?.height]
      .map(Number).filter((value) => Number.isFinite(value) && value > 0);
    return values.length ? Math.min(...values) : 0;
  } catch { return 0; }
}

function mobileLike() {
  const root = document.documentElement;
  const family = root.dataset.studioResponsiveMode || root.dataset.studioResponsiveFamilyV193 || "";
  const shortEdge = physicalShortEdge();
  return root.dataset.studioPhysicalMobileV193 === "true"
    || root.dataset.studioDesktopSitePhone === "true"
    || MOBILE_FAMILIES.has(family)
    || navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")
    || (shortEdge > 0 && shortEdge <= 760)
    || window.innerWidth <= 760;
}

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v211Launcher = "stable";
    for (const property of ["animation", "transition", "transform", "filter"]) setImportant(launcher, property, "none");
    setImportant(launcher, "opacity", "1");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v211Mode = full ? "modal" : "nonmodal";
  shell.dataset.v211Size = size;
  layer.setAttribute("aria-modal", String(full));

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

  const close = shell.querySelector('button[title="Tutup"],button[aria-label="Tutup Nara AI"]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("hidden");
    close.removeAttribute("inert");
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara AI");
    close.dataset.v211Close = "visible";
  }

  const wrap = shell.querySelector(".nara-attachment-menu-wrap");
  const plus = wrap?.querySelector(":scope > button");
  const menu = wrap?.querySelector(":scope > .nara-attachment-menu");
  if (wrap) wrap.dataset.v211AttachmentState = menu ? "open" : "closed";
  if (plus) {
    plus.dataset.v211AttachmentTrigger = "camera-photo-file";
    plus.setAttribute("aria-haspopup", "menu");
    plus.setAttribute("aria-expanded", String(Boolean(menu)));
    plus.setAttribute("aria-label", "Tambah kamera, foto, atau file");
  }
  if (menu) {
    menu.dataset.v211AttachmentMenu = "camera-photo-file";
    menu.setAttribute("role", "menu");
    menu.querySelectorAll(":scope > button").forEach((button) => {
      button.hidden = false;
      button.disabled = false;
      button.removeAttribute("hidden");
      button.removeAttribute("inert");
      button.removeAttribute("aria-hidden");
      button.setAttribute("role", "menuitem");
    });
  }

  shell.querySelectorAll(".nara-select.intelligence,.nara-select.model").forEach((control) => {
    control.hidden = false;
    control.removeAttribute("hidden");
    control.removeAttribute("aria-hidden");
    control.dataset.v211Select = "visible";
  });
}

function normalizeTheme() {
  document.querySelectorAll(".tn-modal-layer").forEach((layer) => {
    const modal = layer.querySelector(":scope > .tn-modal");
    if (!modal) return;
    layer.dataset.v211Modal = modal.classList.contains("fullscreen") ? "code" : "standard";
    modal.dataset.v211ModalVisible = "true";
    layer.removeAttribute("inert");
    layer.removeAttribute("aria-hidden");
    modal.hidden = false;
    modal.removeAttribute("hidden");
    modal.removeAttribute("inert");
    modal.removeAttribute("aria-hidden");
    if (modal.classList.contains("fullscreen")) {
      const workspace = modal.querySelector(".tn-code-workspace");
      if (workspace) workspace.dataset.v211Workspace = mobileLike() ? "stacked" : "split-50-50";
    }
  });

  const studio = document.querySelector(".tn-layout-studio");
  const canvas = studio?.querySelector(".tn-layout-canvas-v170,.tn-layout-canvas");
  if (studio && canvas) {
    studio.dataset.v211Layout = mobileLike() ? "physical-mobile-map" : "desktop-map";
    canvas.dataset.v211LayoutCanvas = mobileLike() ? "physical-mobile-map" : "desktop-map";
    canvas.querySelectorAll(".tn-layout-slot-v170,.tn-layout-area").forEach((slot) => {
      slot.dataset.v211MapSlot = "clickable";
      slot.removeAttribute("inert");
      slot.removeAttribute("aria-hidden");
      slot.querySelectorAll("small,b,span").forEach((label) => {
        setImportant(label, "writing-mode", "horizontal-tb");
        setImportant(label, "text-orientation", "mixed");
        setImportant(label, "word-break", "normal");
      });
    });
  }
}

function normalizeDomain() {
  const page = document.querySelector(".sv124-domain-page");
  if (!page) return;
  page.dataset.v211Domain = mobileLike() ? "physical-mobile" : "contained";
  page.querySelectorAll("h1,h2,h3,p,b,small,label,span,code").forEach((node) => {
    setImportant(node, "writing-mode", "horizontal-tb");
    setImportant(node, "text-orientation", "mixed");
    setImportant(node, "word-break", "normal");
    setImportant(node, "max-width", "100%");
  });
  page.querySelectorAll("button,a").forEach((node) => {
    const label = String(node.textContent || "").replace(/\s+/g, " ").trim();
    if (/jadikan draf|terbitkan|buka|hubungkan domain|muat ulang/i.test(label)) {
      node.dataset.v211DomainAction = "horizontal";
      setImportant(node, "writing-mode", "horizontal-tb");
      setImportant(node, "text-orientation", "mixed");
      setImportant(node, "word-break", "normal");
      setImportant(node, "white-space", "nowrap");
    }
  });
}

function normalizeSidebar() {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const main = document.querySelector(".sn-main");
  const backdrop = document.querySelector(".sn-side-backdrop");
  if (!sidebar) return;
  sidebar.dataset.v211Sidebar = "stable";
  sidebar.removeAttribute("inert");
  main?.removeAttribute("inert");
  for (const property of ["animation", "filter", "backdrop-filter", "-webkit-backdrop-filter"]) setImportant(sidebar, property, "none");
  sidebar.querySelectorAll("button,a,input,select,textarea").forEach((node) => node.removeAttribute("inert"));
  if (backdrop) {
    setImportant(backdrop, "filter", "none");
    setImportant(backdrop, "backdrop-filter", "none");
    setImportant(backdrop, "-webkit-backdrop-filter", "none");
  }
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*", ".tn-studio", ".tn-studio>*",
    ".tn-code-workspace", ".tn-code-pane", ".tn-code-preview-pane", ".ce-app", ".ce-app>*",
    ".mv176-page", ".sv124-page", ".sn-api-page", ".op41-host",
  ].join(",")).forEach((node) => {
    setImportant(node, "min-width", "0");
    setImportant(node, "max-width", "100%");
  });
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  root.dataset.studioProductionV211 = RELEASE;
  root.dataset.studioMobileV211 = String(mobileLike());
  normalizeNara();
  normalizeTheme();
  normalizeDomain();
  normalizeSidebar();
  normalizeContainment();
}

function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "data-nara-size", "data-studio-responsive-mode", "data-studio-desktop-site-phone"],
});
for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) window.addEventListener(eventName, schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
sync();

export { RELEASE, mobileLike, normalizeNara, normalizeTheme, normalizeDomain, normalizeSidebar, normalizeContainment, sync };
