import "./studio-production-v234.css";

const RELEASE = "studio-production-v234-screenshot-layout-sidebar-nara-20260803";
const SMALL = new Set(["application", "phone", "mobile", "compact"]);
const LARGE = new Set(["tablet", "laptop", "desktop", "computer"]);
const WIDGET_CHOICES = [
  ["search", "Pencarian"],
  ["recent-posts", "Post terbaru"],
  ["popular-posts", "Post populer"],
  ["categories", "Kategori"],
  ["tags", "Tag"],
  ["author", "Profil penulis"],
  ["comments", "Komentar"],
  ["custom-html", "HTML / JavaScript"],
];
const AREA_BY_SLOT = {
  "top-left-1": "header-left",
  "top-right-1": "header-right",
  "top-left-3": "below-header",
  "top-left-2": "header-left",
  "top-right-2": "header-right",
  "top-right-3": "below-header",
  "before-content": "before-content",
  "sidebar-left-1": "sidebar-left",
  "sidebar-left-2": "sidebar-left",
  "sidebar-left-3": "sidebar-left",
  "sidebar-left-4": "sidebar-left",
  "content-main": "after-content",
  "sidebar-right-1": "sidebar-right",
  "sidebar-right-2": "sidebar-right",
  "sidebar-right-3": "sidebar-right",
  "sidebar-right-4": "sidebar-right",
  "after-content": "after-content",
  "bottom-left-1": "footer-left",
  "bottom-right-1": "footer-right",
  "bottom-left-2": "footer-left",
  "bottom-right-2": "footer-right",
  "bottom-left-3": "footer-wide",
  "bottom-right-3": "footer-wide",
};
const GRID_PLACEMENT = {
  "top-left-1": ["1 / 7", "1"],
  "top-right-1": ["7 / 13", "1"],
  "top-left-3": ["1 / 13", "2"],
  "top-left-2": ["1 / 7", "3"],
  "top-right-2": ["7 / 13", "3"],
  "top-right-3": ["1 / 13", "4"],
  "before-content": ["1 / 13", "5"],
  "sidebar-left-1": ["1 / 4", "6"],
  "sidebar-left-2": ["1 / 4", "7"],
  "sidebar-left-3": ["1 / 4", "8"],
  "sidebar-left-4": ["1 / 4", "9"],
  "content-main": ["4 / 10", "6 / 10"],
  "sidebar-right-1": ["10 / 13", "6"],
  "sidebar-right-2": ["10 / 13", "7"],
  "sidebar-right-3": ["10 / 13", "8"],
  "sidebar-right-4": ["10 / 13", "9"],
  "after-content": ["1 / 13", "10"],
  "bottom-left-1": ["1 / 7", "11"],
  "bottom-right-1": ["7 / 13", "11"],
  "bottom-left-2": ["1 / 7", "12"],
  "bottom-right-2": ["7 / 13", "12"],
  "bottom-left-3": ["1 / 13", "13"],
  "bottom-right-3": ["1 / 13", "14"],
};
let frame = 0;
let popover = null;
let popoverTrigger = null;
let codeNumbers = null;

function important(node, property, value) {
  if (!node) return;
  node.style.setProperty(property, value, "important");
}

function family() {
  const root = document.documentElement;
  if (root.dataset.v232Family === "large" || root.dataset.v231Family === "large") return "large";
  if (root.dataset.v232Family === "small" || root.dataset.v231Family === "small") return "small";
  const responsive = root.dataset.studioResponsiveMode || root.dataset.studioDeviceVariant || "";
  if (SMALL.has(responsive)) return "small";
  if (LARGE.has(responsive)) return "large";
  const ua = navigator.userAgent || "";
  const mobile = navigator.userAgentData?.mobile === true || /Android|iPhone|iPad|iPod|Windows Phone|Opera Mini|IEMobile/i.test(ua);
  const cssWidth = Number(document.documentElement.clientWidth || innerWidth || 1);
  if (mobile && cssWidth < 900) return "small";
  return cssWidth >= 768 ? "large" : "small";
}

function closePopover({ restoreFocus = false } = {}) {
  if (!popover) return;
  popover.remove();
  popover = null;
  if (restoreFocus) popoverTrigger?.focus?.({ preventScroll: true });
  popoverTrigger = null;
}

function slotKey(node) {
  if (!node) return "";
  if (node.classList.contains("content-main")) return "content-main";
  return Object.keys(GRID_PLACEMENT).find((key) => node.classList.contains(key)) || "";
}

function setReactSelect(select, value) {
  if (!select) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function openWidgetStudio(widgetId, area) {
  const map = document.querySelector("#ngeblogging-layout-map,.tn-layout-studio");
  const open = map?.querySelector(".tn-layout-studio-header>button,.tn-layout-side>button");
  if (!open) return;
  open.click();
  let attempts = 0;
  const locate = () => {
    attempts += 1;
    const cards = [...document.querySelectorAll(".tn-widget-studio .tn-widget-grid>article")];
    const target = cards.find((card) => {
      const label = card.querySelector(".tn-widget-toggle b")?.textContent?.trim().toLowerCase() || "";
      return label === WIDGET_CHOICES.find(([id]) => id === widgetId)?.[1].toLowerCase();
    });
    if (!target) {
      if (attempts < 30) requestAnimationFrame(locate);
      return;
    }
    if (!target.classList.contains("active")) target.querySelector(".tn-widget-toggle")?.click();
    requestAnimationFrame(() => {
      const current = [...document.querySelectorAll(".tn-widget-studio .tn-widget-grid>article")].find((card) => (card.querySelector(".tn-widget-toggle b")?.textContent?.trim().toLowerCase() || "") === WIDGET_CHOICES.find(([id]) => id === widgetId)?.[1].toLowerCase());
      const select = current?.querySelector(".tn-widget-settings select");
      if (select && area) setReactSelect(select, area);
      current?.scrollIntoView({ block: "center", behavior: "smooth" });
      current?.querySelector("input,.tn-widget-toggle")?.focus?.({ preventScroll: true });
    });
  };
  requestAnimationFrame(locate);
}

function showLayoutPopover(slot) {
  closePopover();
  const key = slotKey(slot);
  if (!key) return;
  const area = AREA_BY_SLOT[key] || "sidebar-right";
  const rect = slot.getBoundingClientRect();
  const panel = document.createElement("div");
  panel.className = "v234-layout-popover";
  panel.setAttribute("role", "menu");
  panel.setAttribute("aria-label", "Pilih widget untuk area tata letak");
  panel.innerHTML = `<header><b>${key === "content-main" ? "Konten utama" : "Area widget"}</b><small>Pilih widget untuk area ini</small></header><div></div><button type="button" data-open-all="true">Buka semua 26 widget</button>`;
  const list = panel.querySelector("div");
  for (const [id, label] of WIDGET_CHOICES) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.dataset.widgetId = id;
    button.textContent = label;
    button.addEventListener("click", () => {
      closePopover();
      openWidgetStudio(id, area);
    });
    list.append(button);
  }
  panel.querySelector("[data-open-all]").addEventListener("click", () => {
    closePopover();
    document.querySelector("#ngeblogging-layout-map .tn-layout-studio-header>button,#ngeblogging-layout-map .tn-layout-side>button,.tn-layout-studio .tn-layout-studio-header>button")?.click();
  });
  document.body.append(panel);
  const width = Math.min(300, Math.max(224, innerWidth - 20));
  const left = Math.max(10, Math.min(rect.left, innerWidth - width - 10));
  const estimated = Math.min(430, innerHeight - 20);
  let top = rect.bottom + 8;
  if (top + estimated > innerHeight - 10) top = Math.max(10, rect.top - estimated - 8);
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.width = `${width}px`;
  popover = panel;
  popoverTrigger = slot;
  panel.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
}

function normalizeSidebar() {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const topToggle = document.querySelector(".sn-sidebar-toggle");
  const main = document.querySelector(".sn-main");
  if (!sidebar || !topToggle || !main) return;
  const small = family() === "small";
  const open = sidebar.classList.contains("mobile-open");
  const collapsed = sidebar.classList.contains("collapsed");
  document.documentElement.dataset.v234Family = small ? "small" : "large";
  sidebar.dataset.v234Sidebar = small ? (open ? "drawer-open" : "drawer-closed") : (collapsed ? "icons" : "open");
  const logo = sidebar.querySelector(".sn-logo-mark");
  if (logo) {
    logo.dataset.v234SingleN = "true";
    logo.setAttribute("role", "button");
    logo.setAttribute("tabindex", "0");
    logo.setAttribute("aria-label", small ? "Tutup menu Studio" : collapsed ? "Perluas menu Studio" : "Ciutkan menu Studio");
  }
  document.querySelectorAll(".sn-side-close,.sn-desktop-sidebar-icon,.v227-sidebar-fab,.studio-external-sidebar-toggle,[data-v173-collapse-toggle],[data-v187-sidebar-toggle],[data-v208-sidebar-toggle],[data-v223-sidebar-toggle],[data-v229-sidebar-toggle]").forEach((node) => {
    if (node === topToggle) return;
    node.hidden = true;
    important(node, "display", "none");
    important(node, "pointer-events", "none");
  });
  if (small) {
    topToggle.hidden = open;
    important(topToggle, "display", open ? "none" : "grid");
  } else {
    topToggle.hidden = true;
    important(topToggle, "display", "none");
    sidebar.classList.remove("mobile-open");
  }
  const nav = sidebar.querySelector(":scope>nav");
  if (nav) {
    nav.dataset.v234Menu = "tight";
    important(nav, "justify-content", "flex-start");
    important(nav, "gap", small ? "3px" : "2px");
    important(nav, "padding-top", "5px");
    important(nav, "overflow-y", "auto");
  }
  sidebar.querySelector(":scope>.sn-account-footer")?.style.setProperty("margin-top", "auto", "important");
  main.removeAttribute("inert");
  document.querySelectorAll(".sn-side-backdrop").forEach((backdrop) => {
    backdrop.dataset.v234Backdrop = "outside-drawer-only";
    important(backdrop, "background", "rgba(19,39,66,.08)");
    important(backdrop, "backdrop-filter", "none");
    important(backdrop, "-webkit-backdrop-filter", "none");
    important(backdrop, "filter", "none");
    if (small && open) {
      important(backdrop, "left", "min(78vw, 336px)");
      important(backdrop, "width", "auto");
    }
  });
}

function normalizeTopbar() {
  const topbar = document.querySelector(".sn-top,.sn-topbar");
  if (!topbar) return;
  topbar.dataset.v234Topbar = "profile-only-device-label-removed";
  topbar.querySelectorAll("[data-studio-mode-badge],[data-device-mode-badge],.studio-device-mode-badge,.v225-mode-badge").forEach((node) => {
    node.hidden = true;
    important(node, "display", "none");
  });
  const workspace = topbar.querySelector(".sn-workspace");
  if (workspace) {
    workspace.dataset.v234SiteManagerTrigger = "home-only";
    workspace.hidden = true;
    important(workspace, "display", "none");
  }
  const actions = topbar.querySelector(".sn-top-actions");
  if (actions) important(actions, "margin-left", "auto");
  const avatar = topbar.querySelector(".sn-avatar");
  if (avatar) {
    avatar.hidden = false;
    avatar.dataset.v234Profile = "top-right";
    important(avatar, "display", "grid");
  }
  topbar.querySelectorAll("button,span,div").forEach((node) => {
    if (node.closest(".sn-profile-menu-v150,.sn-avatar,.sn-top-actions") || node === topbar) return;
    const text = String(node.textContent || "").trim().toLowerCase();
    if (["situs desktop", "desktop", "laptop", "komputer", "tablet", "handphone", "mobile", "aplikasi", "perangkat kecil"].includes(text)) {
      node.hidden = true;
      important(node, "display", "none");
    }
  });
}

function ensureHomeSiteManager() {
  const welcome = document.querySelector(".sn-welcome");
  if (!welcome || welcome.querySelector(".v234-home-sites")) return;
  const actions = welcome.querySelector(":scope>div:last-child");
  const workspace = document.querySelector(".sn-workspace");
  if (!actions || !workspace) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "v234-home-sites";
  button.innerHTML = '<span aria-hidden="true">＋</span><b>Kelola / tambah situs</b>';
  button.addEventListener("click", () => workspace.click());
  actions.prepend(button);
}

function normalizeProfileMenu() {
  const menu = document.querySelector(".sn-profile-menu-v150");
  if (!menu) return;
  menu.dataset.v234ProfileMenu = "bounded-five-actions";
  if (!menu.querySelector('[data-action="view-site"]')) {
    const viewSite = document.createElement("button");
    viewSite.type = "button";
    viewSite.setAttribute("role", "menuitem");
    viewSite.dataset.action = "view-site";
    viewSite.innerHTML = "<span>Lihat situs</span><small>Buka situs aktif pada tab baru</small>";
    const settings = menu.querySelector('[data-action="settings"]');
    settings?.after(viewSite);
    viewSite.addEventListener("click", () => {
      document.querySelector(".sn-view-site")?.click();
      menu.remove();
    });
  }
}

function normalizeLayoutMap() {
  const map = document.querySelector("#ngeblogging-layout-map,.tn-layout-studio[data-v226-layout-source]");
  const canvas = map?.querySelector(".tn-layout-canvas-v170");
  if (!map || !canvas) return;
  map.dataset.v234Layout = "green-reference-centered-post";
  canvas.dataset.v234Canvas = family() === "small" ? "small-same-map" : "large-same-map";
  map.querySelectorAll(".tn-layout-studio-header h2,.tn-layout-studio-header p").forEach((node) => {
    node.hidden = true;
    important(node, "display", "none");
  });
  important(canvas, "display", "grid");
  important(canvas, "grid-template-columns", "repeat(12,minmax(0,1fr))");
  important(canvas, "grid-auto-rows", family() === "small" ? "minmax(48px,auto)" : "minmax(58px,auto)");
  const nodes = [...canvas.children].filter((node) => node.classList.contains("tn-layout-slot-v170") || node.classList.contains("content-main"));
  for (const node of nodes) {
    const key = slotKey(node);
    const placement = GRID_PLACEMENT[key];
    if (!placement) continue;
    node.dataset.v234LayoutSlot = key;
    important(node, "position", "relative");
    important(node, "grid-column", placement[0]);
    important(node, "grid-row", placement[1]);
    important(node, "inset", "auto");
    important(node, "transform", "none");
    important(node, "pointer-events", "auto");
    node.removeAttribute("inert");
    node.removeAttribute("aria-hidden");
    node.removeAttribute("aria-disabled");
  }
  const main = canvas.querySelector(":scope>.content-main");
  if (main) {
    main.dataset.v234MainContent = "center-six-to-nine";
    important(main, "min-height", family() === "small" ? "220px" : "300px");
    important(main, "display", "grid");
    important(main, "place-content", "center");
  }
}

function numberText() {
  if (!codeNumbers) codeNumbers = Array.from({ length: 10000 }, (_, index) => String(index + 1)).join("\n");
  return codeNumbers;
}

function normalizeCodeEditor() {
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    const small = family() === "small";
    workspace.dataset.v234Workspace = small ? "preview-top-code-bottom" : "code-left-preview-right";
    const pane = workspace.querySelector(".tn-code-pane");
    const textarea = pane?.querySelector("textarea");
    if (pane && textarea) {
      pane.dataset.v234CodePane = "numbered-1-to-10000";
      let gutter = pane.querySelector(":scope>.v234-code-gutter");
      if (!gutter) {
        gutter = document.createElement("pre");
        gutter.className = "v234-code-gutter";
        gutter.setAttribute("aria-hidden", "true");
        gutter.textContent = numberText();
        pane.insertBefore(gutter, textarea);
      }
      textarea.dataset.v234CodeEditor = "true";
      textarea.setAttribute("wrap", "off");
      textarea.setAttribute("spellcheck", "false");
      if (textarea.dataset.v234ScrollBound !== "true") {
        textarea.dataset.v234ScrollBound = "true";
        textarea.addEventListener("scroll", () => { gutter.scrollTop = textarea.scrollTop; gutter.scrollLeft = 0; }, { passive: true });
      }
    }
    const preview = workspace.querySelector(".tn-code-preview-pane");
    if (preview) preview.dataset.v234Preview = "centered-white";
  });
  document.querySelectorAll(".tn-modal.fullscreen").forEach((modal) => modal.dataset.v234CodeModal = "bounded");
  document.querySelectorAll(".v222-code-line-gutter,.v231-code-line-gutter").forEach((legacy) => {
    legacy.hidden = true;
    important(legacy, "display", "none");
  });
}

function normalizeThemeActions() {
  const studio = document.querySelector(".tn-studio");
  if (studio) {
    studio.dataset.v234ThemeStudio = "visible";
    important(studio, "display", "block");
    important(studio, "visibility", "visible");
    important(studio, "opacity", "1");
  }
  document.querySelectorAll(".v232-theme-code-actions").forEach((group) => {
    group.dataset.v234ThemeActions = "html-css-js-preview";
    important(group, "display", "flex");
  });
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v234Launcher = "stable";
    for (const property of ["animation", "transition", "transform", "filter"]) important(launcher, property, "none");
  }
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope>.nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v234Nara = full ? "modal" : "nonmodal";
  shell.dataset.v234NaraSize = size;
  shell.dataset.v234NaraFamily = family();
  layer.setAttribute("aria-modal", String(full));
  if (!full) {
    important(layer, "pointer-events", "none");
    important(layer, "background", "transparent");
    important(layer, "backdrop-filter", "none");
    important(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }
  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop && !full) {
    backdrop.hidden = true;
    important(backdrop, "display", "none");
    important(backdrop, "pointer-events", "none");
  }
  shell.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.intelligence,.nara-select.model,.nara-attachment-menu-wrap").forEach((node) => {
    node.hidden = false;
    node.removeAttribute("aria-hidden");
    node.removeAttribute("inert");
    node.dataset.v234NaraControl = "visible";
  });
  const menu = shell.querySelector(".nara-attachment-menu");
  if (menu) {
    menu.dataset.v234AttachmentMenu = "camera-photo-file";
    important(menu, "display", "grid");
    important(menu, "visibility", "visible");
    important(menu, "opacity", "1");
    important(menu, "pointer-events", "auto");
  }
}

function normalizeDomain() {
  document.querySelectorAll(".sv124-domain-page,.sn-domain-page").forEach((page) => {
    page.dataset.v234Domain = family() === "small" ? "mobile-full-actions" : "large-actions";
    page.querySelectorAll("button,a").forEach((control) => {
      const text = String(control.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (/jadikan draf|terbitkan|hubungkan|verifikasi|muat ulang|refresh|salin|hapus|utama|buka/.test(text)) control.dataset.v234DomainAction = "true";
    });
  });
}

function normalizeAnalytics() {
  document.querySelectorAll(".op41-line").forEach((chart) => chart.dataset.v234AnalyticsLine = "large-stock-like");
  document.querySelectorAll(".op41-donut").forEach((chart) => chart.dataset.v234AnalyticsDonut = "large-detail");
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioProductionV234 = RELEASE;
  normalizeSidebar();
  normalizeTopbar();
  ensureHomeSiteManager();
  normalizeProfileMenu();
  normalizeLayoutMap();
  normalizeThemeActions();
  normalizeCodeEditor();
  normalizeNara();
  normalizeDomain();
  normalizeAnalytics();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

document.addEventListener("click", (event) => {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const logo = event.target.closest("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (logo && sidebar) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    document.querySelector(".sn-sidebar-toggle")?.click();
    schedule();
    return;
  }
  const slot = event.target.closest("#ngeblogging-layout-map .tn-layout-slot-v170,#ngeblogging-layout-map .content-main,.tn-layout-studio[data-v226-layout-source] .tn-layout-slot-v170,.tn-layout-studio[data-v226-layout-source] .content-main");
  if (slot) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    showLayoutPopover(slot);
    return;
  }
  if (popover && !event.target.closest(".v234-layout-popover")) closePopover();
}, true);

document.addEventListener("keydown", (event) => {
  const logo = event.target.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (logo && ["Enter", " "].includes(event.key)) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    document.querySelector(".sn-sidebar-toggle")?.click();
    schedule();
    return;
  }
  if (event.key === "Escape") closePopover({ restoreFocus: true });
}, true);

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-variant", "data-v232-family"],
});
for (const eventName of ["pageshow", "resize", "orientationchange"]) window.addEventListener(eventName, schedule, { passive: true });
window.addEventListener("ngeblogging:profile-updated", schedule);
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
schedule();

export { RELEASE, AREA_BY_SLOT, GRID_PLACEMENT, WIDGET_CHOICES };
