export const RELEASE = "studio-profile-menu-v268-20260804";

const MENU_CLASS = "sn-profile-menu-v150";

function root() { return document.documentElement; }
function avatar() { return document.querySelector(".sn-top .sn-avatar"); }
function menu() { return document.querySelector(`.${MENU_CLASS}[data-profile-menu-v268]`); }

function closeMenu() {
  menu()?.remove();
  const button = avatar();
  if (button) button.setAttribute("aria-expanded", "false");
}

function openAccountView(mode) {
  root().dataset.studioAccountViewV189 = mode === "profile" ? "profile" : "settings";
  document.querySelector(".sn-account-settings-v135")?.click();
  closeMenu();
}

function addSite() {
  closeMenu();
  const workspace = document.querySelector(".sn-workspace");
  if (workspace) workspace.click();
}

function openNara() {
  closeMenu();
  document.querySelector(".nara-floating-button")?.click();
}

function logout() {
  closeMenu();
  document.querySelector(".sn-account-logout-v135")?.click();
}

function renderMenu(button) {
  closeMenu();
  const host = document.querySelector(".sn-top-actions") || button.parentElement;
  if (!host) return;
  const panel = document.createElement("div");
  panel.className = MENU_CLASS;
  panel.dataset.profileMenuV268 = RELEASE;
  panel.setAttribute("role", "menu");
  panel.setAttribute("aria-label", "Menu akun");
  panel.innerHTML = `
    <button type="button" role="menuitem" data-action="profile"><span>Profil</span><small>Avatar, nama, biografi, dan website</small></button>
    <button type="button" role="menuitem" data-action="add-site"><span>Tambahkan situs</span><small>Buat atau kelola workspace situs</small></button>
    <button type="button" role="menuitem" data-action="settings"><span>Pengaturan</span><small>Bahasa, zona waktu, dan situs aktif</small></button>
    <button type="button" role="menuitem" data-action="nara"><span>Nara AI</span><small>Buka asisten yang sedang aktif</small></button>
    <button type="button" role="menuitem" data-action="logout"><span>Keluar</span><small>Akhiri sesi hanya saat dipilih</small></button>`;
  host.append(panel);
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-expanded", "true");
  button.setAttribute("aria-label", "Buka menu profil");
  panel.querySelector("button")?.focus({ preventScroll: true });
}

function activateAction(action) {
  if (action === "profile") openAccountView("profile");
  else if (action === "add-site") addSite();
  else if (action === "settings") openAccountView("settings");
  else if (action === "nara") openNara();
  else if (action === "logout") logout();
}

function clickHandler(event) {
  const button = event.target.closest?.(".sn-top .sn-avatar");
  if (button) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (menu()) closeMenu();
    else renderMenu(button);
    return;
  }

  const item = event.target.closest?.(`.${MENU_CLASS}[data-profile-menu-v268] button[data-action]`);
  if (item) {
    event.preventDefault();
    event.stopImmediatePropagation();
    activateAction(item.dataset.action);
    return;
  }

  if (menu() && !event.target.closest?.(`.${MENU_CLASS}[data-profile-menu-v268]`)) closeMenu();
}

function keyHandler(event) {
  if (event.key === "Escape" && menu()) {
    event.preventDefault();
    closeMenu();
    avatar()?.focus({ preventScroll: true });
  }
}

if (typeof document !== "undefined") {
  root().dataset.studioProfileMenuV268 = RELEASE;
  document.addEventListener("click", clickHandler, true);
  document.addEventListener("keydown", keyHandler, true);
}
