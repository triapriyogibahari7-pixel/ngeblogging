import "./studio-production-v232.css";

const RELEASE = "studio-production-v232-single-n-theme-actions-20260803";
const SMALL_RESPONSIVE = new Set(["application", "phone", "mobile", "compact"]);
const LARGE_RESPONSIVE = new Set(["tablet", "laptop", "desktop", "computer"]);
let frame = 0;

function important(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function deviceMetrics() {
  const density = Math.max(1, Number(devicePixelRatio || 1));
  const layoutWidth = Number(document.documentElement.clientWidth || innerWidth || 1);
  const layoutHeight = Number(document.documentElement.clientHeight || innerHeight || 1);
  const normalize = (value, fallback) => {
    const number = Number(value || fallback || 1);
    if (number <= 900) return number;
    return density >= 1.25 ? number / density : fallback;
  };
  const screenWidth = normalize(screen?.width, layoutWidth);
  const screenHeight = normalize(screen?.height, layoutHeight);
  const shortSide = Math.min(screenWidth, screenHeight);
  const ua = navigator.userAgent || "";
  const handheld = navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)
    || (Number(navigator.maxTouchPoints || 0) > 1 && shortSide < 768);
  // Chrome/Android "Situs desktop" normally exposes a ~980px CSS viewport while
  // the physical phone remains around 320–600 CSS px. Keep that choice locked.
  const desktopSitePhone = handheld && shortSide < 768 && layoutWidth >= 900;
  return { layoutWidth, layoutHeight, shortSide, handheld, desktopSitePhone };
}

function resolveFamily() {
  const root = document.documentElement;
  const view = deviceMetrics();
  if (view.desktopSitePhone) return "large";
  if (view.shortSide >= 768) return "large";
  if (view.handheld) return "small";
  const responsive = root.dataset.studioResponsiveMode || "";
  const variant = root.dataset.studioDeviceVariant || "";
  if (SMALL_RESPONSIVE.has(responsive) || SMALL_RESPONSIVE.has(variant)) return "small";
  if (LARGE_RESPONSIVE.has(responsive) || LARGE_RESPONSIVE.has(variant)) return "large";
  return view.layoutWidth >= 768 ? "large" : "small";
}

function normalizeMode() {
  const root = document.documentElement;
  const view = deviceMetrics();
  const next = resolveFamily();
  root.dataset.studioProductionV232 = RELEASE;
  root.dataset.v232Family = next;
  root.dataset.v232DesktopSitePhone = String(view.desktopSitePhone);
  if (view.desktopSitePhone) {
    root.dataset.studioDesktopSitePhone = "true";
    root.dataset.studioResponsiveMode = "desktop";
    root.dataset.studioDeviceMode = "large";
    root.dataset.studioDeviceVariant = "desktop";
    root.dataset.v232ModeLock = "desktop-site-large";
  } else if (next === "small") {
    if (root.dataset.studioDesktopSitePhone === "true") root.dataset.studioDesktopSitePhone = "false";
    root.dataset.v232ModeLock = "physical-small";
  } else {
    root.dataset.v232ModeLock = "large-device";
  }
}

function setHidden(node, hidden) {
  if (!node) return;
  node.hidden = hidden;
  node.setAttribute("aria-hidden", hidden ? "true" : "false");
  if (hidden) node.setAttribute("tabindex", "-1");
  else node.removeAttribute("tabindex");
}

function bindSidebarLogo(sidebar, topToggle) {
  const logo = sidebar.querySelector(".sn-logo-mark");
  if (!logo || !topToggle) return;
  logo.dataset.v232SingleN = "true";
  logo.setAttribute("role", "button");
  logo.setAttribute("tabindex", "0");
  logo.setAttribute("aria-label", "Buka atau tutup menu Studio");
  // v229/v231 already bind the same logo in production. Never add a second
  // listener because a double click would immediately undo the requested state.
  if (logo.dataset.v231Bound === "true" || logo.dataset.v229Bound === "true" || logo.dataset.v232Bound === "true") return;
  logo.dataset.v232Bound = "true";
  const activate = (event) => {
    if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    topToggle.click();
  };
  logo.addEventListener("click", activate);
  logo.addEventListener("keydown", activate);
}

function bindDesktopAutoCollapse(sidebar, topToggle) {
  if (sidebar.dataset.v232AutoCollapseBound === "true") return;
  sidebar.dataset.v232AutoCollapseBound = "true";
  sidebar.addEventListener("click", (event) => {
    if (resolveFamily() !== "large" || sidebar.classList.contains("collapsed")) return;
    const action = event.target.closest(".sn-new,nav button,.sn-account-settings-v135");
    if (!action || action.closest(".sn-logo")) return;
    requestAnimationFrame(() => {
      if (resolveFamily() === "large" && !sidebar.classList.contains("collapsed")) topToggle.click();
    });
  });
}

function normalizeSidebar() {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const topToggle = document.querySelector(".sn-sidebar-toggle");
  const main = document.querySelector(".sn-main");
  if (!sidebar || !topToggle || !main) return;
  const small = resolveFamily() === "small";
  const drawerOpen = sidebar.classList.contains("mobile-open");
  const collapsed = sidebar.classList.contains("collapsed");

  sidebar.dataset.v232Sidebar = small ? (drawerOpen ? "mobile-open" : "mobile-closed") : (collapsed ? "desktop-icons" : "desktop-open");
  bindSidebarLogo(sidebar, topToggle);
  bindDesktopAutoCollapse(sidebar, topToggle);

  const sideClose = sidebar.querySelector(".sn-side-close");
  if (sideClose) setHidden(sideClose, true);
  document.querySelectorAll(".sn-desktop-sidebar-icon,.v227-sidebar-fab,.studio-external-sidebar-toggle,[data-v173-collapse-toggle],[data-v187-sidebar-toggle],[data-v208-sidebar-toggle],[data-v223-sidebar-toggle],[data-v229-sidebar-toggle]").forEach((node) => {
    if (node === topToggle) return;
    setHidden(node, true);
    important(node, "display", "none");
  });

  if (small) {
    setHidden(topToggle, drawerOpen);
    important(topToggle, "display", drawerOpen ? "none" : "grid");
  } else {
    setHidden(topToggle, true);
    important(topToggle, "display", "none");
    sidebar.classList.remove("mobile-open");
  }

  const nav = sidebar.querySelector(":scope>nav");
  if (nav) {
    nav.dataset.v232Menu = "tight-under-create";
    important(nav, "justify-content", "flex-start");
    important(nav, "gap", small ? "3px" : "2px");
    important(nav, "padding-top", "5px");
    important(nav, "overflow-y", "auto");
  }
  const footer = sidebar.querySelector(":scope>.sn-account-footer");
  if (footer) important(footer, "margin-top", "auto");

  main.removeAttribute("inert");
  document.querySelectorAll(".sn-side-backdrop").forEach((backdrop) => {
    backdrop.dataset.v232Backdrop = "transparent-outside-only";
    important(backdrop, "background", "transparent");
    important(backdrop, "backdrop-filter", "none");
    important(backdrop, "-webkit-backdrop-filter", "none");
    important(backdrop, "filter", "none");
  });
}

function label(node) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function selectThemeCodeTab(kind) {
  let attempts = 0;
  const run = () => {
    attempts += 1;
    const buttons = [...document.querySelectorAll(".tn-code-pane>nav button")];
    const target = buttons.find((button) => {
      const text = label(button);
      return kind === "javascript" ? text.includes("javascript") : text.includes(kind);
    });
    if (target) {
      target.click();
      target.focus({ preventScroll: true });
      document.querySelector(".tn-code-workspace")?.setAttribute("data-v232-requested-tab", kind);
      return;
    }
    if (attempts < 24) requestAnimationFrame(run);
  };
  requestAnimationFrame(run);
}

function normalizeThemeActions() {
  const command = document.querySelector(".tn-command");
  const nav = command?.querySelector(":scope>nav");
  if (!command || !nav || nav.querySelector(".v232-theme-code-actions")) return;
  const originalCode = [...nav.querySelectorAll(":scope>button")].find((button) => /edit html/i.test(label(button)));
  const originalPreview = [...nav.querySelectorAll(":scope>button")].find((button) => /^preview$/i.test(String(button.textContent || "").trim()));
  if (!originalCode || !originalPreview) return;

  const group = document.createElement("div");
  group.className = "v232-theme-code-actions";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Editor kode dan preview tema");
  for (const [kind, text] of [["html", "Edit HTML"], ["css", "Edit CSS"], ["javascript", "Edit JavaScript"]]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.v232CodeAction = kind;
    button.textContent = text;
    button.addEventListener("click", () => {
      originalCode.click();
      selectThemeCodeTab(kind);
    });
    group.append(button);
  }
  const preview = document.createElement("button");
  preview.type = "button";
  preview.dataset.v232CodeAction = "preview";
  preview.textContent = "Preview";
  preview.addEventListener("click", () => originalPreview.click());
  group.append(preview);
  nav.prepend(group);
  originalCode.dataset.v232ProxySource = "code";
  originalPreview.dataset.v232ProxySource = "preview";
  setHidden(originalCode, true);
  setHidden(originalPreview, true);
}

function normalizeThemeLayout() {
  const map = document.querySelector("#ngeblogging-layout-map");
  const canvas = map?.querySelector(".tn-layout-canvas-v170");
  if (!map || !canvas) return;
  map.dataset.v232Layout = "same-blueprint-every-device";
  canvas.dataset.v232LayoutCanvas = resolveFamily() === "small" ? "compact-readable" : "large-readable";
  map.querySelectorAll(".tn-layout-studio-header h2,.tn-layout-studio-header p").forEach((node) => setHidden(node, true));
  canvas.querySelectorAll(":scope>.tn-layout-slot-v170,:scope>.content-main").forEach((slot) => {
    slot.hidden = false;
    slot.removeAttribute("inert");
    slot.removeAttribute("aria-hidden");
    slot.removeAttribute("aria-disabled");
    important(slot, "pointer-events", "auto");
    slot.dataset.v232LayoutSlot = "interactive";
  });
}

function normalizeCodeEditor() {
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    const small = resolveFamily() === "small";
    workspace.dataset.v232Workspace = small ? "preview-top-code-bottom" : "code-left-preview-right";
    workspace.querySelectorAll(".tn-code-pane textarea").forEach((textarea) => {
      textarea.dataset.v232Editor = "real-sequential-lines";
      textarea.setAttribute("wrap", "off");
      textarea.setAttribute("spellcheck", "false");
    });
    workspace.querySelectorAll(".tn-code-preview-pane").forEach((preview) => preview.dataset.v232Preview = "centered");
  });
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v232Launcher = "stable-square";
    for (const property of ["animation", "transition", "transform", "filter"]) important(launcher, property, "none");
    important(launcher, "opacity", "1");
  }
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope>.nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v232NaraMode = full ? "modal" : "nonmodal";
  shell.dataset.v232NaraSize = size;
  shell.dataset.v232NaraFamily = resolveFamily();
  layer.setAttribute("aria-modal", String(full));

  if (!full) {
    important(layer, "pointer-events", "none");
    important(layer, "background", "transparent");
    important(layer, "backdrop-filter", "none");
    important(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }

  shell.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.intelligence,.nara-select.model,.nara-attachment-menu-wrap").forEach((control) => {
    control.hidden = false;
    control.removeAttribute("inert");
    control.removeAttribute("aria-hidden");
    control.dataset.v232Control = "visible";
  });
  const plus = shell.querySelector(".nara-attachment-menu-wrap>button");
  if (plus) {
    plus.dataset.v232Plus = "camera-photo-file";
    plus.setAttribute("aria-label", "Tambah kamera, foto, atau file");
    plus.setAttribute("aria-haspopup", "menu");
  }
  const menu = shell.querySelector(".nara-attachment-menu");
  if (menu) {
    menu.dataset.v232AttachmentMenu = "visible-safe-area";
    menu.setAttribute("role", "menu");
    important(menu, "visibility", "visible");
    important(menu, "opacity", "1");
    important(menu, "pointer-events", "auto");
  }
}

function normalizeTopbar() {
  const topbar = document.querySelector(".sn-top,.sn-topbar");
  if (!topbar) return;
  topbar.dataset.v232Topbar = "profile-aligned";
  topbar.querySelectorAll("[data-studio-mode-badge],[data-device-mode-badge],.studio-device-mode-badge,.v225-mode-badge").forEach((node) => setHidden(node, true));
  const avatar = topbar.querySelector(".sn-avatar");
  if (avatar) {
    avatar.hidden = false;
    avatar.removeAttribute("aria-hidden");
    avatar.dataset.v232Profile = "visible";
  }
}

function normalizeDomain() {
  if (resolveFamily() !== "small") return;
  document.querySelectorAll(".sv124-domain-page button,.sv124-domain-page a").forEach((control) => {
    if (/jadikan draf|terbitkan|hubungkan|verifikasi|muat ulang|refresh|salin|hapus|utama/i.test(label(control))) control.dataset.v232DomainAction = "full-row";
  });
}

function sync() {
  frame = 0;
  normalizeMode();
  normalizeSidebar();
  normalizeTopbar();
  normalizeThemeActions();
  normalizeThemeLayout();
  normalizeCodeEditor();
  normalizeNara();
  normalizeDomain();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "aria-expanded", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-mode", "data-studio-device-variant", "data-studio-desktop-site-phone"],
});
for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) window.addEventListener(eventName, schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
schedule();

export { RELEASE, resolveFamily, deviceMetrics };
