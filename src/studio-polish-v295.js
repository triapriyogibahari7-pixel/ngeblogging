import "./studio-polish-v295.css";

export const STUDIO_POLISH_RELEASE_V295 = "studio-polish-v295-20260805";
export const STUDIO_PROFILE_MENU_RELEASE_V295 = "studio-profile-menu-v295-20260805";
export const STUDIO_NARA_GEOMETRY_RELEASE_V295 = "studio-nara-geometry-v295-20260805";

let frame = 0;
let profileMenu = null;

const root = () => document.documentElement;
const shell = () => document.querySelector(".sn-shell");
const sidebar = () => document.getElementById("ngeblogging-studio-sidebar");
const reactToggle = () => document.querySelector(".sn-main>.sn-top>.sn-sidebar-toggle,.sn-top>.sn-sidebar-toggle");

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("aria-hidden");
  node.removeAttribute("inert");
}

function family() {
  const mode = root().dataset.studioDeviceMode || shell()?.dataset?.deviceMode;
  if (mode === "large" || mode === "small") return mode;
  return Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) >= 761 ? "large" : "small";
}

function menuButton(label) {
  return [...(sidebar()?.querySelectorAll("button") || [])].find((button) => button.textContent?.trim().toLowerCase().includes(label.toLowerCase()));
}

function closeProfileMenu() {
  if (!profileMenu) return;
  profileMenu.remove();
  profileMenu = null;
}

function openSettingsSection(sectionIndex) {
  const settings = menuButton("pengaturan");
  settings?.click();
  window.setTimeout(() => {
    const section = document.querySelector(`.sn-settings-grid>section:nth-child(${sectionIndex})`);
    section?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    const focusTarget = section?.querySelector("input,textarea,select,button");
    focusTarget?.focus?.({ preventScroll: true });
  }, 90);
}

function profileAction(action) {
  closeProfileMenu();
  if (action === "profile") {
    openSettingsSection(1);
    return;
  }
  if (action === "add-site" || action === "switch-site") {
    document.querySelector(".sn-workspace")?.click();
    window.setTimeout(() => {
      const target = action === "add-site"
        ? document.querySelector(".sn-create-site input")
        : document.querySelector(".sn-sites-list button,.sn-sites-list a");
      target?.focus?.({ preventScroll: true });
      target?.scrollIntoView?.({ block: "nearest" });
    }, 90);
    return;
  }
  if (action === "settings") {
    openSettingsSection(2);
    return;
  }
  if (action === "help") {
    const help = document.querySelector(".sn-nara-button,.nara-floating-button");
    help?.click();
    return;
  }
  if (action === "logout") {
    menuButton("keluar")?.click();
  }
}

function buildProfileMenu(anchor) {
  closeProfileMenu();
  const menu = document.createElement("div");
  menu.className = "sn-profile-menu-v295";
  menu.dataset.release = STUDIO_PROFILE_MENU_RELEASE_V295;
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Menu profil");
  const entries = [
    ["profile", "Profil & avatar", "Identitas, biografi, situs, dan avatar"],
    ["add-site", "Tambah situs", "Buat workspace situs baru"],
    ["switch-site", "Ganti situs", "Pilih workspace yang sudah ada"],
    ["settings", "Pengaturan", "Atur situs aktif, bahasa, dan zona waktu"],
    ["help", "Bantuan Nara", "Buka asisten tanpa menutup Studio"],
    ["logout", "Keluar", "Akhiri sesi hanya jika Anda memilih ini"],
  ];
  for (const [action, title, description] of entries) {
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
  }
  document.body.append(menu);
  const rect = anchor.getBoundingClientRect();
  const right = Math.max(10, window.innerWidth - rect.right);
  menu.style.right = `${right}px`;
  menu.style.top = `${Math.min(window.innerHeight - 16, Math.max(62, rect.bottom + 8))}px`;
  profileMenu = menu;
  requestAnimationFrame(() => {
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.bottom > window.innerHeight - 10) {
      menu.style.top = `${Math.max(10, rect.top - menuRect.height - 8)}px`;
    }
    menu.querySelector("button")?.focus?.({ preventScroll: true });
  });
}

function syncSidebar() {
  const side = sidebar();
  if (!side) return;
  reveal(side);
  side.style.removeProperty("filter");
  side.style.removeProperty("backdrop-filter");
  const mark = side.querySelector(".sn-logo-mark");
  reveal(mark);
  if (mark) {
    mark.dataset.v295Control = "single-n";
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    const expanded = family() === "large" ? !side.classList.contains("collapsed") : side.classList.contains("mobile-open");
    mark.setAttribute("aria-expanded", String(expanded));
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    mark.setAttribute("aria-label", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
    mark.setAttribute("title", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
    const letter = mark.querySelector("strong");
    if (letter) {
      letter.textContent = "n";
      letter.style.removeProperty("opacity");
      letter.style.removeProperty("filter");
      letter.style.removeProperty("color");
      letter.style.removeProperty("-webkit-text-fill-color");
    }
  }

  side.querySelectorAll(":scope>.sn-new,:scope>nav>button,:scope>.sn-account-footer>button").forEach((button) => {
    reveal(button);
    button.disabled = false;
  });

  document.querySelectorAll(".sn-side-backdrop").forEach((backdrop) => {
    backdrop.hidden = true;
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.style.setProperty("display", "none", "important");
    backdrop.style.setProperty("pointer-events", "none", "important");
  });
  document.body.style.removeProperty("filter");
  document.body.style.removeProperty("backdrop-filter");
  document.body.style.removeProperty("-webkit-backdrop-filter");
  root().style.removeProperty("filter");
  root().style.removeProperty("backdrop-filter");
}

function syncProfile() {
  const avatar = document.querySelector(".sn-main>.sn-top .sn-avatar,.sn-top .sn-avatar");
  if (!avatar) return;
  reveal(avatar);
  avatar.disabled = false;
  avatar.dataset.v295ProfileMenu = STUDIO_PROFILE_MENU_RELEASE_V295;
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-expanded", String(Boolean(profileMenu)));
  avatar.setAttribute("aria-label", "Buka menu profil");
  avatar.setAttribute("title", "Profil");
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    reveal(launcher);
    launcher.disabled = false;
    launcher.dataset.v295Floating = "viewport-fixed";
    launcher.style.removeProperty("animation");
    launcher.style.removeProperty("filter");
  }
  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) return;
  const full = panel.dataset.naraSize === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.dataset.v295Interaction = full ? "modal" : "nonmodal";
  layer.dataset.v295Release = STUDIO_NARA_GEOMETRY_RELEASE_V295;
  layer.setAttribute("aria-modal", String(full));

  panel.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-attachment-menu-wrap,.nara-select.intelligence,.nara-select.model,.nara-composer-tools>button,button[aria-label='Tutup Nara']").forEach(reveal);
  const attach = panel.querySelector(".nara-attachment-menu-wrap>button");
  if (attach) {
    attach.disabled = false;
    attach.setAttribute("aria-label", "Tambah kamera, foto, atau file");
    attach.setAttribute("title", "Tambah kamera, foto, atau file");
  }
  const close = panel.querySelector("button[aria-label='Tutup Nara'],button[title='Tutup']");
  if (close) {
    reveal(close);
    close.disabled = false;
    close.setAttribute("aria-label", "Tutup Nara");
  }
  const backdrop = layer.querySelector(":scope>.nara-assistant-backdrop");
  if (backdrop && !full) {
    backdrop.hidden = true;
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.style.setProperty("display", "none", "important");
    backdrop.style.setProperty("pointer-events", "none", "important");
  }
  if (!full) {
    root().style.removeProperty("overflow");
    document.body.style.removeProperty("overflow");
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
  }
}

function syncContainment() {
  document.querySelectorAll(".sn-main,.sn-main>*,.sn-view-pad,.sn-view-pad>*,.sn-content-card,.sn-content-card>*,.sn-settings-grid,.sn-settings-grid>*,.ce-app,.ce-app>*,.tn-studio,.tn-studio>*,.tn-layout-studio,.tn-layout-map-v264,.tn-code-workspace,.tn-code-pane,.tn-code-preview-pane,.sv124-page,.sv124-page>*,.op41-host,.op41-panel,.op41-card").forEach((node) => {
    node.style.setProperty("min-width", "0", "important");
    node.style.setProperty("max-width", "100%", "important");
  });
}

export function syncStudioPolishV295() {
  frame = 0;
  if (!shell() && !document.querySelector(".ce-app,.tn-studio")) return;
  root().dataset.studioPolishV295 = STUDIO_POLISH_RELEASE_V295;
  syncSidebar();
  syncProfile();
  syncNara();
  syncContainment();
}

function schedule(delay = 0) {
  if (delay > 0) {
    window.setTimeout(() => schedule(), delay);
    return;
  }
  if (frame) return;
  frame = requestAnimationFrame(syncStudioPolishV295);
}

function onCapturedClick(event) {
  const avatar = event.target.closest?.(".sn-avatar");
  if (avatar) {
    event.preventDefault();
    event.stopPropagation();
    if (profileMenu) closeProfileMenu();
    else buildProfileMenu(avatar);
    syncProfile();
    return;
  }

  const action = event.target.closest?.(".sn-profile-menu-v295 button[data-profile-action]")?.dataset.profileAction;
  if (action) {
    event.preventDefault();
    event.stopPropagation();
    profileAction(action);
    schedule(100);
    return;
  }

  if (profileMenu && !event.target.closest?.(".sn-profile-menu-v295")) {
    closeProfileMenu();
    syncProfile();
  }
}

function onKeydown(event) {
  if (event.key === "Escape" && profileMenu) {
    const avatar = document.querySelector(".sn-avatar");
    closeProfileMenu();
    syncProfile();
    avatar?.focus?.({ preventScroll: true });
    return;
  }
  if (!profileMenu || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
  const buttons = [...profileMenu.querySelectorAll("button")];
  if (!buttons.length) return;
  event.preventDefault();
  const current = Math.max(0, buttons.indexOf(document.activeElement));
  const next = event.key === "ArrowDown" ? (current + 1) % buttons.length : (current - 1 + buttons.length) % buttons.length;
  buttons[next].focus();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", onCapturedClick, true);
  document.addEventListener("keydown", onKeydown, true);
  document.addEventListener("click", () => { schedule(); schedule(80); }, false);
  window.addEventListener("resize", () => { closeProfileMenu(); schedule(40); }, { passive: true });
  window.addEventListener("orientationchange", () => { closeProfileMenu(); schedule(80); }, { passive: true });
  window.addEventListener("pageshow", () => schedule(60), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => { closeProfileMenu(); schedule(); });
  window.addEventListener("ngeblogging:auth-session-ready", () => { schedule(40); schedule(260); });
  window.addEventListener("ngeblogging:auth-callback-complete", () => { schedule(40); schedule(260); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { schedule(); schedule(180); }, { once: true });
  else { schedule(); schedule(180); }
}
