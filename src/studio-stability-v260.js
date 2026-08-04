export const RELEASE = "studio-stability-v260-20260804";

const SMALL = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;

function html() { return document.documentElement; }
function side() { return document.getElementById("ngeblogging-studio-sidebar"); }
function text(node) { return String(node?.textContent || "").replace(/\s+/g, " ").trim(); }

function family() {
  const root = html();
  const mode = String(root.dataset.studioResponsiveMode || "").toLowerCase();
  const width = Number(document.documentElement.clientWidth || window.innerWidth || 1);
  if (root.dataset.studioDesktopSitePhone === "true" || width >= 900) return "large";
  if (mode === "tablet" || mode === "desktop") return "large";
  if (SMALL.has(mode)) return "small";
  return width >= 768 ? "large" : "small";
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

function openProfileMenu(avatar) {
  const existing = document.querySelector(".sn-profile-menu-v260");
  if (existing) { closeProfileMenu(); return; }
  document.querySelectorAll(".sn-profile-menu-v150,.v235-profile-menu").forEach((menu) => menu.remove());
  const menu = document.createElement("div");
  menu.className = "sn-profile-menu-v150 sn-profile-menu-v260";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Menu akun");
  menu.append(
    actionButton("profile", "Profil", "Avatar, identitas, dan biografi"),
    actionButton("settings", "Pengaturan", "Situs, bahasa, zona waktu, dan preferensi"),
    actionButton("add-site", "Tambahkan situs", "Buat atau pilih situs lain"),
    actionButton("view-site", "Lihat situs", "Buka situs aktif di tab baru"),
    actionButton("nara", "Nara AI", "Buka asisten Nara"),
    actionButton("logout", "Keluar", "Akhiri sesi pada perangkat ini"),
  );
  document.body.append(menu);
  avatar.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => menu.querySelector("button")?.focus({ preventScroll: true }));
}

function performProfileAction(action) {
  if (action === "profile" || action === "settings") {
    html().dataset.studioAccountViewV189 = action;
    document.querySelector(".sn-account-settings-v135")?.click();
  } else if (action === "add-site") {
    document.querySelector(".sn-workspace")?.click();
  } else if (action === "view-site") {
    const link = document.querySelector(".sn-view-site,[data-site-public-link],a[href*='.ngeblogging.com']");
    link?.click();
  } else if (action === "nara") {
    (document.querySelector(".sn-nara-button") || document.querySelector(".nara-floating-button"))?.click();
  } else if (action === "logout") {
    document.querySelector(".sn-account-logout-v135")?.click();
  }
  closeProfileMenu();
}

function syncFamily() {
  const root = html();
  const current = family();
  root.dataset.studioStabilityV260 = RELEASE;
  root.dataset.studioV260Family = current;
  root.dataset.studioV253Family = current;
  root.dataset.studioV259Family = current;
  root.dataset.studioDeviceMode = current;

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
  root.dataset.studioV260Sidebar = current === "small" ? (open ? "open" : "closed") : (open ? "expanded" : "collapsed");

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
    const label = text(button.querySelector("span")) || text(button);
    if (label) {
      button.setAttribute("title", label);
      button.setAttribute("aria-label", label);
    }
  });
  return current;
}

function syncProfile() {
  const avatar = document.querySelector(".sn-avatar");
  reveal(avatar);
  if (!avatar) return;
  avatar.dataset.nativeProfileMenu = "v260";
  avatar.dataset.v260Profile = "fixed-top-right";
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-label", "Buka menu profil");
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
    if (records.some((record) => record.type === "childList" || record.attributeName === "class" || record.attributeName === "hidden" || record.attributeName === "data-nara-size" || record.attributeName === "data-studio-responsive-mode" || record.attributeName === "data-studio-device-mode")) schedule();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "hidden", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-mode", "data-studio-desktop-site-phone"],
  });
  for (const name of ["pageshow", "resize", "orientationchange", "online"]) window.addEventListener(name, schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  schedule();
}

export { family, schedule, sync };