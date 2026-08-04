export const RELEASE = "studio-six-mode-authority-v259-20260804";

const SMALL_MODES = new Set(["application", "phone", "mobile", "compact"]);
const LARGE_MODES = new Set(["tablet", "desktop", "laptop", "computer"]);
const REQUIRED_MENU_LABELS = new Set([
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
]);

let frame = 0;
let resizeTimer = 0;
const gutterState = new WeakMap();

function root() {
  return document.documentElement;
}

function cleanText(node) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function normalizedScreen(value, density, fallback) {
  const number = Number(value || fallback || 1);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  if (number <= 900) return number;
  return density >= 1.25 ? number / density : fallback;
}

function metrics() {
  const layoutWidth = Number(document.documentElement.clientWidth || window.innerWidth || 1);
  const layoutHeight = Number(document.documentElement.clientHeight || window.innerHeight || 1);
  const density = Math.max(1, Number(window.devicePixelRatio || 1));
  const screenWidth = normalizedScreen(window.screen?.width, density, layoutWidth);
  const screenHeight = normalizedScreen(window.screen?.height, density, layoutHeight);
  const shortSide = Math.min(screenWidth, screenHeight);
  const ua = navigator.userAgent || "";
  const handheld = navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)
    || (Number(navigator.maxTouchPoints || 0) > 1 && shortSide < 768);
  const desktopSitePhone = handheld && shortSide < 768 && layoutWidth >= 900;
  return { layoutWidth, layoutHeight, density, shortSide, handheld, desktopSitePhone };
}

function resolvedMode() {
  const html = root();
  const view = metrics();
  const legacyDesktopLock = html.dataset.v232ModeLock === "desktop-site-large"
    || html.dataset.studioDesktopSitePhone === "true";
  if (view.desktopSitePhone || legacyDesktopLock) {
    return { family: "large", mode: "desktop", desktopSitePhone: true };
  }

  const responsive = String(html.dataset.studioResponsiveMode || "").toLowerCase();
  const variant = String(html.dataset.studioDeviceVariant || "").toLowerCase();
  if (SMALL_MODES.has(responsive)) return { family: "small", mode: responsive, desktopSitePhone: false };
  if (LARGE_MODES.has(responsive)) {
    return { family: "large", mode: LARGE_MODES.has(variant) ? variant : responsive, desktopSitePhone: false };
  }
  if (SMALL_MODES.has(variant)) return { family: "small", mode: variant, desktopSitePhone: false };
  if (LARGE_MODES.has(variant)) return { family: "large", mode: variant, desktopSitePhone: false };
  return view.layoutWidth <= 760
    ? { family: "small", mode: view.layoutWidth <= 430 ? "phone" : "compact", desktopSitePhone: false }
    : { family: "large", mode: view.layoutWidth <= 1180 ? "tablet" : "desktop", desktopSitePhone: false };
}

function syncModeLock() {
  const html = root();
  const mode = resolvedMode();
  html.dataset.studioSixModeAuthorityV259 = RELEASE;
  html.dataset.studioV259Family = mode.family;
  html.dataset.studioV259Mode = mode.mode;
  html.dataset.studioV259DesktopSitePhone = String(mode.desktopSitePhone);

  // Chrome Android "Situs desktop" is an explicit large-layout choice. Keep it
  // stable instead of bouncing between mobile and desktop authorities.
  if (mode.desktopSitePhone) {
    html.dataset.studioDesktopSitePhone = "true";
    html.dataset.studioResponsiveMode = "desktop";
    html.dataset.studioDeviceMode = "large";
    html.dataset.studioDeviceVariant = "desktop";
    html.dataset.v232ModeLock = "desktop-site-large";
  }
  return mode;
}

function revealControl(node) {
  if (!node) return;
  node.hidden = false;
  node.disabled = false;
  node.removeAttribute("hidden");
  node.removeAttribute("inert");
  node.removeAttribute("aria-hidden");
}

function syncSidebar(mode) {
  const html = root();
  const side = document.getElementById("ngeblogging-studio-sidebar");
  const shell = document.querySelector(".sn-shell");
  if (!side || !shell) return;

  revealControl(side);
  const small = mode.family === "small";
  const drawerOpen = side.classList.contains("mobile-open");
  const collapsed = side.classList.contains("collapsed");
  html.dataset.studioV259Sidebar = small
    ? (drawerOpen ? "open" : "closed")
    : (collapsed ? "collapsed" : "expanded");

  const logo = side.querySelector(".sn-logo-mark");
  revealControl(logo);
  if (logo) {
    logo.dataset.v259SingleN = "true";
    logo.setAttribute("role", "button");
    logo.setAttribute("tabindex", "0");
    logo.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    logo.setAttribute("aria-expanded", String(small ? drawerOpen : !collapsed));
    logo.setAttribute("aria-label", small
      ? "Tutup menu Studio"
      : collapsed ? "Perluas menu Studio" : "Ciutkan menu Studio");
    logo.setAttribute("title", logo.getAttribute("aria-label"));
    const letter = logo.querySelector("strong");
    if (letter) letter.textContent = "n";
  }
  const brand = side.querySelector(".sn-logo>b");
  if (brand) brand.textContent = "Ngeblogging";

  const requiredControls = [
    side.querySelector(".sn-new"),
    ...side.querySelectorAll(":scope>nav>button"),
    ...side.querySelectorAll(":scope>.sn-account-footer>button"),
  ].filter(Boolean);
  requiredControls.forEach((button) => {
    const label = cleanText(button.querySelector("span")) || cleanText(button);
    if (!REQUIRED_MENU_LABELS.has(label)) return;
    revealControl(button);
    button.dataset.v259RequiredMenu = "true";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });

  const nav = side.querySelector(":scope>nav");
  if (nav) {
    nav.hidden = false;
    nav.removeAttribute("aria-hidden");
    nav.dataset.v259Menu = "tight-complete";
  }
  const footer = side.querySelector(":scope>.sn-account-footer");
  if (footer) {
    footer.hidden = false;
    footer.removeAttribute("aria-hidden");
    footer.dataset.v259Footer = "pinned-bottom";
  }

  const topToggle = shell.querySelector(".sn-sidebar-toggle");
  if (topToggle) {
    revealControl(topToggle);
    const mark = topToggle.querySelector(".sn-mobile-menu-mark strong");
    if (mark) mark.textContent = "n";
    topToggle.dataset.v259Toggle = small ? "mobile-single-n" : "react-owner-hidden-large";
  }

  // No stale body lock after the drawer or a non-modal assistant closes.
  if (!small || !drawerOpen) {
    document.body.classList.remove("sn-mobile-sidebar-open");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
    document.documentElement.style.removeProperty("overflow");
  }

  document.querySelectorAll([
    ".sn-side-close", ".sn-sidebar-edge-toggle-v147", ".v227-sidebar-fab",
    ".studio-external-sidebar-toggle", "[data-v173-collapse-toggle]",
    "[data-v187-sidebar-toggle]", "[data-v208-sidebar-toggle]",
    "[data-v223-sidebar-toggle]", "[data-v229-sidebar-toggle]",
    "[data-studio-mode-badge]", "[data-device-mode-badge]",
    ".studio-device-mode-badge", ".v225-mode-badge", ".sn-device-mode-badge-v148",
  ].join(",")).forEach((node) => {
    node.hidden = true;
    node.setAttribute("aria-hidden", "true");
    node.style.setProperty("display", "none", "important");
  });

  shell.dataset.v259Shell = `${mode.family}-${mode.mode}`;
}

function syncProfile() {
  const avatar = document.querySelector(".sn-top .sn-avatar,.sn-avatar");
  revealControl(avatar);
  if (avatar) {
    avatar.dataset.v259Profile = "fixed-visible";
    avatar.setAttribute("aria-haspopup", "menu");
    avatar.setAttribute("aria-label", "Buka menu profil");
  }
  const menu = document.querySelector(".sn-profile-menu-v150,.v235-profile-menu");
  if (menu) menu.dataset.v259ProfileMenu = "bounded";
}

function syncNara(mode) {
  const launcher = document.querySelector(".nara-floating-button");
  revealControl(launcher);
  if (launcher) launcher.dataset.v259Launcher = "fixed-safe-corner";

  const layer = document.querySelector(".nara-assistant-layer");
  const panel = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !panel) return;
  const size = ["small", "medium", "full"].includes(panel.dataset.naraSize)
    ? panel.dataset.naraSize
    : "small";
  const full = size === "full";
  layer.dataset.v259Size = size;
  layer.dataset.v259Interaction = full ? "modal" : "nonmodal";
  panel.dataset.v259Family = mode.family;
  panel.dataset.v259Size = size;
  layer.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
  }
  if (!full) {
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
    document.documentElement.style.removeProperty("overflow");
  }

  panel.querySelectorAll([
    ".nara-size-controls-v147", ".nara-auto-voice-v148", ".nara-native-auto-voice-v149",
    ".nara-select.intelligence", ".nara-select.model", ".nara-attachment-menu-wrap",
  ].join(",")).forEach((control) => {
    revealControl(control);
    control.dataset.v259NaraControl = "visible";
  });

  const plus = panel.querySelector(".nara-attachment-menu-wrap>button");
  if (plus) {
    revealControl(plus);
    plus.dataset.v259Attachment = "camera-photo-file";
    plus.setAttribute("aria-haspopup", "menu");
    plus.setAttribute("aria-label", "Tambah kamera, foto, atau file");
  }
  const menu = panel.querySelector(".nara-attachment-menu");
  if (menu) {
    menu.dataset.v259AttachmentMenu = "viewport-safe";
    menu.setAttribute("role", "menu");
  }
}

function lineNumbersFor(textarea) {
  const lines = Math.min(10_000, Math.max(1, String(textarea.value || "").split("\n").length));
  const previous = gutterState.get(textarea);
  if (previous?.lines === lines && previous.gutter?.isConnected) return previous.gutter;

  const pane = textarea.closest(".tn-code-pane");
  if (!pane) return null;
  let gutter = pane.querySelector(`.v259-code-gutter[data-for="${textarea.getAttribute("aria-label") || "code"}"]`);
  if (!gutter) {
    gutter = document.createElement("pre");
    gutter.className = "v259-code-gutter";
    gutter.setAttribute("aria-hidden", "true");
    gutter.dataset.for = textarea.getAttribute("aria-label") || "code";
    pane.insertBefore(gutter, textarea);
  }
  gutter.textContent = Array.from({ length: lines }, (_, index) => String(index + 1)).join("\n");
  textarea.dataset.v259CodeEditor = "numbered-up-to-10000";
  gutterState.set(textarea, { lines, gutter });
  return gutter;
}

function syncCodeGutters() {
  document.querySelectorAll(".tn-code-pane textarea").forEach((textarea) => {
    const gutter = lineNumbersFor(textarea);
    if (!gutter) return;
    gutter.style.top = `${textarea.offsetTop}px`;
    gutter.style.height = `${textarea.clientHeight}px`;
    gutter.scrollTop = textarea.scrollTop;
    if (textarea.dataset.v259GutterBound !== "true") {
      textarea.dataset.v259GutterBound = "true";
      textarea.addEventListener("scroll", () => {
        const state = gutterState.get(textarea);
        if (state?.gutter) state.gutter.scrollTop = textarea.scrollTop;
      }, { passive: true });
      textarea.addEventListener("input", schedule, { passive: true });
    }
  });
}

function syncOperationalPages(mode) {
  document.querySelectorAll(".ce-app").forEach((editor) => {
    editor.dataset.v259Editor = mode.family === "small" ? "mobile-bounded" : "large-bounded";
  });
  document.querySelectorAll(".sv124-domain-page,.sn-domain-page,[data-domain-page]").forEach((page) => {
    page.dataset.v259Domain = mode.family === "small" ? "full-row-actions" : "large-actions";
    if (mode.family !== "small") return;
    page.querySelectorAll("button,a").forEach((control) => {
      if (/jadikan draf|terbitkan|hubungkan|verifikasi|muat ulang|refresh|salin|hapus|utama|buka/i.test(cleanText(control))) {
        control.dataset.v259DomainAction = "full-row";
      }
    });
  });
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    workspace.dataset.v259Workspace = mode.family === "small"
      ? "preview-top-code-bottom"
      : "code-left-preview-right";
  });
  document.querySelectorAll("#ngeblogging-layout-map,.tn-layout-studio").forEach((layout) => {
    layout.dataset.v259Layout = "centered-interactive";
  });
  syncCodeGutters();
}

function sync() {
  frame = 0;
  const mode = syncModeLock();
  syncSidebar(mode);
  syncProfile();
  syncNara(mode);
  syncOperationalPages(mode);
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

function scheduleAfterResize() {
  schedule();
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(schedule, 120);
}

if (typeof document !== "undefined") {
  new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList"
      || record.attributeName === "class"
      || record.attributeName === "hidden"
      || record.attributeName === "data-nara-size"
      || record.attributeName === "data-studio-responsive-mode"
      || record.attributeName === "data-studio-device-variant")) schedule();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "class", "hidden", "data-nara-size", "data-studio-responsive-mode",
      "data-studio-device-variant", "data-studio-desktop-site-phone",
    ],
  });

  for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) {
    window.addEventListener(eventName, scheduleAfterResize, { passive: true });
  }
  window.visualViewport?.addEventListener("resize", scheduleAfterResize, { passive: true });
  schedule();
}

export { metrics, resolvedMode, schedule, sync };