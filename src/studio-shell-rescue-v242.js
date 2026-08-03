import "./studio-shell-rescue-v242.css";
import { openProfile } from "./studio-finalization-v178.js";

export const RELEASE = "studio-shell-rescue-v242-20260803";

let frame = 0;
let accountMenu = null;
let attachmentMenu = null;
let accountAnchor = null;

const SMALL_MODES = new Set(["application", "phone", "mobile", "compact"]);
const MODE_BADGES = [
  ".sn-device-mode-badge-v148",
  "[data-studio-mode-badge]",
  "[data-device-mode-badge]",
  ".studio-device-mode-badge",
  ".v225-mode-badge",
];

function family() {
  const root = document.documentElement;
  if (root.dataset.v238Family === "small" || root.dataset.v238Family === "large") return root.dataset.v238Family;
  if (root.dataset.studioDeviceMode === "small" || root.dataset.studioDeviceMode === "large") return root.dataset.studioDeviceMode;
  const responsive = root.dataset.studioResponsiveMode || "";
  if (SMALL_MODES.has(responsive)) return "small";
  if (responsive === "tablet" || responsive === "desktop") return "large";
  return innerWidth <= 760 ? "small" : "large";
}

function important(node, name, value) {
  node?.style?.setProperty(name, value, "important");
}

function reveal(node, display = "block") {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("inert");
  node.removeAttribute("aria-hidden");
  important(node, "display", display);
  important(node, "visibility", "visible");
  important(node, "opacity", "1");
  important(node, "filter", "none");
}

function hide(node) {
  if (!node) return;
  important(node, "display", "none");
  important(node, "visibility", "hidden");
}

function removeLegacyChrome() {
  document.querySelectorAll(".sn-sidebar-edge-toggle-v147,.sn-side-close").forEach(hide);
  document.querySelectorAll(MODE_BADGES.join(",")).forEach(hide);
}

function syncShellChrome() {
  const root = document.documentElement;
  const shell = document.querySelector(".sn-shell");
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const main = shell?.querySelector(":scope > .sn-main");
  const top = main?.querySelector(":scope > .sn-top");
  const topToggle = top?.querySelector(".sn-sidebar-toggle");
  const mobileMark = topToggle?.querySelector(".sn-mobile-menu-mark");
  const topActions = top?.querySelector(".sn-top-actions");
  const avatar = topActions?.querySelector(".sn-avatar") || top?.querySelector(".sn-avatar");
  const internalN = sidebar?.querySelector(".sn-logo-mark");
  if (!shell || !sidebar || !main || !top) return;

  const mode = family();
  const mobileOpen = sidebar.classList.contains("mobile-open");
  root.dataset.studioShellRescueV242 = RELEASE;
  root.dataset.v242Family = mode;
  shell.dataset.v242Shell = "stable";
  sidebar.dataset.v242Navigation = mode === "small" ? "single-n-drawer" : "single-internal-n";
  main.dataset.v242Content = "sidebar-aware";

  reveal(top, "flex");
  reveal(topActions, "flex");
  reveal(avatar, "grid");
  avatar?.setAttribute("aria-haspopup", "menu");
  avatar?.setAttribute("aria-label", "Buka menu profil");
  if (avatar) avatar.dataset.v242Profile = "five-actions";

  reveal(internalN, "grid");
  internalN?.setAttribute("role", "button");
  internalN?.setAttribute("tabindex", "0");
  internalN?.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
  internalN?.setAttribute("aria-label", mode === "large"
    ? (sidebar.classList.contains("collapsed") ? "Buka menu Studio" : "Tutup menu Studio")
    : "Tutup menu Studio");

  main.removeAttribute("inert");
  main.removeAttribute("aria-hidden");
  important(main, "filter", "none");
  important(main, "transform", "none");

  if (mode === "small") {
    reveal(topToggle, mobileOpen ? "none" : "grid");
    if (mobileOpen) hide(topToggle);
    else {
      reveal(topToggle, "grid");
      reveal(mobileMark, "grid");
    }
    topToggle?.setAttribute("aria-expanded", String(mobileOpen));
    topToggle?.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    document.body.classList.toggle("sn-mobile-sidebar-open", mobileOpen);
  } else {
    hide(topToggle);
    document.body.classList.remove("sn-mobile-sidebar-open");
    reveal(sidebar, "flex");
  }
}

function closeAccountMenu() {
  accountMenu?.remove();
  accountMenu = null;
  accountAnchor?.setAttribute("aria-expanded", "false");
  accountAnchor = null;
}

function viewportBox(anchor, box, preferred = "below") {
  const viewport = window.visualViewport;
  const vw = Math.max(280, viewport?.width || innerWidth);
  const vh = Math.max(320, viewport?.height || innerHeight);
  const offsetLeft = viewport?.offsetLeft || 0;
  const offsetTop = viewport?.offsetTop || 0;
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(Number(box.dataset.width || 330), vw - 20);
  const maxHeight = Math.min(Number(box.dataset.height || 430), vh - 20);
  const left = Math.min(offsetLeft + vw - width - 10, Math.max(offsetLeft + 10, rect.right - width));
  let top = preferred === "above" ? rect.top - maxHeight - 8 : rect.bottom + 8;
  if (top < offsetTop + 10 || top + maxHeight > offsetTop + vh - 10) {
    top = Math.max(offsetTop + 10, Math.min(offsetTop + vh - maxHeight - 10, rect.top - maxHeight - 8));
  }
  Object.assign(box.style, {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    maxHeight: `${maxHeight}px`,
  });
}

function accountAction(action, anchor) {
  closeAccountMenu();
  if (action === "profile") {
    openProfile(anchor || document.querySelector(".sn-avatar"));
    return;
  }
  if (action === "settings") {
    document.documentElement.dataset.v239AccountSurface = "settings";
    document.querySelector(".sn-account-settings-v135")?.click();
    return;
  }
  if (action === "add-site") {
    document.querySelector(".sn-workspace")?.click();
    return;
  }
  if (action === "view-site") {
    const link = document.querySelector(".sn-view-site[href],.sn-secondary-link[href]");
    if (link) link.click();
    return;
  }
  if (action === "logout") document.querySelector(".sn-account-logout-v135")?.click();
}

function openAccountMenu(anchor) {
  closeAccountMenu();
  document.querySelectorAll(".v241-account-menu,.sn-profile-menu-v150,.sn-profile-menu-v147").forEach((node) => node.remove());
  const menu = document.createElement("div");
  menu.className = "v242-account-menu";
  menu.dataset.width = "330";
  menu.dataset.height = "430";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Menu profil pengguna");
  menu.innerHTML = `
    <button type="button" role="menuitem" data-action="profile"><b>Profil</b><small>Avatar, identitas, biografi, dan website</small></button>
    <button type="button" role="menuitem" data-action="settings"><b>Pengaturan</b><small>Konfigurasi situs aktif</small></button>
    <button type="button" role="menuitem" data-action="add-site"><b>Tambahkan situs</b><small>Buat atau kelola situs lain</small></button>
    <button type="button" role="menuitem" data-action="view-site"><b>Lihat situs</b><small>Buka situs publik aktif</small></button>
    <button type="button" role="menuitem" class="danger" data-action="logout"><b>Keluar</b><small>Akhiri sesi pada perangkat ini</small></button>`;
  menu.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (button) accountAction(button.dataset.action, anchor);
  });
  document.body.append(menu);
  viewportBox(anchor, menu, "below");
  accountMenu = menu;
  accountAnchor = anchor;
  anchor.setAttribute("aria-expanded", "true");
  menu.querySelector("button")?.focus({ preventScroll: true });
}

function naraInput(kind) {
  const composer = document.querySelector(".nara-composer");
  if (!composer) return null;
  if (kind === "camera") return composer.querySelector('input[type="file"][capture]');
  if (kind === "photo") return [...composer.querySelectorAll('input[type="file"][accept*="image"]')]
    .find((input) => !input.hasAttribute("capture"));
  return [...composer.querySelectorAll('input[type="file"]')]
    .find((input) => /txt|md|markdown|csv|json/i.test(input.getAttribute("accept") || ""));
}

function closeAttachmentMenu() {
  attachmentMenu?.remove();
  attachmentMenu = null;
}

function attachmentIcon(kind) {
  if (kind === "camera") return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l2-3h6l2 3h3v12H4Z"/><circle cx="12" cy="13" r="4"/></svg>';
  if (kind === "photo") return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-5 3 3 3-3 5 5"/></svg>';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l4 4v16H6Z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h6"/></svg>';
}

function openAttachmentMenu(anchor) {
  closeAttachmentMenu();
  document.querySelectorAll(".v241-nara-attachment-portal,.v235-nara-attachment-portal,.nara-attachment-menu").forEach((node) => node.remove());
  const menu = document.createElement("div");
  menu.className = "v242-nara-attachment-menu";
  menu.dataset.width = family() === "small" ? "300" : "320";
  menu.dataset.height = "230";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Tambah lampiran Nara AI");
  menu.innerHTML = [
    ["camera", "Kamera", "Ambil foto sekarang"],
    ["photo", "Foto", "Pilih gambar dari perangkat"],
    ["file", "File", "TXT, Markdown, CSV, atau JSON"],
  ].map(([kind, label, help]) => `<button type="button" data-kind="${kind}">${attachmentIcon(kind)}<span><b>${label}</b><small>${help}</small></span></button>`).join("");
  menu.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-kind]");
    if (!button) return;
    const input = naraInput(button.dataset.kind);
    closeAttachmentMenu();
    input?.click();
  });
  document.body.append(menu);
  viewportBox(anchor, menu, "above");
  attachmentMenu = menu;
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.hidden = false;
    launcher.removeAttribute("inert");
    launcher.dataset.v242Launcher = "stable";
    important(launcher, "visibility", "visible");
    important(launcher, "opacity", "1");
    important(launcher, "animation", "none");
    important(launcher, "transition", "none");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) return;
  const size = ["small", "medium", "full"].includes(shell.dataset.naraSize) ? shell.dataset.naraSize : "small";
  const full = size === "full";
  layer.dataset.v242NaraMode = full ? "modal" : "nonmodal";
  shell.dataset.v242NaraSize = size;
  layer.setAttribute("aria-modal", String(full));
  shell.querySelectorAll([
    ".nara-size-controls-v147",
    ".nara-auto-voice-v148",
    '.nara-assistant-header button[title="Percakapan baru"]',
    '.nara-assistant-header button[title="Tutup"]',
    ".nara-attachment-menu-wrap",
    ".nara-select.intelligence",
    ".nara-select.model",
  ].join(",")).forEach((node) => reveal(node, node.matches(".nara-select") ? "grid" : "flex"));
  const plus = shell.querySelector(".nara-attachment-menu-wrap > button");
  if (plus) {
    reveal(plus, "grid");
    plus.setAttribute("aria-label", "Tambah kamera, foto, atau file");
  }
  if (!full) {
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
    mainUnlock();
  }
}

function mainUnlock() {
  document.querySelectorAll(".sn-main,.sn-shell").forEach((node) => {
    node.removeAttribute("inert");
    node.removeAttribute("aria-hidden");
    important(node, "filter", "none");
  });
}

function normalizeGeometry() {
  document.querySelectorAll([
    ".sn-main",
    ".sn-main > *",
    ".sn-view-pad",
    ".sn-view-pad > *",
    ".sv124-page",
    ".sv124-page > *",
    ".sv124-domain-page",
    ".tn-studio",
    ".tn-studio > *",
    ".ce-app",
    ".ce-app > *",
    ".sn-settings-grid",
    ".sn-settings-grid > *",
  ].join(",")).forEach((node) => {
    important(node, "min-width", "0");
    important(node, "max-width", "100%");
  });
}

function sync() {
  frame = 0;
  removeLegacyChrome();
  syncShellChrome();
  syncNara();
  normalizeGeometry();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

function redispatchReactClick(button) {
  if (!button || button.dataset.v242Redispatch === "true") return;
  button.dataset.v242Redispatch = "true";
  queueMicrotask(() => {
    try { button.click(); }
    finally { delete button.dataset.v242Redispatch; }
  });
}

window.addEventListener("click", (event) => {
  const internalN = event.target.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (internalN) {
    event.preventDefault();
    event.stopImmediatePropagation();
    redispatchReactClick(document.querySelector(".sn-sidebar-toggle"));
    return;
  }

  const topToggle = event.target.closest?.(".sn-sidebar-toggle");
  if (topToggle && topToggle.dataset.v242Redispatch !== "true") {
    event.preventDefault();
    event.stopImmediatePropagation();
    redispatchReactClick(topToggle);
    return;
  }

  const avatar = event.target.closest?.(".sn-avatar");
  if (avatar) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (accountMenu) closeAccountMenu();
    else openAccountMenu(avatar);
    return;
  }

  const plus = event.target.closest?.(".nara-attachment-menu-wrap > button");
  if (plus) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (attachmentMenu) closeAttachmentMenu();
    else openAttachmentMenu(plus);
    return;
  }

  if (accountMenu && !accountMenu.contains(event.target)) closeAccountMenu();
  if (attachmentMenu && !attachmentMenu.contains(event.target)) closeAttachmentMenu();
}, true);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAccountMenu();
    closeAttachmentMenu();
  }
  const internalN = event.target.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (internalN && ["Enter", " "].includes(event.key)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    redispatchReactClick(document.querySelector(".sn-sidebar-toggle"));
  }
}, true);

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    "class",
    "hidden",
    "inert",
    "aria-hidden",
    "data-nara-size",
    "data-v238-family",
    "data-studio-device-mode",
    "data-studio-responsive-mode",
    "data-studio-device-variant",
  ],
});

for (const eventName of ["resize", "orientationchange", "pageshow", "online"]) {
  window.addEventListener(eventName, schedule, { passive: true });
}
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

sync();
