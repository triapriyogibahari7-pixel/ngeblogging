import { LAYOUT_AREAS } from "./widget-system.js";
import { openProfile } from "./studio-finalization-v178.js";

export const RELEASE_V248 = "studio-native-stability-v248-20260803";

const SMALL_MODES = new Set(["application", "phone", "mobile", "compact"]);
const LARGE_MODES = new Set(["tablet", "desktop", "laptop", "computer"]);
const SIDEBAR_KEY = "ngeblogging-native-sidebar-v248";
const PROFILE_MENU_ID = "ngeblogging-native-profile-v248";
let frame = 0;
let profileOpen = false;
let selectedLayoutArea = "";
let sidebarRestored = false;

const html = () => document.documentElement;

function readPreference() {
  try {
    const value = localStorage.getItem(SIDEBAR_KEY);
    return value === "collapsed" || value === "expanded" ? value : "";
  } catch { return ""; }
}

function writePreference(value) {
  try { localStorage.setItem(SIDEBAR_KEY, value); } catch { /* storage cannot break Studio */ }
}

function responsiveFamily() {
  const root = html();
  const declared = String(root.dataset.studioResponsiveMode || "").toLowerCase();
  const variant = String(root.dataset.studioDeviceVariant || "").toLowerCase();
  const device = String(root.dataset.studioDeviceMode || "").toLowerCase();
  const desktopSitePhone = root.dataset.studioDesktopSitePhone === "true" || root.dataset.desktopSitePhone === "true";
  if (desktopSitePhone) return "large";
  if (SMALL_MODES.has(declared)) return "small";
  if (LARGE_MODES.has(declared) || LARGE_MODES.has(variant)) return "large";
  if (device === "small" || device === "large") return device;
  const layout = Number(document.documentElement.clientWidth || window.innerWidth || 0);
  const visual = Number(window.visualViewport?.width || layout || 0);
  return Math.min(layout || visual, visual || layout) <= 760 ? "small" : "large";
}

function clearLegacyStyle(node, properties) {
  if (!node) return;
  for (const property of properties) {
    if (node.style.getPropertyValue(property)) node.style.removeProperty(property);
  }
}

function restoreReactChrome() {
  const shell = document.querySelector(".sn-shell");
  if (!shell) return null;

  const duplicate = document.getElementById("ngeblogging-studio-chrome-v244");
  if (duplicate && duplicate.dataset.disabledByV248 !== RELEASE_V248) {
    duplicate.dataset.disabledByV248 = RELEASE_V248;
    duplicate.hidden = true;
    duplicate.setAttribute("aria-hidden", "true");
    duplicate.style.setProperty("display", "none", "important");
    duplicate.style.setProperty("pointer-events", "none", "important");
  }

  const side = document.getElementById("ngeblogging-studio-sidebar") || shell.querySelector(".v244-legacy-sidebar,.sn-side");
  if (side) {
    side.classList.remove("v244-legacy-sidebar");
    side.classList.add("sn-side");
    side.removeAttribute("aria-hidden");
    side.removeAttribute("inert");
    side.dataset.nativeSidebarV248 = RELEASE_V248;
    clearLegacyStyle(side, ["position","left","top","right","bottom","width","height","min-width","min-height","max-width","max-height","overflow","opacity","visibility","pointer-events","z-index","transform"]);
  }

  const top = shell.querySelector(".sn-main > [data-v244-legacy-top],.sn-main > .sn-top");
  if (top) {
    top.classList.add("sn-top");
    top.removeAttribute("aria-hidden");
    top.removeAttribute("inert");
    delete top.dataset.v244LegacyTop;
    top.dataset.nativeTopbarV248 = RELEASE_V248;
    clearLegacyStyle(top, ["display","visibility","height","min-height","overflow","pointer-events","opacity","left","right","top","transform"]);
  }

  shell.dataset.nativeShellV248 = RELEASE_V248;
  html().dataset.studioNativeV248 = RELEASE_V248;
  for (const attribute of ["data-studio-v246","data-studio-v246-family","data-studio-v246-sidebar"]) html().removeAttribute(attribute);
  return { shell, side, top };
}

function buttonLabel(button) {
  return button?.querySelector("span")?.textContent?.trim() || button?.textContent?.trim() || "";
}

const sidebarToggle = () => document.querySelector(".sn-shell .sn-main .sn-sidebar-toggle");

function sidebarState(side, family) {
  if (family === "small") return side?.classList.contains("mobile-open") ? "open" : "closed";
  return side?.classList.contains("collapsed") ? "collapsed" : "expanded";
}

function syncSidebar() {
  const restored = restoreReactChrome();
  if (!restored?.side) return;
  const { shell, side } = restored;
  const family = responsiveFamily();
  const state = sidebarState(side, family);

  if (family === "large" && !sidebarRestored) {
    sidebarRestored = true;
    const preferred = readPreference();
    if (preferred && preferred !== state) {
      sidebarToggle()?.click();
      requestAnimationFrame(schedule);
      return;
    }
  }
  if (family === "large") writePreference(state);

  shell.dataset.nativeFamilyV248 = family;
  shell.dataset.nativeSidebarStateV248 = state;
  html().dataset.studioV248Family = family;
  html().dataset.studioV248Sidebar = state;

  const logo = side.querySelector(".sn-logo-mark");
  if (logo) {
    logo.setAttribute("role", "button");
    logo.setAttribute("tabindex", "0");
    logo.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    logo.setAttribute("aria-expanded", String(family === "small" ? state === "open" : state === "expanded"));
    logo.setAttribute("aria-label", family === "small" ? (state === "open" ? "Tutup menu Studio" : "Buka menu Studio") : (state === "expanded" ? "Ciutkan menu Studio" : "Perluas menu Studio"));
    logo.setAttribute("title", logo.getAttribute("aria-label"));
    const n = logo.querySelector("strong");
    if (n && n.textContent !== "n") n.textContent = "n";
  }

  const toggle = sidebarToggle();
  if (toggle) {
    toggle.dataset.nativeToggleV248 = family;
    toggle.setAttribute("aria-expanded", String(family === "small" ? state === "open" : state === "expanded"));
    const n = toggle.querySelector(".sn-mobile-menu-mark strong");
    if (n && n.textContent !== "n") n.textContent = "n";
  }
  const close = side.querySelector(".sn-side-close");
  if (close) { close.hidden = true; close.tabIndex = -1; close.setAttribute("aria-hidden", "true"); }
}

function menuMarkup() {
  return `<div class="v248-profile-head"><strong>Profil pengguna</strong><small>Akun Ngeblogging aktif</small></div>
    <button type="button" role="menuitem" data-action="profile"><b>Profil</b><small>Avatar, nama, biografi, dan website</small></button>
    <button type="button" role="menuitem" data-action="settings"><b>Pengaturan</b><small>Pengaturan situs, bahasa, dan zona waktu</small></button>
    <button type="button" role="menuitem" data-action="add-site"><b>Tambahkan situs</b><small>Buat atau pilih workspace lain</small></button>
    <button type="button" role="menuitem" data-action="view-site"><b>Lihat situs</b><small>Buka situs publik aktif</small></button>
    <button type="button" role="menuitem" data-action="logout" class="danger"><b>Keluar</b><small>Akhiri sesi hanya pada perangkat ini</small></button>`;
}

function ensureProfileMenu() {
  let menu = document.getElementById(PROFILE_MENU_ID);
  if (!menu) {
    menu = document.createElement("div");
    menu.id = PROFILE_MENU_ID;
    menu.className = "sn-profile-menu-v248";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Menu profil Ngeblogging");
    menu.innerHTML = menuMarkup();
    document.body.append(menu);
  }
  menu.hidden = !profileOpen;
  return menu;
}

function positionProfileMenu() {
  const menu = ensureProfileMenu();
  const avatar = document.querySelector(".sn-shell .sn-avatar");
  if (!avatar) { menu.hidden = true; profileOpen = false; return; }
  avatar.dataset.nativeProfileV248 = RELEASE_V248;
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-expanded", String(profileOpen));
  avatar.setAttribute("aria-label", "Buka menu profil");
  if (!profileOpen) return;
  const rect = avatar.getBoundingClientRect();
  const vw = window.visualViewport?.width || window.innerWidth;
  const width = Math.min(330, Math.max(250, vw - 20));
  const left = Math.max(10, Math.min(vw - width - 10, rect.right - width));
  const top = Math.max(64, rect.bottom + 8);
  if (menu.style.width !== `${width}px`) menu.style.width = `${width}px`;
  if (menu.style.left !== `${left}px`) menu.style.left = `${left}px`;
  if (menu.style.top !== `${top}px`) menu.style.top = `${top}px`;
}

function clickSidebarLabel(label) {
  const target = [...document.querySelectorAll("#ngeblogging-studio-sidebar button")].find((button) => buttonLabel(button) === label);
  target?.click();
  return Boolean(target);
}

function syncAccountPane(kind = html().dataset.studioAccountPaneV248 || "settings") {
  const page = document.querySelector(".sn-settings-grid")?.closest(".sn-view-pad");
  if (!page) return;
  page.dataset.accountPaneV248 = kind;
  const title = page.querySelector(".sn-page-title h1");
  const description = page.querySelector(".sn-page-title p");
  const desiredTitle = kind === "profile" ? "Profil" : "Pengaturan situs";
  const desiredDescription = kind === "profile"
    ? "Kelola avatar, nama tampilan, biografi, dan alamat website profil Anda."
    : "Kelola identitas situs aktif, bahasa, zona waktu, cadangan, dan konfigurasi workspace.";
  if (title && title.textContent !== desiredTitle) title.textContent = desiredTitle;
  if (description && description.textContent !== desiredDescription) description.textContent = desiredDescription;
}

function setAccountPane(kind) {
  html().dataset.studioAccountPaneV248 = kind;
  clickSidebarLabel("Pengaturan");
  requestAnimationFrame(() => syncAccountPane(kind));
}

function runProfileAction(action) {
  profileOpen = false;
  positionProfileMenu();
  if (action === "profile") {
    openProfile(document.querySelector(".sn-shell .sn-avatar"));
    return;
  }
  if (action === "settings") return setAccountPane("settings");
  if (action === "add-site") return document.querySelector(".sn-shell .sn-workspace")?.click();
  if (action === "view-site") {
    const link = document.querySelector(".sn-view-site[href],.sn-secondary-link[href]");
    if (link?.href) window.open(link.href, "_blank", "noopener,noreferrer");
    return;
  }
  if (action === "logout") clickSidebarLabel("Keluar");
}

function syncNara() {
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) {
    document.body.classList.remove("nara-fullscreen-open-v248", "nara-nonmodal-open-v248");
    return;
  }
  const size = shell.dataset.naraSize || layer.dataset.naraLayerSize || "small";
  const full = size === "full";
  layer.dataset.naraLayerSize = size;
  layer.dataset.naraInteractionV248 = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
    backdrop.tabIndex = full ? 0 : -1;
  }
  document.body.classList.toggle("nara-fullscreen-open-v248", full);
  document.body.classList.toggle("nara-nonmodal-open-v248", !full);
}

function codeLineNumbers() {
  for (const pane of document.querySelectorAll(".tn-code-pane")) {
    const textarea = pane.querySelector("textarea");
    if (!textarea) continue;
    let gutter = pane.querySelector(":scope > .tn-code-gutter-v248");
    if (!gutter) {
      gutter = document.createElement("pre");
      gutter.className = "tn-code-gutter-v248";
      gutter.setAttribute("aria-hidden", "true");
      textarea.insertAdjacentElement("beforebegin", gutter);
      textarea.addEventListener("scroll", () => { gutter.scrollTop = textarea.scrollTop; }, { passive: true });
      textarea.addEventListener("input", schedule, { passive: true });
    }
    const count = Math.max(1, String(textarea.value || "").split("\n").length);
    if (gutter.dataset.lines !== String(count)) {
      gutter.dataset.lines = String(count);
      gutter.textContent = Array.from({ length: count }, (_, index) => index + 1).join("\n");
    }
  }
}

function layoutMapMarkup() {
  return LAYOUT_AREAS.map((area) => `<button type="button" data-layout-area="${area.id}" class="v248-layout-area ${area.id}"><span>${area.label}</span><small>Klik untuk atur widget</small></button>`).join("");
}

function enhanceThemeLayout() {
  const studio = document.querySelector(".tn-layout-studio");
  if (studio && !studio.querySelector(".v248-layout-map")) {
    const map = document.createElement("div");
    map.className = "v248-layout-map";
    map.setAttribute("aria-label", "Denah tata letak tema");
    map.innerHTML = layoutMapMarkup();
    studio.querySelector(".tn-layout-canvas")?.insertAdjacentElement("afterend", map);
    map.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-layout-area]");
      if (!button) return;
      selectedLayoutArea = button.dataset.layoutArea || "";
      map.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
      studio.querySelector(".tn-layout-studio-header button,.tn-layout-side>button")?.click();
    });
  }

  for (const label of document.querySelectorAll(".tn-widget-settings label")) {
    if (!/^Area\b/i.test(label.textContent || "")) continue;
    const select = label.querySelector("select");
    if (!select || select.dataset.layoutAreasV248) continue;
    select.dataset.layoutAreasV248 = RELEASE_V248;
    const current = select.value;
    select.innerHTML = LAYOUT_AREAS.map((area) => `<option value="${area.id}">${area.label}</option>`).join("");
    if (LAYOUT_AREAS.some((area) => area.id === current)) select.value = current;
    else if (selectedLayoutArea) {
      select.value = selectedLayoutArea;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  codeLineNumbers();
}

function enhance() {
  frame = 0;
  syncSidebar();
  positionProfileMenu();
  syncAccountPane();
  syncNara();
  enhanceThemeLayout();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(enhance);
}

function handleClickCapture(event) {
  const avatar = event.target.closest?.(".sn-shell .sn-avatar");
  if (avatar) {
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    profileOpen = !profileOpen;
    positionProfileMenu();
    if (profileOpen) ensureProfileMenu().querySelector("button[data-action]")?.focus();
    return;
  }

  const profileButton = event.target.closest?.(`#${PROFILE_MENU_ID} button[data-action]`);
  if (profileButton) {
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    runProfileAction(profileButton.dataset.action);
    return;
  }

  const logo = event.target.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (logo) {
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    sidebarToggle()?.click();
    requestAnimationFrame(schedule);
    return;
  }

  if (profileOpen && !event.target.closest?.(`#${PROFILE_MENU_ID}`)) {
    profileOpen = false;
    positionProfileMenu();
  }

  if (event.target.closest?.("#ngeblogging-studio-sidebar .sn-account-settings-v135")) html().dataset.studioAccountPaneV248 = "settings";
  const navigation = event.target.closest?.("#ngeblogging-studio-sidebar .sn-new,#ngeblogging-studio-sidebar nav button,#ngeblogging-studio-sidebar .sn-account-settings-v135");
  if (navigation && responsiveFamily() === "large") {
    requestAnimationFrame(() => {
      const side = document.getElementById("ngeblogging-studio-sidebar");
      if (side && !side.classList.contains("collapsed")) sidebarToggle()?.click();
      schedule();
    });
  }
}

function handleKey(event) {
  if (event.key === "Escape") {
    if (profileOpen) {
      profileOpen = false;
      positionProfileMenu();
      document.querySelector(".sn-shell .sn-avatar")?.focus();
      return;
    }
    const side = document.getElementById("ngeblogging-studio-sidebar");
    if (responsiveFamily() === "small" && side?.classList.contains("mobile-open")) sidebarToggle()?.click();
  }
  if ((event.key === "Enter" || event.key === " ") && event.target.matches?.("#ngeblogging-studio-sidebar .sn-logo-mark")) {
    event.preventDefault();
    sidebarToggle()?.click();
    requestAnimationFrame(schedule);
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("click", handleClickCapture, true);
  document.addEventListener("keydown", handleKey, true);
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  new MutationObserver(schedule).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-mode", "data-studio-device-variant"],
  });
  schedule();
}
