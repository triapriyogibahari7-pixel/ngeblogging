import "./studio-mode-authority-v297.css";
import "./studio-polish-v295.css";
import "./studio-shell-authority-v298.css";

export const STUDIO_SHELL_AUTHORITY_RELEASE_V298 = "studio-shell-authority-v298-20260805";
export const STUDIO_SINGLE_N_OWNER_V298 = "studio-single-n-owner-v298-20260805";
export const STUDIO_PROFILE_MENU_RELEASE_V298 = "studio-profile-menu-v298-20260805";

let profileMenu = null;

const root = () => document.documentElement;
const shell = () => document.querySelector(".sn-shell");
const sidebar = () => document.getElementById("ngeblogging-studio-sidebar");
const reactToggle = () => document.querySelector(".sn-main>.sn-top>.sn-sidebar-toggle,.sn-top>.sn-sidebar-toggle");

function family() {
  const value = shell()?.dataset?.deviceMode || root().dataset.studioDeviceMode;
  return value === "large" ? "large" : "small";
}

function syncMark() {
  const side = sidebar();
  const mark = side?.querySelector(".sn-logo-mark");
  if (!side || !mark) return;
  const expanded = family() === "large" ? !side.classList.contains("collapsed") : side.classList.contains("mobile-open");
  mark.dataset.v298Owner = STUDIO_SINGLE_N_OWNER_V298;
  mark.setAttribute("role", "button");
  mark.setAttribute("tabindex", "0");
  mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
  mark.setAttribute("aria-expanded", String(expanded));
  mark.setAttribute("aria-label", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
  mark.setAttribute("title", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
  const letter = mark.querySelector("strong");
  if (letter) letter.textContent = "n";
}

function toggleN(event) {
  const mark = event.target.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (!mark) return false;
  const toggle = reactToggle();
  if (!toggle || toggle.disabled) return true;
  event.preventDefault();
  toggle.click();
  requestAnimationFrame(syncMark);
  return true;
}

function closeProfileMenu() {
  if (!profileMenu) return;
  profileMenu.remove();
  profileMenu = null;
  const avatar = document.querySelector(".sn-avatar");
  avatar?.setAttribute("aria-expanded", "false");
}

function menuButton(label) {
  const normalized = label.toLowerCase();
  return [...(sidebar()?.querySelectorAll("button") || [])].find((button) => button.textContent?.trim().toLowerCase().includes(normalized));
}

function openSettingsSection(index) {
  menuButton("pengaturan")?.click();
  window.setTimeout(() => {
    const section = document.querySelector(`.sn-settings-grid>section:nth-child(${index})`);
    section?.scrollIntoView?.({ block:"start", behavior:"smooth" });
    section?.querySelector("input,textarea,select,button")?.focus?.({ preventScroll:true });
  }, 70);
}

function runProfileAction(action) {
  closeProfileMenu();
  if (action === "profile") return openSettingsSection(1);
  if (action === "settings") return openSettingsSection(2);
  if (action === "add-site" || action === "switch-site") {
    document.querySelector(".sn-workspace")?.click();
    window.setTimeout(() => {
      const target = action === "add-site" ? document.querySelector(".sn-create-site input") : document.querySelector(".sn-sites-list button,.sn-sites-list a");
      target?.focus?.({ preventScroll:true });
      target?.scrollIntoView?.({ block:"nearest" });
    }, 70);
    return;
  }
  if (action === "help") {
    document.querySelector(".sn-nara-button,.nara-floating-button")?.click();
    return;
  }
  if (action === "logout") menuButton("keluar")?.click();
}

function openProfileMenu(anchor) {
  closeProfileMenu();
  const menu = document.createElement("div");
  menu.className = "sn-profile-menu-v298";
  menu.dataset.release = STUDIO_PROFILE_MENU_RELEASE_V298;
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Menu profil");
  const entries = [
    ["profile", "Profil & avatar", "Identitas dan foto profil"],
    ["add-site", "Tambah situs", "Buat situs atau workspace baru"],
    ["switch-site", "Ganti situs", "Pilih situs yang sudah ada"],
    ["settings", "Pengaturan", "Atur situs, bahasa dan zona waktu"],
    ["help", "Bantuan Nara", "Buka Nara tanpa menutup Studio"],
    ["logout", "Keluar", "Akhiri sesi hanya saat dipilih"],
  ];
  entries.forEach(([action,title,description]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.profileAction = action;
    button.setAttribute("role", "menuitem");
    const strong = document.createElement("strong");
    strong.textContent = title;
    const small = document.createElement("small");
    small.textContent = description;
    button.append(strong, small);
    menu.append(button);
  });
  document.body.append(menu);
  const rect = anchor.getBoundingClientRect();
  menu.style.right = `${Math.max(10, window.innerWidth - rect.right)}px`;
  menu.style.top = `${Math.max(10, Math.min(window.innerHeight - 10, rect.bottom + 8))}px`;
  profileMenu = menu;
  anchor.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => {
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.bottom > window.innerHeight - 10) menu.style.top = `${Math.max(10, rect.top - menuRect.height - 8)}px`;
    menu.querySelector("button")?.focus?.({ preventScroll:true });
  });
}

function normalizeNaraState() {
  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) return;
  const full = panel.dataset.naraSize === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  panel.setAttribute("aria-modal", String(full));
  if (!full) {
    document.documentElement.style.removeProperty("overflow");
    document.body.style.removeProperty("overflow");
    document.body.classList.remove("nara-fullscreen-open-v148","nara-fullscreen-open-v151","nara-scroll-lock","sm177-nara-full","v179-nara-full");
  }
}

function syncAuthority() {
  if (!shell()) return;
  root().dataset.studioShellAuthorityV298 = STUDIO_SHELL_AUTHORITY_RELEASE_V298;
  syncMark();
  normalizeNaraState();
}

function onCapturedClick(event) {
  const avatar = event.target.closest?.(".sn-avatar");
  if (avatar) {
    event.preventDefault();
    event.stopPropagation();
    if (profileMenu) closeProfileMenu();
    else openProfileMenu(avatar);
    return;
  }
  const action = event.target.closest?.(".sn-profile-menu-v298 button[data-profile-action]")?.dataset.profileAction;
  if (action) {
    event.preventDefault();
    event.stopPropagation();
    runProfileAction(action);
    return;
  }
  if (profileMenu && !event.target.closest?.(".sn-profile-menu-v298")) closeProfileMenu();
}

function onClick(event) {
  if (toggleN(event)) return;
  requestAnimationFrame(() => {
    syncMark();
    normalizeNaraState();
  });
}

function onKeydown(event) {
  const mark = event.target.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (mark && (event.key === "Enter" || event.key === " ")) {
    toggleN(event);
    return;
  }
  if (event.key === "Escape" && profileMenu) {
    const avatar = document.querySelector(".sn-avatar");
    closeProfileMenu();
    avatar?.focus?.({ preventScroll:true });
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", onCapturedClick, true);
  document.addEventListener("click", onClick, false);
  document.addEventListener("keydown", onKeydown, true);
  window.addEventListener("resize", () => { closeProfileMenu(); requestAnimationFrame(syncAuthority); }, { passive:true });
  window.addEventListener("orientationchange", () => { closeProfileMenu(); requestAnimationFrame(syncAuthority); }, { passive:true });
  window.addEventListener("pageshow", () => requestAnimationFrame(syncAuthority), { passive:true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => requestAnimationFrame(syncAuthority));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => requestAnimationFrame(syncAuthority), { once:true });
  else requestAnimationFrame(syncAuthority);
}
