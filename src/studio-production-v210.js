import "./studio-production-v210.css";

const RELEASE = "studio-production-v210-20260802";
const MOBILE_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;

function physicalShortEdge() {
  try {
    return Math.min(...[screen?.width, screen?.height, visualViewport?.width, visualViewport?.height]
      .map(Number).filter((value) => Number.isFinite(value) && value > 0));
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
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v210Launcher = "stable";
    ["animation", "transition", "transform", "filter"].forEach((property) => setImportant(launcher, property, "none"));
    setImportant(launcher, "opacity", "1");
  }
  if (!layer || !shell) return;

  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v210Mode = full ? "modal" : "nonmodal";
  shell.dataset.v210Size = size;
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
    setImportant(layer, "background", "transparent");
    setImportant(layer, "backdrop-filter", "none");
    setImportant(layer, "-webkit-backdrop-filter", "none");
    setImportant(layer, "pointer-events", "none");
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
    close.dataset.v210Close = "visible";
  }

  const attachmentWrap = shell.querySelector(".nara-attachment-menu-wrap");
  const attachmentMenu = shell.querySelector(".nara-attachment-menu");
  const plus = attachmentWrap?.querySelector(":scope > button");
  if (plus) {
    plus.setAttribute("aria-haspopup", "menu");
    plus.setAttribute("aria-expanded", String(Boolean(attachmentMenu)));
    plus.setAttribute("aria-label", "Tambah kamera, foto, atau file");
  }
  if (attachmentMenu) {
    attachmentMenu.dataset.v210Attachment = "camera-photo-file";
    attachmentMenu.setAttribute("role", "menu");
    attachmentMenu.hidden = false;
    attachmentMenu.removeAttribute("hidden");
    attachmentMenu.removeAttribute("aria-hidden");
    attachmentMenu.querySelectorAll("button").forEach((button) => {
      button.hidden = false;
      button.disabled = false;
      button.removeAttribute("hidden");
      button.removeAttribute("inert");
      button.removeAttribute("aria-hidden");
      button.setAttribute("role", "menuitem");
    });
  }
}

function normalizeThemeEditor() {
  document.querySelectorAll(".tn-modal-layer").forEach((layer) => {
    const modal = layer.querySelector(":scope > .tn-modal");
    if (!modal) return;
    layer.dataset.v210Modal = modal.classList.contains("fullscreen") ? "code" : "standard";
    layer.removeAttribute("inert");
    layer.removeAttribute("aria-hidden");
    modal.hidden = false;
    modal.removeAttribute("hidden");
    modal.removeAttribute("inert");
    modal.removeAttribute("aria-hidden");
    if (modal.classList.contains("fullscreen")) {
      modal.dataset.v210CodeEditor = "visible";
      const workspace = modal.querySelector(".tn-code-workspace");
      if (workspace) workspace.dataset.v210Workspace = mobileLike() ? "stacked" : "split-50-50";
    }
  });
}

function normalizeWidgetStudio() {
  document.querySelectorAll(".tn-widget-grid>article").forEach((article) => {
    const text = String(article.textContent || "").toLowerCase();
    if (!text.includes("html / javascript") && !text.includes("html/javascript")) return;
    article.dataset.v210CustomCode = "available";
    article.hidden = false;
    article.removeAttribute("hidden");
  });
  document.querySelectorAll(".tn-widget-code-v210 textarea").forEach((textarea) => {
    textarea.setAttribute("autocapitalize", "off");
    textarea.setAttribute("autocomplete", "off");
  });
}

function normalizeLayout() {
  const studio = document.querySelector(".tn-layout-studio");
  const canvas = studio?.querySelector(".tn-layout-canvas-v170");
  if (!studio || !canvas) return;
  studio.dataset.v210Layout = "four-left-four-right";
  canvas.dataset.v210LayoutCanvas = "four-left-four-right";
  const left = canvas.querySelectorAll(".sidebar-left-1,.sidebar-left-2,.sidebar-left-3,.sidebar-left-4");
  const right = canvas.querySelectorAll(".sidebar-right-1,.sidebar-right-2,.sidebar-right-3,.sidebar-right-4");
  studio.dataset.v210LeftSlots = String(left.length);
  studio.dataset.v210RightSlots = String(right.length);
  canvas.querySelectorAll(".tn-layout-slot-v170").forEach((slot) => {
    slot.removeAttribute("inert");
    slot.removeAttribute("aria-hidden");
    slot.dataset.v210Slot = "clickable";
    slot.querySelectorAll("small,b,span").forEach((node) => {
      setImportant(node, "writing-mode", "horizontal-tb");
      setImportant(node, "text-orientation", "mixed");
    });
  });
}

function normalizeDomain() {
  const page = document.querySelector(".sv124-domain-page");
  if (!page) return;
  page.dataset.v210Domain = "mobile-contained";
  page.querySelectorAll("button,a").forEach((node) => {
    const value = String(node.textContent || "").replace(/\s+/g, " ").trim();
    if (/jadikan draf|terbitkan|buka|hubungkan domain|muat ulang/i.test(value)) {
      node.dataset.v210DomainAction = "horizontal";
      setImportant(node, "writing-mode", "horizontal-tb");
      setImportant(node, "text-orientation", "mixed");
      setImportant(node, "white-space", "nowrap");
      setImportant(node, "word-break", "normal");
    }
  });
  page.querySelectorAll("h1,h2,h3,p,b,small,label,span,code").forEach((node) => {
    setImportant(node, "writing-mode", "horizontal-tb");
    setImportant(node, "text-orientation", "mixed");
    setImportant(node, "word-break", "normal");
    setImportant(node, "max-width", "100%");
  });
}

function normalizeDrawer() {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const main = document.querySelector(".sn-main");
  if (!sidebar) return;
  sidebar.removeAttribute("inert");
  main?.removeAttribute("inert");
  sidebar.querySelectorAll("button,a,input,select,textarea").forEach((node) => node.removeAttribute("inert"));
  if (backdrop) {
    setImportant(backdrop, "backdrop-filter", "none");
    setImportant(backdrop, "-webkit-backdrop-filter", "none");
    setImportant(backdrop, "filter", "none");
  }
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  root.dataset.studioProductionV210 = RELEASE;
  root.dataset.studioMobileV210 = String(mobileLike());
  normalizeNara();
  normalizeThemeEditor();
  normalizeWidgetStudio();
  normalizeLayout();
  normalizeDomain();
  normalizeDrawer();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

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

export { RELEASE, mobileLike, normalizeNara, normalizeThemeEditor, normalizeWidgetStudio, normalizeLayout, normalizeDomain, normalizeDrawer, sync };
