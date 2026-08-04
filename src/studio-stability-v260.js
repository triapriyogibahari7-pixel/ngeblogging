export const RELEASE = "studio-stability-v260-20260804-r2";

const SMALL = new Set(["application", "phone", "mobile", "compact"]);
const PROFILE_ORDER = ["profile", "avatar", "settings", "add-site", "view-site", "nara", "logout"];
const MODE_EVENT = "ngeblogging:studio-device-mode-change";
let frame = 0;

function html() { return document.documentElement; }
function side() { return document.getElementById("ngeblogging-studio-sidebar"); }
function text(node) { return String(node?.textContent || "").replace(/\s+/g, " ").trim(); }
function setData(node, key, value) {
  if (!node || node.dataset[key] === String(value)) return false;
  node.dataset[key] = String(value);
  return true;
}

function mediaMatches(query) {
  try { return window.matchMedia?.(query)?.matches === true; }
  catch { return false; }
}

function normalizedScreenDimension(raw, density, fallback) {
  const value = Number(raw || fallback || 1);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  if (value <= 900) return value;
  return density >= 1.25 ? value / density : fallback;
}

function deviceMetrics() {
  const layoutWidth = Number(document.documentElement.clientWidth || window.innerWidth || 1);
  const layoutHeight = Number(document.documentElement.clientHeight || window.innerHeight || 1);
  const visualWidth = Number(window.visualViewport?.width || layoutWidth);
  const density = Math.max(1, Number(window.devicePixelRatio || 1));
  const screenWidth = normalizedScreenDimension(window.screen?.width, density, layoutWidth);
  const screenHeight = normalizedScreenDimension(window.screen?.height, density, layoutHeight);
  const shortSide = Math.min(screenWidth, screenHeight);
  const longSide = Math.max(screenWidth, screenHeight);
  const ua = navigator.userAgent || "";
  const platform = `${navigator.userAgentData?.platform || ""} ${navigator.platform || ""}`;
  const coarse = mediaMatches("(pointer: coarse)") || mediaMatches("(any-pointer: coarse)");
  const handheld = navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)
    || /Android|iPhone|iPad|iPod|Linux arm|Mobile/i.test(platform)
    || (Number(navigator.maxTouchPoints || 0) > 1 && coarse && shortSide < 768);
  const physicalViewportWidth = layoutHeight >= layoutWidth ? shortSide : longSide;
  const desktopSitePhone = handheld
    && shortSide < 768
    && Math.max(layoutWidth, visualWidth) >= 900
    && Math.max(layoutWidth, visualWidth) > physicalViewportWidth * 1.2;
  const standalone = mediaMatches("(display-mode: standalone)") || navigator.standalone === true;
  return { layoutWidth, layoutHeight, visualWidth, density, screenWidth, screenHeight, shortSide, longSide, handheld, desktopSitePhone, standalone };
}

function responsiveMode(view = deviceMetrics()) {
  if (view.standalone) return "application";
  if (view.desktopSitePhone) return "desktop";
  if (view.handheld && view.shortSide <= 430) return "phone";
  if (view.handheld && view.shortSide <= 600) return "mobile";
  if (view.handheld && view.shortSide < 768) return "compact";
  if (view.handheld) return "tablet";
  const effectiveWidth = Math.min(view.layoutWidth, view.visualWidth);
  if (effectiveWidth <= 760) return "compact";
  if (effectiveWidth <= 1180) return "tablet";
  return "desktop";
}

function deviceVariant(mode, view) {
  if (mode !== "desktop") return mode;
  if (view.desktopSitePhone) return "desktop";
  return Math.min(view.layoutWidth, view.visualWidth) <= 1536 ? "laptop" : "computer";
}

function family() {
  return SMALL.has(responsiveMode()) ? "small" : "large";
}

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("inert");
  node.removeAttribute("aria-hidden");
}

function closeProfileMenu() {
  document.querySelector(".sn-profile-menu-v260")?.remove();
  document.querySelector(".sn-avatar")?.setAttribute("aria-expanded", "false");
}

function actionButton(action, label, description) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("role", "menuitem");
  button.dataset.action = action;
  button.innerHTML = `<span>${label}</span><small>${description}</small>`;
  return button;
}

function normalizeProfileOrder(menu) {
  if (!menu) return;
  const buttons = new Map([...menu.querySelectorAll("button[data-action]")].map((button) => [button.dataset.action, button]));
  PROFILE_ORDER.forEach((action) => {
    const button = buttons.get(action);
    if (button) menu.append(button);
  });
}

function openProfileMenu(avatar) {
  const existing = document.querySelector(".sn-profile-menu-v260");
  if (existing) { closeProfileMenu(); return; }
  document.querySelectorAll(".sn-profile-menu-v150,.v235-profile-menu").forEach((menu) => menu.remove());
  const menu = document.createElement("div");
  menu.className = "sn-profile-menu-v150 sn-profile-menu-v260";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Menu akun");
  menu.append(
    actionButton("profile", "Profil", "Identitas, biografi, website, dan avatar"),
    actionButton("avatar", "Ganti avatar", "Buka pengaturan avatar profil"),
    actionButton("settings", "Pengaturan", "Situs, bahasa, zona waktu, dan preferensi"),
    actionButton("add-site", "Tambahkan situs", "Buat atau pilih situs lain"),
    actionButton("view-site", "Lihat situs", "Buka situs aktif di tab baru"),
    actionButton("nara", "Nara AI", "Buka asisten Nara"),
    actionButton("logout", "Keluar", "Akhiri sesi pada perangkat ini"),
  );
  document.body.append(menu);
  normalizeProfileOrder(menu);
  avatar.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => menu.querySelector("button")?.focus({ preventScroll: true }));
}

function openNaraFromProfile() {
  const liveLauncher = document.querySelector(".nara-floating-button:not([hidden]):not([aria-hidden='true'])");
  if (liveLauncher) {
    liveLauncher.click();
    return true;
  }
  const topButton = document.querySelector(".sn-nara-button:not(:disabled)");
  if (topButton) {
    topButton.click();
    return true;
  }
  const panel = document.querySelector(".nara-assistant-layer .nara-assistant-shell");
  return Boolean(panel);
}

function focusAvatarField() {
  let attempts = 0;
  const focus = () => {
    attempts += 1;
    const labels = [...document.querySelectorAll(".sn-settings-grid label")];
    const label = labels.find((node) => /avatar/i.test(text(node)));
    const input = label?.querySelector("input");
    if (input) {
      input.focus({ preventScroll: false });
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (attempts < 24) requestAnimationFrame(focus);
  };
  requestAnimationFrame(focus);
}

function performProfileAction(action) {
  if (action === "profile" || action === "avatar" || action === "settings") {
    const accountView = action === "settings" ? "settings" : "profile";
    html().dataset.studioAccountViewV189 = accountView;
    document.querySelector(".sn-account-settings-v135")?.click();
    if (action === "avatar") focusAvatarField();
  } else if (action === "add-site") {
    document.querySelector(".sn-workspace")?.click();
  } else if (action === "view-site") {
    const link = document.querySelector(".sn-view-site,[data-site-public-link],a[href*='.ngeblogging.com']");
    link?.click();
  } else if (action === "nara") {
    openNaraFromProfile();
  } else if (action === "logout") {
    document.querySelector(".sn-account-logout-v135")?.click();
  }
  closeProfileMenu();
}

function syncFamily() {
  const root = html();
  const view = deviceMetrics();
  const mode = responsiveMode(view);
  const current = SMALL.has(mode) ? "small" : "large";
  const variant = deviceVariant(mode, view);
  const previousDeviceMode = root.dataset.studioDeviceMode || "";

  setData(root, "studioStabilityV260", RELEASE);
  setData(root, "studioV260Family", current);
  setData(root, "studioV253Family", current);
  setData(root, "studioV259Family", current);
  setData(root, "studioResponsiveMode", mode);
  setData(root, "studioDeviceMode", current);
  setData(root, "studioDeviceVariant", variant);
  setData(root, "studioDesktopSitePhone", String(view.desktopSitePhone));
  setData(root, "studioHandheld", String(view.handheld));
  setData(root, "studioSurfaceMode", view.standalone ? "application" : "browser");

  if (view.desktopSitePhone) setData(root, "v232ModeLock", "desktop-site-large");
  else if (root.dataset.v232ModeLock === "desktop-site-large") delete root.dataset.v232ModeLock;

  const sidebar = side();
  if (!sidebar) return current;
  reveal(sidebar);
  if (current === "large") {
    sidebar.classList.remove("mobile-open");
    document.body.classList.remove("sn-mobile-sidebar-open");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
  }
  const open = current === "small" ? sidebar.classList.contains("mobile-open") : !sidebar.classList.contains("collapsed");
  setData(root, "studioV260Sidebar", current === "small" ? (open ? "open" : "closed") : (open ? "expanded" : "collapsed"));
  setData(root, "studioV259Sidebar", current === "small" ? (open ? "open" : "closed") : (open ? "expanded" : "collapsed"));

  const logo = sidebar.querySelector(".sn-logo-mark");
  reveal(logo);
  if (logo) {
    logo.dataset.v260SingleN = "true";
    logo.setAttribute("role", "button");
    logo.setAttribute("tabindex", "0");
    logo.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    logo.setAttribute("aria-expanded", String(open));
    logo.setAttribute("aria-label", current === "small" ? "Tutup menu Studio" : open ? "Ciutkan menu Studio" : "Perluas menu Studio");
    const mark = logo.querySelector("strong");
    if (mark) mark.textContent = "n";
  }
  const brand = sidebar.querySelector(".sn-logo>b");
  if (brand) brand.textContent = "Ngeblogging";

  sidebar.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button").forEach((button) => {
    reveal(button);
    button.disabled = false;
    const label = text(button.querySelector("span")) || text(button);
    if (label) {
      button.setAttribute("title", label);
      button.setAttribute("aria-label", label);
    }
  });

  if (previousDeviceMode && previousDeviceMode !== current) {
    window.dispatchEvent(new CustomEvent(MODE_EVENT, {
      detail: { mode: current, responsiveMode: mode, variant, release: RELEASE, handheld: view.handheld, desktopSitePhone: view.desktopSitePhone },
    }));
  }
  return current;
}

function syncProfile() {
  const avatar = document.querySelector(".sn-avatar");
  reveal(avatar);
  if (avatar) {
    avatar.dataset.nativeProfileMenu = "v260";
    avatar.dataset.v260Profile = "fixed-top-right";
    avatar.setAttribute("aria-haspopup", "menu");
    avatar.setAttribute("aria-label", "Buka menu profil");
  }
  normalizeProfileOrder(document.querySelector(".sn-profile-menu-v260"));
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  const layer = document.querySelector(".nara-assistant-layer");
  const panel = layer?.querySelector(".nara-assistant-shell");
  if (!panel || !layer) {
    reveal(launcher);
    if (launcher) launcher.dataset.v260Launcher = "fixed-corner";
    return;
  }
  if (launcher) {
    launcher.hidden = true;
    launcher.setAttribute("aria-hidden", "true");
  }
  const size = ["small", "medium", "full"].includes(panel.dataset.naraSize) ? panel.dataset.naraSize : "small";
  const full = size === "full";
  layer.dataset.v260Interaction = full ? "modal" : "nonmodal";
  layer.dataset.v260Size = size;
  panel.dataset.v260Size = size;
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
  panel.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.intelligence,.nara-select.model,.nara-attachment-menu-wrap").forEach(reveal);
  const plus = panel.querySelector(".nara-attachment-menu-wrap>button");
  if (plus) {
    reveal(plus);
    plus.setAttribute("aria-label", "Tambah kamera, foto, atau file");
    plus.setAttribute("aria-haspopup", "menu");
  }
  const menu = panel.querySelector(".nara-attachment-menu");
  if (menu) menu.dataset.v260AttachmentMenu = "camera-photo-file";
}

function sync() {
  frame = 0;
  syncFamily();
  syncProfile();
  syncNara();
}
function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    const avatar = event.target.closest?.(".sn-avatar");
    if (avatar) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      openProfileMenu(avatar);
      return;
    }
    const action = event.target.closest?.(".sn-profile-menu-v260 button[data-action]");
    if (action) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      performProfileAction(action.dataset.action);
      return;
    }
    if (!event.target.closest?.(".sn-profile-menu-v260")) closeProfileMenu();
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeProfileMenu();
  }, true);

  new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" || record.attributeName === "class" || record.attributeName === "hidden" || record.attributeName === "data-nara-size" || record.attributeName === "data-studio-responsive-mode" || record.attributeName === "data-studio-device-mode" || record.attributeName === "data-studio-desktop-site-phone" || record.attributeName === "data-v232-mode-lock")) schedule();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "hidden", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-mode", "data-studio-desktop-site-phone", "data-v232-mode-lock"],
  });
  for (const name of ["pageshow", "resize", "orientationchange", "online"]) window.addEventListener(name, schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  schedule();
}

export { deviceMetrics, responsiveMode, family, schedule, sync, openNaraFromProfile };