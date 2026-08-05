import "./studio-react-shell-v287.css";

export const RELEASE = "studio-react-shell-v287-20260805";
const MENU_CLASS = "sn-profile-menu-v287";
let frame = 0;

const shell = () => document.querySelector(".sn-shell[data-device-mode],.sn-shell");
const sidebar = () => document.getElementById("ngeblogging-studio-sidebar");
const reactToggle = () => document.querySelector(".sn-main>.sn-top>.sn-sidebar-toggle,.sn-top>.sn-sidebar-toggle");
const avatar = () => document.querySelector(".sn-top .sn-avatar");
const menu = () => document.querySelector(`.${MENU_CLASS}`);

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("aria-hidden");
  node.removeAttribute("inert");
}

function currentFamily() {
  const mode = shell()?.dataset?.deviceMode || document.documentElement.dataset.studioDeviceMode;
  return mode === "large" ? "large" : "small";
}

function closeProfileMenu() {
  menu()?.remove();
  avatar()?.setAttribute("aria-expanded", "false");
}

function setButtonLabel(button, label) {
  if (!button) return;
  const text = [...button.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
  if (text) text.textContent = ` ${label}`;
}

function applyAccountSurface(requestedMode = "settings") {
  const mode = requestedMode === "profile" ? "profile" : "settings";
  const grid = document.querySelector(".sn-settings-grid");
  const page = grid?.closest(".sn-view-pad");
  if (!grid || !page) return false;
  const sections = [...grid.querySelectorAll(":scope>section")];
  const profileSection = sections[0] || null;
  const settingsSection = sections[1] || null;
  const title = page.querySelector(".sn-page-title h1");
  const description = page.querySelector(".sn-page-title p");
  const save = page.querySelector(".sn-save-settings");

  page.dataset.accountSurfaceV287 = mode;
  if (mode === "profile") {
    if (title) title.textContent = "Profil";
    if (description) description.textContent = "Kelola avatar, nama tampilan, biografi, dan website akun Anda.";
    setButtonLabel(save, "Simpan profil");
    reveal(profileSection);
    if (settingsSection) {
      settingsSection.hidden = true;
      settingsSection.setAttribute("aria-hidden", "true");
    }
  } else {
    if (title) title.textContent = "Pengaturan";
    if (description) description.textContent = "Kelola nama situs, deskripsi, bahasa, zona waktu, dan preferensi situs aktif.";
    setButtonLabel(save, "Simpan pengaturan");
    reveal(settingsSection);
    if (profileSection) {
      profileSection.hidden = true;
      profileSection.setAttribute("aria-hidden", "true");
    }
  }
  return true;
}

function settleAccountSurface(mode) {
  applyAccountSurface(mode);
  setTimeout(() => applyAccountSurface(mode), 60);
  setTimeout(() => applyAccountSurface(mode), 220);
}

function accountView(mode) {
  const normalized = mode === "profile" ? "profile" : "settings";
  document.documentElement.dataset.studioAccountViewV189 = normalized;
  document.documentElement.dataset.studioAccountViewV287 = normalized;
  document.querySelector(".sn-account-settings-v135")?.click();
  closeProfileMenu();
  settleAccountSurface(normalized);
}

function runProfileAction(action) {
  if (action === "profile") accountView("profile");
  else if (action === "add-site") {
    closeProfileMenu();
    document.querySelector(".sn-workspace")?.click();
  } else if (action === "settings") accountView("settings");
  else if (action === "nara") {
    closeProfileMenu();
    document.querySelector(".nara-floating-button")?.click();
  } else if (action === "logout") {
    closeProfileMenu();
    document.querySelector(".sn-account-logout-v135")?.click();
  }
}

function openProfileMenu(button) {
  closeProfileMenu();
  const panel = document.createElement("div");
  panel.className = MENU_CLASS;
  panel.dataset.profileMenuV287 = RELEASE;
  panel.setAttribute("role", "menu");
  panel.setAttribute("aria-label", "Menu profil Ngeblogging");
  panel.innerHTML = `
    <button type="button" role="menuitem" data-action="profile"><b>Profil</b><small>Avatar, nama, biografi, dan situs</small></button>
    <button type="button" role="menuitem" data-action="add-site"><b>Tambahkan situs</b><small>Buat atau pilih workspace</small></button>
    <button type="button" role="menuitem" data-action="settings"><b>Pengaturan</b><small>Bahasa, zona waktu, dan preferensi</small></button>
    <button type="button" role="menuitem" data-action="nara"><b>Nara AI</b><small>Buka asisten tanpa menutup Studio</small></button>
    <button type="button" role="menuitem" data-action="logout"><b>Keluar</b><small>Akhiri sesi hanya saat dipilih</small></button>`;
  document.body.append(panel);
  button.setAttribute("aria-haspopup", "menu");
  button.setAttribute("aria-expanded", "true");
  panel.querySelector("button")?.focus({ preventScroll: true });
}

function normalize() {
  frame = 0;
  const app = shell();
  const side = sidebar();
  if (!app || !side) return;
  document.documentElement.dataset.studioReactShellV287 = RELEASE;
  app.dataset.v287Family = currentFamily();
  reveal(side);
  const mark = side.querySelector(".sn-logo-mark");
  reveal(mark);
  if (mark) {
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    const expanded = currentFamily() === "large" ? !side.classList.contains("collapsed") : side.classList.contains("mobile-open");
    mark.setAttribute("aria-expanded", String(expanded));
    mark.setAttribute("aria-label", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
    mark.setAttribute("title", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
    const letter = mark.querySelector("strong");
    if (letter) letter.textContent = "n";
  }
  side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button").forEach((button) => {
    reveal(button);
    button.disabled = false;
  });
  const profile = avatar();
  if (profile) {
    reveal(profile);
    profile.disabled = false;
    profile.setAttribute("aria-haspopup", "menu");
    if (!profile.hasAttribute("aria-expanded")) profile.setAttribute("aria-expanded", "false");
    profile.setAttribute("aria-label", "Buka menu profil");
  }
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    reveal(launcher);
    launcher.disabled = false;
  }
  if (document.querySelector(".sn-settings-grid")) {
    applyAccountSurface(document.documentElement.dataset.studioAccountViewV287 || document.documentElement.dataset.studioAccountViewV189 || "settings");
  }
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(normalize);
}

function clickOwner(event) {
  const mark = event.target.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (mark) {
    event.preventDefault();
    event.stopPropagation();
    const toggle = reactToggle();
    if (toggle && !toggle.disabled) toggle.click();
    requestAnimationFrame(schedule);
    return;
  }

  const profile = event.target.closest?.(".sn-top .sn-avatar");
  if (profile) {
    event.preventDefault();
    event.stopPropagation();
    if (menu()) closeProfileMenu();
    else openProfileMenu(profile);
    return;
  }

  const item = event.target.closest?.(`.${MENU_CLASS} button[data-action]`);
  if (item) {
    event.preventDefault();
    event.stopPropagation();
    runProfileAction(item.dataset.action);
    return;
  }

  const settings = event.target.closest?.(".sn-account-settings-v135");
  if (settings) {
    document.documentElement.dataset.studioAccountViewV189 = "settings";
    document.documentElement.dataset.studioAccountViewV287 = "settings";
    settleAccountSurface("settings");
  }

  if (menu() && !event.target.closest?.(`.${MENU_CLASS}`)) closeProfileMenu();
}

function keyOwner(event) {
  if (event.key === "Escape") {
    if (menu()) {
      event.preventDefault();
      event.stopPropagation();
      closeProfileMenu();
      avatar()?.focus({ preventScroll: true });
    }
    return;
  }
  if ((event.key === "Enter" || event.key === " ") && event.target.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark")) {
    event.preventDefault();
    event.stopPropagation();
    reactToggle()?.click();
    requestAnimationFrame(schedule);
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", clickOwner, true);
  document.addEventListener("keydown", keyOwner, true);
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", normalize, { once: true });
  else normalize();
}

export { applyAccountSurface, currentFamily };
