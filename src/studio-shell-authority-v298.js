import "./studio-mode-authority-v297.css";
import "./studio-polish-v295.css";
import "./studio-shell-authority-v298.css";
import { loadAnalytics } from "./studio-analytics-v41.js";

export const STUDIO_SHELL_AUTHORITY_RELEASE_V298 = "studio-shell-authority-v298-20260805";
export const STUDIO_SINGLE_N_OWNER_V298 = "studio-single-n-owner-v298-20260805";
export const STUDIO_PROFILE_MENU_RELEASE_V298 = "studio-profile-menu-v298-20260805";
export const STUDIO_ANALYTICS_OWNER_V298 = "studio-analytics-production-owner-v298-20260805";

const SIDEBAR_KEY = "ngeblogging-studio-sidebar-state-v298";
let profileMenu = null;
let sidebarPreferenceApplied = false;
let analyticsView = null;
let syncFrame = 0;

const root = () => document.documentElement;
const shell = () => document.querySelector(".sn-shell");
const sidebar = () => document.getElementById("ngeblogging-studio-sidebar");
const reactToggle = () => document.querySelector(".sn-main>.sn-top>.sn-sidebar-toggle,.sn-top>.sn-sidebar-toggle");

function family() {
  const value = shell()?.dataset?.deviceMode || root().dataset.studioDeviceMode;
  return value === "large" ? "large" : "small";
}

function safeGet(key) {
  try { return localStorage.getItem(key) || ""; } catch { return ""; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage must never block Studio */ }
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
  if (letter) textOnlyN(letter);
}

function textOnlyN(letter) {
  letter.textContent = "n";
  letter.style.removeProperty("opacity");
  letter.style.removeProperty("filter");
  letter.style.removeProperty("transform");
  letter.style.removeProperty("color");
}

function persistLargeSidebar() {
  const side = sidebar();
  if (!side || family() !== "large") return;
  safeSet(SIDEBAR_KEY, side.classList.contains("collapsed") ? "collapsed" : "expanded");
}

function applyLargeSidebarPreference() {
  const side = sidebar();
  if (!side || family() !== "large" || sidebarPreferenceApplied) return;
  sidebarPreferenceApplied = true;
  const saved = safeGet(SIDEBAR_KEY);
  if (!saved) return persistLargeSidebar();
  const current = side.classList.contains("collapsed") ? "collapsed" : "expanded";
  if (saved !== current && ["collapsed","expanded"].includes(saved)) reactToggle()?.click();
  requestAnimationFrame(persistLargeSidebar);
}

function toggleN(event) {
  const mark = event.target.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (!mark) return false;
  const toggle = reactToggle();
  if (!toggle || toggle.disabled) return true;
  event.preventDefault();
  toggle.click();
  requestAnimationFrame(() => {
    syncMark();
    persistLargeSidebar();
  });
  return true;
}

function autoCollapseLargeAfterMenu(event) {
  if (family() !== "large") return;
  const button = event.target.closest?.("#ngeblogging-studio-sidebar>.sn-new,#ngeblogging-studio-sidebar>nav>button,#ngeblogging-studio-sidebar .sn-account-settings-v135");
  const side = sidebar();
  if (!button || !side || side.classList.contains("collapsed")) return;
  window.setTimeout(() => {
    if (family() === "large" && !sidebar()?.classList.contains("collapsed")) reactToggle()?.click();
    requestAnimationFrame(() => { syncMark(); persistLargeSidebar(); });
  }, 0);
}

function ensureHomeAddSite() {
  const welcome = document.querySelector(".sn-welcome");
  const actions = welcome?.querySelector(":scope>div:last-child");
  if (!actions || actions.querySelector(".sn-add-site-v298")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sn-add-site-v298";
  button.textContent = "+ Tambah situs";
  button.setAttribute("aria-label", "Tambah situs");
  button.addEventListener("click", () => document.querySelector(".sn-workspace")?.click());
  actions.prepend(button);
}

function closeProfileMenu() {
  if (!profileMenu) return;
  profileMenu.remove();
  profileMenu = null;
  document.querySelector(".sn-avatar")?.setAttribute("aria-expanded", "false");
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
  if (action === "profile") {
    if (typeof window.__ngebloggingOpenAvatarPicker === "function") window.__ngebloggingOpenAvatarPicker();
    return openSettingsSection(1);
  }
  if (action === "settings") return openSettingsSection(2);
  if (action === "add-site" || action === "switch-site") {
    document.querySelector(".sn-workspace")?.click();
    window.setTimeout(() => {
      const target = action === "add-site"
        ? document.querySelector(".sn-create-site input")
        : document.querySelector(".sn-sites-list button,.sn-sites-list a");
      target?.focus?.({ preventScroll:true });
      target?.scrollIntoView?.({ block:"nearest" });
    }, 70);
    return;
  }
  if (action === "help") return document.querySelector(".sn-nara-button,.nara-floating-button")?.click();
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
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.hidden = false;
    launcher.disabled = false;
    launcher.removeAttribute("inert");
    launcher.dataset.v298Floating = "fixed-bottom-right";
  }
  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) return;
  const full = panel.dataset.naraSize === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  panel.setAttribute("aria-modal", String(full));
  panel.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.model,.nara-select.intelligence,.nara-attachment-menu-wrap,.nara-composer-tools>button").forEach((node) => {
    node.hidden = false;
    node.removeAttribute("inert");
    node.removeAttribute("aria-hidden");
  });
  if (!full) {
    document.documentElement.style.removeProperty("overflow");
    document.body.style.removeProperty("overflow");
    document.body.classList.remove("nara-fullscreen-open-v148","nara-fullscreen-open-v151","nara-scroll-lock","sm177-nara-full","v179-nara-full");
  }
}

function syncAnalytics() {
  const active = document.querySelector("#ngeblogging-studio-sidebar nav button.active span")?.textContent?.trim();
  if (active !== "Analitik") {
    analyticsView = null;
    return;
  }
  const views = [...document.querySelectorAll(".sn-shell>.sn-main>.sn-view-pad")];
  const view = views.find((candidate) => candidate.querySelector(".sn-page-title h1")?.textContent?.trim() === "Analitik") || null;
  if (!view || view === analyticsView) return;
  analyticsView = view;
  view.dataset.analyticsRuntimeV298 = STUDIO_ANALYTICS_OWNER_V298;
  root().dataset.studioAnalyticsV298 = "production-first";
  loadAnalytics(view, 30, false).catch((error) => console.error("Analytics v298 failed", error));
}

function syncAuthority() {
  syncFrame = 0;
  if (!shell()) return false;
  root().dataset.studioShellAuthorityV298 = STUDIO_SHELL_AUTHORITY_RELEASE_V298;
  root().dataset.studioSingleNOwnerV298 = STUDIO_SINGLE_N_OWNER_V298;
  applyLargeSidebarPreference();
  syncMark();
  ensureHomeAddSite();
  normalizeNaraState();
  syncAnalytics();
  return true;
}

function scheduleSync() {
  if (syncFrame) return;
  syncFrame = requestAnimationFrame(syncAuthority);
}

function boot(attempt = 0) {
  if (syncAuthority()) return;
  if (attempt >= 4) return;
  window.setTimeout(() => boot(attempt + 1), [40,90,180,360,520][attempt] || 360);
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
  autoCollapseLargeAfterMenu(event);
  scheduleSync();
}

function onKeydown(event) {
  const mark = event.target.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (mark && (event.key === "Enter" || event.key === " ")) return void toggleN(event);
  if (event.key === "Escape" && profileMenu) {
    const avatar = document.querySelector(".sn-avatar");
    closeProfileMenu();
    avatar?.focus?.({ preventScroll:true });
  }
}

if (typeof globalThis !== "undefined") globalThis.__NGE_STUDIO_V298_SINGLE_OWNER = true;

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", onCapturedClick, true);
  document.addEventListener("click", onClick, false);
  document.addEventListener("keydown", onKeydown, true);
  window.addEventListener("resize", () => { closeProfileMenu(); sidebarPreferenceApplied = false; scheduleSync(); }, { passive:true });
  window.addEventListener("orientationchange", () => { closeProfileMenu(); sidebarPreferenceApplied = false; scheduleSync(); }, { passive:true });
  window.addEventListener("pageshow", () => boot(), { passive:true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => { sidebarPreferenceApplied = false; scheduleSync(); });
  window.addEventListener("ngeblogging:auth-session-ready", scheduleSync);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => boot(), { once:true });
  else boot();
}
