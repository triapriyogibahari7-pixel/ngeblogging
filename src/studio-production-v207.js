import "./studio-production-v207.css";

const RELEASE = "studio-production-v207-20260802";
const MOBILE_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;

function shortPhysicalEdge() {
  try {
    const values = [screen?.width, screen?.height, visualViewport?.width, visualViewport?.height]
      .map(Number).filter((value) => Number.isFinite(value) && value > 0);
    return values.length ? Math.min(...values) : 0;
  } catch { return 0; }
}

function mobileLike() {
  const root = document.documentElement;
  const family = root.dataset.studioResponsiveMode || root.dataset.studioResponsiveFamilyV193 || "";
  return root.dataset.studioMobileV206 === "true"
    || root.dataset.studioMobileV205 === "true"
    || root.dataset.studioPhysicalMobileV193 === "true"
    || root.dataset.studioDesktopSitePhone === "true"
    || MOBILE_FAMILIES.has(family)
    || navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")
    || (shortPhysicalEdge() > 0 && shortPhysicalEdge() <= 760)
    || window.innerWidth <= 760;
}

function important(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function normalizeThemeActions() {
  const hero = document.querySelector(".tn-studio .tn-hero-actions");
  if (!hero) return;
  const layout = hero.querySelector('[data-v206-theme-action="layout"],[data-v202-theme-action="layout"],[data-v205-hotfix-theme-action="layout"]');
  const code = hero.querySelector('[data-v206-theme-action="code"],[data-v205-hotfix-theme-action="code"],[data-v205-theme-action="code"]');
  if (layout) {
    layout.dataset.v206ThemeAction = "layout";
    layout.dataset.v207ThemeAction = "layout";
    layout.hidden = false;
    layout.disabled = false;
    layout.removeAttribute("inert");
    layout.removeAttribute("aria-hidden");
    layout.setAttribute("aria-label", "Edit Tata Letak");
    layout.querySelectorAll(".v199-button-label,.v201-button-label,.v202-button-label").forEach((node) => node.setAttribute("aria-hidden", "true"));
    important(layout, "pointer-events", "auto");
  }
  if (code) {
    code.dataset.v206ThemeAction = "code";
    code.dataset.v207ThemeAction = "code";
    code.hidden = false;
    code.disabled = false;
    code.removeAttribute("inert");
    code.removeAttribute("aria-hidden");
    code.setAttribute("aria-label", "Edit Kode HTML CSS JavaScript");
    important(code, "pointer-events", "auto");
  }
}

function normalizeLayoutMap() {
  const canvas = document.querySelector(".tn-layout-canvas-v170");
  if (!canvas) return;
  canvas.dataset.v207LayoutMap = "readable-mobile";
  canvas.querySelectorAll(".tn-layout-slot-v170").forEach((slot) => {
    slot.dataset.v207Slot = "horizontal";
    slot.removeAttribute("inert");
    slot.removeAttribute("aria-hidden");
    important(slot, "writing-mode", "horizontal-tb");
    important(slot, "text-orientation", "mixed");
    slot.querySelectorAll("small,b").forEach((label) => {
      important(label, "writing-mode", "horizontal-tb");
      important(label, "text-orientation", "mixed");
      important(label, "word-break", "normal");
    });
  });
}

function normalizeDrawer() {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const main = document.querySelector(".sn-main");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const toggle = document.querySelector(".sn-sidebar-toggle");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));
  toggle?.setAttribute("aria-expanded", String(open));
  sidebar?.removeAttribute("inert");
  main?.removeAttribute("inert");
  if (open) sidebar?.querySelectorAll("button,a,input,select,textarea").forEach((node) => node.removeAttribute("inert"));
  if (backdrop) {
    backdrop.hidden = !open;
    important(backdrop, "background", "transparent");
    important(backdrop, "backdrop-filter", "none");
    important(backdrop, "-webkit-backdrop-filter", "none");
  }
  if (main) {
    important(main, "filter", "none");
    important(main, "opacity", "1");
  }
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v207Launcher = "stable-icon";
    important(launcher, "animation", "none");
    important(launcher, "transition", "none");
    important(launcher, "filter", "none");
    important(launcher, "transform", "none");
    important(launcher, "opacity", "1");
  }
  document.querySelectorAll(".nara-direct-attachments-v202,.nara-mobile-direct-tools-v199").forEach((node) => {
    node.hidden = true;
    node.setAttribute("aria-hidden", "true");
    important(node, "display", "none");
  });
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;
  const full = shell.dataset.naraSize === "full";
  layer.dataset.v207Mode = full ? "modal" : "nonmodal";
  shell.dataset.v207Controls = "two-row-handheld";
  layer.setAttribute("aria-modal", String(full));
  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
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
  shell.querySelectorAll("button,.nara-select,.nara-select *").forEach((node) => {
    important(node, "animation", "none");
    important(node, "transition", "none");
  });
  const close = shell.querySelector('button[title="Tutup"],button[title="Tutup Nara AI"],button[aria-label="Tutup Nara AI"]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("inert");
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara AI");
  }
}

function normalizePreview() {
  const loading = document.querySelector(".tn-preview-loading-v207");
  if (loading) loading.dataset.v207Preview = "waiting-for-cloud-state";
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  root.dataset.studioProductionV207 = RELEASE;
  root.dataset.studioMobileV207 = String(mobileLike());
  normalizeThemeActions();
  normalizeLayoutMap();
  normalizeDrawer();
  normalizeNara();
  normalizePreview();
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

export { RELEASE, mobileLike, normalizeThemeActions, normalizeLayoutMap, normalizeDrawer, normalizeNara, sync };
