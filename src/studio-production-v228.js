import "./studio-production-v228.css";

const RELEASE = "studio-production-v228-green-editor-nara-20260803";
let frame = 0;

function important(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function physicalMetrics() {
  const root = document.documentElement;
  const layoutWidth = Number(root.clientWidth || innerWidth || 1);
  const density = Math.max(1, Number(devicePixelRatio || 1));
  const normalize = (raw, fallback) => {
    const value = Number(raw || fallback || 1);
    if (value <= 900) return value;
    return density >= 1.25 ? value / density : fallback;
  };
  const screenWidth = normalize(screen?.width, layoutWidth);
  const screenHeight = normalize(screen?.height, Number(root.clientHeight || innerHeight || 1));
  const shortSide = Math.min(screenWidth, screenHeight);
  const longSide = Math.max(screenWidth, screenHeight);
  const portrait = Number(root.clientHeight || innerHeight || 1) >= layoutWidth;
  const physicalWidth = portrait ? shortSide : longSide;
  const handheld = navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")
    || (navigator.maxTouchPoints > 1 && shortSide <= 760);
  const desktopSitePhone = handheld && layoutWidth > physicalWidth * 1.35;
  return { layoutWidth, physicalWidth, shortSide, handheld, desktopSitePhone };
}

function family() {
  const root = document.documentElement;
  const metrics = physicalMetrics();
  if (metrics.desktopSitePhone || root.dataset.studioDesktopSitePhone === "true") return "large";
  if (["application", "phone", "mobile", "compact"].includes(root.dataset.studioResponsiveMode || "")) return "small";
  if (["tablet", "desktop"].includes(root.dataset.studioResponsiveMode || "")) return "large";
  return metrics.shortSide < 768 ? "small" : "large";
}

function normalizeRoot() {
  const root = document.documentElement;
  const next = family();
  const metrics = physicalMetrics();
  root.dataset.studioProductionV228 = RELEASE;
  root.dataset.v228Family = next;
  root.dataset.v228DesktopSitePhone = String(metrics.desktopSitePhone);
  if (metrics.desktopSitePhone) {
    root.dataset.studioResponsiveMode = "desktop";
    root.dataset.studioDeviceMode = "large";
    root.dataset.studioDeviceVariant = "desktop";
    root.dataset.studioDesktopSitePhone = "true";
    root.dataset.v228ModeLock = "desktop-site-large";
  } else {
    root.dataset.v228ModeLock = next === "small" ? "physical-small" : "large-device";
  }
}

function normalizeLayout() {
  const map = document.querySelector('#ngeblogging-layout-map[data-v226-layout-source="native-green-reference"],#ngeblogging-layout-map.tn-layout-studio');
  const canvas = map?.querySelector('.tn-layout-canvas-v170');
  if (!map || !canvas) return;
  map.dataset.v228Layout = "semantic-green-blueprint";
  canvas.dataset.v228LayoutCanvas = family() === "small" ? "semantic-small" : "semantic-large";
  map.querySelectorAll('.tn-layout-studio-header h2,.tn-layout-studio-header p').forEach((node) => { node.hidden = true; });
  const kicker = map.querySelector('.tn-layout-studio-header small');
  if (kicker) kicker.textContent = "PETA TATA LETAK SITUS";
  canvas.querySelectorAll(':scope>.tn-layout-slot-v170').forEach((slot) => {
    slot.hidden = false;
    slot.removeAttribute('inert');
    slot.removeAttribute('aria-hidden');
    slot.removeAttribute('aria-disabled');
    slot.dataset.v228Slot = slot.dataset.layoutArea || "layout-area";
    important(slot, "pointer-events", "auto");
  });
  const main = canvas.querySelector(':scope>.content-main');
  if (main) {
    main.dataset.v228Slot = "content-main";
    main.hidden = false;
    main.removeAttribute('inert');
    main.removeAttribute('aria-hidden');
    important(main, "pointer-events", "auto");
  }
  const side = map.querySelector(':scope>.tn-layout-side');
  if (side) side.dataset.v228WidgetList = "below-map";
}

function normalizeCode() {
  document.querySelectorAll('.tn-code-workspace').forEach((workspace) => {
    const small = family() === "small";
    workspace.dataset.v228Workspace = small ? "preview-above-code" : "code-left-preview-right";
    workspace.querySelectorAll('.tn-code-pane').forEach((pane) => {
      pane.dataset.v228CodePane = "real-lines";
      const textarea = pane.querySelector(':scope>textarea');
      const gutter = pane.querySelector(':scope>.v222-code-line-gutter');
      if (textarea) {
        textarea.setAttribute('wrap', 'off');
        textarea.setAttribute('spellcheck', 'false');
        textarea.dataset.v228CodeTextarea = "readable-long-editor";
        const lines = String(textarea.value || '').split('\n').length;
        if (String(textarea.value || '').length > 120 && lines <= 3 && textarea.dataset.v228PrettyOnce !== "true") {
          textarea.dataset.v228PrettyOnce = "true";
          requestAnimationFrame(() => pane.querySelector('.v222-format-code')?.click());
        }
      }
      if (gutter) {
        gutter.hidden = false;
        gutter.dataset.v228Gutter = "actual-1-to-10000";
      }
    });
    workspace.querySelectorAll('.tn-code-preview-pane').forEach((preview) => { preview.dataset.v228Preview = "centered"; });
  });
}

function normalizeNara() {
  const launcher = document.querySelector('.nara-floating-button');
  if (launcher) {
    launcher.dataset.v228Launcher = "stable-icon";
    for (const property of ["animation", "transition", "filter", "transform"]) important(launcher, property, "none");
    important(launcher, "opacity", "1");
  }
  const layer = document.querySelector('.nara-assistant-layer');
  const shell = layer?.querySelector(':scope>.nara-assistant-shell');
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v228NaraMode = full ? "modal" : "nonmodal";
  shell.dataset.v228NaraSize = size;
  shell.dataset.v228NaraFamily = family();
  if (!full) {
    important(layer, "pointer-events", "none");
    important(layer, "background", "transparent");
    important(layer, "backdrop-filter", "none");
    important(layer, "-webkit-backdrop-filter", "none");
    important(shell, "pointer-events", "auto");
    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow');
  }
  shell.querySelectorAll('.nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.intelligence,.nara-select.model,.nara-attachment-menu-wrap').forEach((node) => {
    node.hidden = false;
    node.removeAttribute('inert');
    node.removeAttribute('aria-hidden');
    node.dataset.v228Control = "visible";
  });
  const plus = shell.querySelector('.nara-attachment-menu-wrap>button');
  const menu = shell.querySelector('.nara-attachment-menu');
  if (plus) {
    plus.dataset.v228Plus = "camera-photo-file";
    plus.setAttribute('aria-haspopup', 'menu');
    plus.setAttribute('aria-expanded', String(Boolean(menu)));
  }
  if (!menu || !plus) return;
  menu.dataset.v228AttachmentMenu = "viewport-fixed";
  menu.setAttribute('role', 'menu');
  const rect = plus.getBoundingClientRect();
  const width = Math.min(286, Math.max(224, innerWidth - 24));
  const height = 188;
  const left = Math.max(12, Math.min(innerWidth - width - 12, rect.left));
  const above = rect.top - height - 10;
  const top = above >= 12 ? above : Math.min(innerHeight - height - 12, rect.bottom + 10);
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
  important(menu, "z-index", "2147486000");
}

function normalizeDomain() {
  if (family() !== "small") return;
  document.querySelectorAll('.sv124-domain-page button,.sv124-domain-page a').forEach((node) => {
    node.dataset.v228DomainAction = "horizontal-full";
  });
}

function normalizeChrome() {
  document.querySelectorAll('.sn-side,.sn-sidebar-toggle,.sn-mobile-menu-mark,.sn-brand-mark').forEach((node) => {
    node.dataset.v228Stable = "true";
    for (const property of ["animation", "transition", "filter"]) important(node, property, "none");
    important(node, "opacity", "1");
  });
  document.querySelectorAll('.sn-side-backdrop').forEach((node) => {
    important(node, "background", "transparent");
    important(node, "backdrop-filter", "none");
    important(node, "-webkit-backdrop-filter", "none");
  });
}

function sync() {
  frame = 0;
  normalizeRoot();
  normalizeLayout();
  normalizeCode();
  normalizeNara();
  normalizeDomain();
  normalizeChrome();
}
function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "aria-expanded", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-mode", "data-studio-device-variant", "data-studio-desktop-site-phone"],
});
for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) window.addEventListener(eventName, schedule, { passive: true });
window.visualViewport?.addEventListener('resize', schedule, { passive: true });
schedule();

export { RELEASE };