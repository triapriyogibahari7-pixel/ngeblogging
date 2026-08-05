import "./studio-stable-ui-v287.css";

export const RELEASE = "studio-stable-ui-v287-20260805";
export const BREAKPOINT = 761;
export const PROFILE_MENU_ID = "ngeblogging-profile-menu-v287";

let frame = 0;
let lastFamily = "";

const root = () => document.documentElement;
const shell = () => document.querySelector(".sn-shell");
const sidebar = () => document.getElementById("ngeblogging-studio-sidebar");

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("aria-hidden");
  node.removeAttribute("inert");
}

export function stableFamily() {
  const declared = root().dataset.studioDeviceMode;
  if (declared === "large" || declared === "small") return declared;
  const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  return width >= BREAKPOINT ? "large" : "small";
}

export function stableResponsiveMode() {
  const declared = root().dataset.studioResponsiveMode;
  if (["application", "phone", "mobile", "compact", "tablet", "desktop"].includes(declared)) return declared;
  if (window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true) return "application";
  const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  if (width <= 430) return "phone";
  if (width <= 600) return "mobile";
  if (width <= 760) return "compact";
  if (width <= 1180) return "tablet";
  return "desktop";
}

function normalizeSidebar(family) {
  const side = sidebar();
  if (!side) return;
  reveal(side);
  side.style.removeProperty("display");
  side.style.removeProperty("visibility");
  side.style.removeProperty("opacity");
  side.style.removeProperty("filter");
  side.style.removeProperty("backdrop-filter");
  side.style.removeProperty("-webkit-backdrop-filter");

  const logo = side.querySelector(":scope>.sn-logo");
  const mark = logo?.querySelector(".sn-logo-mark");
  const brand = logo?.querySelector(":scope>b");
  reveal(logo);
  reveal(mark);
  if (brand) {
    brand.textContent = "ngeblogging";
    reveal(brand);
  }
  if (mark) {
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    const expanded = family === "large" ? !side.classList.contains("collapsed") : side.classList.contains("mobile-open");
    mark.setAttribute("aria-expanded", String(expanded));
    mark.setAttribute("aria-label", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
    mark.setAttribute("title", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
    const letter = mark.querySelector("strong");
    if (letter) {
      letter.textContent = "n";
      letter.style.removeProperty("opacity");
      letter.style.removeProperty("filter");
      letter.style.removeProperty("color");
    }
  }

  side.querySelectorAll(":scope>.sn-new,:scope>nav>button,:scope>.sn-account-footer>button").forEach((button) => {
    reveal(button);
    button.disabled = false;
    button.removeAttribute("inert");
    const label = button.querySelector("span")?.textContent?.trim() || button.textContent?.trim() || "Menu";
    button.setAttribute("title", label);
    button.setAttribute("aria-label", label);
  });

  if (family === "large") {
    side.classList.remove("mobile-open");
    document.body.classList.remove("sn-mobile-sidebar-open");
  } else {
    document.body.classList.toggle("sn-mobile-sidebar-open", side.classList.contains("mobile-open"));
  }
}

function closeProfileMenu() {
  const menu = document.getElementById(PROFILE_MENU_ID);
  if (!menu) return;
  menu.hidden = true;
  menu.setAttribute("aria-hidden", "true");
  document.querySelector(".sn-top .sn-avatar")?.setAttribute("aria-expanded", "false");
}

function openSettingsSection(which) {
  const settings = sidebar()?.querySelector(".sn-account-settings-v135");
  settings?.click();
  window.setTimeout(() => {
    const sections = document.querySelectorAll(".sn-settings-grid>section");
    const target = which === "profile" ? sections[0] : sections[1];
    target?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    target?.querySelector?.("input,textarea,select,button")?.focus?.({ preventScroll: true });
  }, 80);
}

function profileMenuMarkup() {
  const menu = document.createElement("section");
  menu.id = PROFILE_MENU_ID;
  menu.className = "sn-profile-menu-v287";
  menu.hidden = true;
  menu.setAttribute("aria-hidden", "true");
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Menu profil Ngeblogging");
  menu.innerHTML = `
    <header><div class="sn-profile-menu-avatar-v287" aria-hidden="true">NB</div><div><small>AKUN NGEBLOGGING</small><b data-profile-name-v287>Profil pengguna</b></div></header>
    <div class="sn-profile-menu-actions-v287">
      <button type="button" role="menuitem" data-v287-profile-action="profile"><span>Profil</span><small>Avatar, nama, biografi, dan identitas</small></button>
      <button type="button" role="menuitem" data-v287-profile-action="add-site"><span>+ Tambahkan situs</span><small>Buat atau kelola workspace situs</small></button>
      <button type="button" role="menuitem" data-v287-profile-action="view-site"><span>Lihat situs</span><small>Buka situs aktif di tab baru</small></button>
      <button type="button" role="menuitem" data-v287-profile-action="settings"><span>Pengaturan</span><small>Pengaturan situs, bahasa, dan zona waktu</small></button>
      <button type="button" role="menuitem" class="danger" data-v287-profile-action="logout"><span>Keluar</span><small>Akhiri sesi hanya ketika dipilih</small></button>
    </div>`;
  document.body.append(menu);

  menu.addEventListener("click", (event) => {
    const action = event.target.closest?.("[data-v287-profile-action]")?.dataset.v287ProfileAction;
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    closeProfileMenu();
    if (action === "profile") openSettingsSection("profile");
    else if (action === "settings") openSettingsSection("settings");
    else if (action === "add-site") document.querySelector(".sn-top .sn-workspace")?.click();
    else if (action === "view-site") document.querySelector(".sn-top .sn-view-site")?.click();
    else if (action === "logout") sidebar()?.querySelector(".sn-account-logout-v135")?.click();
  });
  return menu;
}

function normalizeProfile() {
  const avatar = document.querySelector(".sn-top .sn-avatar");
  if (!avatar) return;
  reveal(avatar);
  avatar.disabled = false;
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-expanded", document.getElementById(PROFILE_MENU_ID)?.hidden === false ? "true" : "false");
  avatar.setAttribute("aria-label", "Buka menu profil");

  let menu = document.getElementById(PROFILE_MENU_ID);
  if (!menu) menu = profileMenuMarkup();
  const name = document.querySelector(".sn-welcome h1")?.textContent?.split(",")[0]?.trim()
    || document.querySelector(".sn-workspace b")?.textContent?.trim()
    || "Profil pengguna";
  const nameNode = menu.querySelector("[data-profile-name-v287]");
  if (nameNode) nameNode.textContent = name;
  const badge = menu.querySelector(".sn-profile-menu-avatar-v287");
  if (badge) {
    const image = avatar.querySelector("img");
    if (image?.src) badge.innerHTML = `<img alt="" src="${image.src}">`;
    else badge.textContent = String(avatar.textContent || "NB").trim().slice(0, 2).toUpperCase() || "NB";
  }

  if (avatar.dataset.v287ProfileBound !== "true") {
    avatar.dataset.v287ProfileBound = "true";
    avatar.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextMenu = document.getElementById(PROFILE_MENU_ID) || profileMenuMarkup();
      const opening = nextMenu.hidden !== false;
      nextMenu.hidden = !opening;
      nextMenu.setAttribute("aria-hidden", String(!opening));
      avatar.setAttribute("aria-expanded", String(opening));
      if (opening) nextMenu.querySelector("button")?.focus?.({ preventScroll: true });
    });
    avatar.addEventListener("keydown", (event) => {
      if (!["Enter", " ", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      avatar.click();
    });
  }
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    reveal(launcher);
    launcher.disabled = false;
    launcher.dataset.v287Floating = "viewport-fixed";
    launcher.setAttribute("title", "Buka Nara AI");
  }

  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) return;
  const full = panel.dataset.naraSize === "full";
  layer.dataset.v287Interaction = full ? "modal" : "nonmodal";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  panel.setAttribute("aria-modal", String(full));
  const backdrop = layer.querySelector(":scope>.nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
    backdrop.style.pointerEvents = full ? "auto" : "none";
  }
  panel.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.model,.nara-select.intelligence,.nara-attachment-menu-wrap").forEach(reveal);
  const close = panel.querySelector('button[aria-label="Tutup Nara"],button[title="Tutup"]');
  reveal(close);
  if (!full) {
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
    document.documentElement.style.removeProperty("overflow");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("filter");
  }
}

function normalizeThemeStudio() {
  const map = document.querySelector(".tn-layout-map-v264");
  if (map) {
    reveal(map);
    map.dataset.v287Map = "26-slot-responsive";
  }
  document.querySelectorAll(".tn-layout-slot-v264,.tn-layout-popover-v264 button,.tn-code-pane textarea,.tn-code-workspace button").forEach((node) => {
    reveal(node);
    if ("disabled" in node) node.disabled = false;
    node.removeAttribute("inert");
  });
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    workspace.dataset.v287CodeLayout = stableFamily() === "large" ? "code-left-preview-right" : "preview-top-code-bottom";
  });
}

function normalizeContainment() {
  document.querySelectorAll(".sn-main,.sn-main>*,.sn-view-pad,.sn-view-pad>*,.sn-content-card,.sn-content-card>*,.sn-settings-grid,.sn-settings-grid>*,.ce-app,.ce-app>*,.tn-studio,.tn-studio>*,.tn-layout-studio,.tn-layout-map-v264,.tn-code-workspace,.tn-code-pane,.tn-code-preview-pane,.sv124-page,.sv124-page>*,.op41-panel,.op41-panel>*").forEach((node) => {
    node.style.setProperty("min-width", "0");
    node.style.setProperty("max-width", "100%");
  });
}

export function sync() {
  frame = 0;
  const app = shell();
  if (!app) return;
  const family = stableFamily();
  const responsiveMode = stableResponsiveMode();
  root().dataset.studioStableUiV287 = RELEASE;
  app.dataset.v287Family = family;
  app.dataset.v287ResponsiveMode = responsiveMode;
  if (lastFamily && lastFamily !== family) closeProfileMenu();
  lastFamily = family;
  normalizeSidebar(family);
  normalizeProfile();
  normalizeNara();
  normalizeThemeStudio();
  normalizeContainment();
}

function schedule(delay = 0) {
  if (delay > 0) {
    window.setTimeout(() => schedule(), delay);
    return;
  }
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

function boot() {
  schedule();
  schedule(80);
  schedule(320);
  schedule(900);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("resize", () => schedule(60), { passive: true });
  window.addEventListener("orientationchange", () => schedule(100), { passive: true });
  window.addEventListener("pageshow", boot, { passive: true });
  window.addEventListener("online", () => schedule(120), { passive: true });
  window.visualViewport?.addEventListener("resize", () => schedule(60), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  document.addEventListener("pointerdown", (event) => {
    const menu = document.getElementById(PROFILE_MENU_ID);
    if (!menu || menu.hidden) return;
    if (event.target.closest?.(`#${PROFILE_MENU_ID}`) || event.target.closest?.(".sn-avatar")) return;
    closeProfileMenu();
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeProfileMenu();
  });
  document.addEventListener("click", () => schedule(40), { passive: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
}
