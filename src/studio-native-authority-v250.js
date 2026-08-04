import { LAYOUT_AREAS } from "./widget-system.js";
import { openProfile } from "./studio-finalization-v178.js";

export const RELEASE = "studio-native-authority-v250-20260804";
const SMALL_MODES = new Set(["application", "phone", "mobile", "compact"]);
const LARGE_MODES = new Set(["tablet", "desktop", "laptop", "computer"]);
const SIDEBAR_KEY = "ngeblogging-sidebar-native-v250";
const PROFILE_ID = "ngeblogging-profile-menu-v250";
let frame = 0;
let profileOpen = false;
let restoredDesktopPreference = false;
let selectedArea = "";

const root = () => document.documentElement;

function family() {
  const html = root();
  const responsive = String(html.dataset.studioResponsiveMode || "").toLowerCase();
  const variant = String(html.dataset.studioDeviceVariant || "").toLowerCase();
  const device = String(html.dataset.studioDeviceMode || "").toLowerCase();
  const desktopSitePhone = html.dataset.studioDesktopSitePhone === "true" || html.dataset.desktopSitePhone === "true";
  if (desktopSitePhone) return "large";
  if (SMALL_MODES.has(responsive)) return "small";
  if (LARGE_MODES.has(responsive) || LARGE_MODES.has(variant)) return "large";
  if (device === "small" || device === "large") return device;
  const layout = Number(document.documentElement.clientWidth || innerWidth || 0);
  const visual = Number(window.visualViewport?.width || layout || 0);
  return Math.min(layout || visual, visual || layout) <= 760 ? "small" : "large";
}

function buttonLabel(button) {
  return button?.querySelector("span")?.textContent?.trim() || button?.textContent?.trim() || "";
}

function sidebar() {
  return document.getElementById("ngeblogging-studio-sidebar");
}

function toggle() {
  return document.querySelector(".sn-shell .sn-sidebar-toggle");
}

function state(side, mode) {
  if (!side) return mode === "small" ? "closed" : "expanded";
  return mode === "small"
    ? (side.classList.contains("mobile-open") ? "open" : "closed")
    : (side.classList.contains("collapsed") ? "collapsed" : "expanded");
}

function readPreference() {
  try {
    const value = localStorage.getItem(SIDEBAR_KEY);
    return value === "collapsed" || value === "expanded" ? value : "";
  } catch { return ""; }
}

function writePreference(value) {
  try { localStorage.setItem(SIDEBAR_KEY, value); } catch { /* storage cannot break navigation */ }
}

function removeDuplicateChrome() {
  document.getElementById("ngeblogging-studio-chrome-v244")?.remove();
  document.querySelectorAll(".sn-sidebar-edge-toggle-v147,.v227-sidebar-fab,.studio-external-sidebar-toggle,[data-v173-collapse-toggle],[data-v187-sidebar-toggle],[data-v208-sidebar-toggle],[data-v223-sidebar-toggle],[data-v229-sidebar-toggle]").forEach((node) => node.remove());
}

function syncSidebar() {
  removeDuplicateChrome();
  const shell = document.querySelector(".sn-shell");
  const side = sidebar();
  if (!shell || !side) return;
  const mode = family();
  let current = state(side, mode);

  if (mode === "large" && !restoredDesktopPreference) {
    restoredDesktopPreference = true;
    const preferred = readPreference();
    if (preferred && preferred !== current) {
      toggle()?.click();
      requestAnimationFrame(schedule);
      return;
    }
  }
  if (mode === "large") writePreference(current);

  root().dataset.studioNativeV250 = RELEASE;
  root().dataset.studioV250Family = mode;
  root().dataset.studioV250Sidebar = current;
  shell.dataset.studioNativeV250 = RELEASE;

  const logo = side.querySelector(".sn-logo-mark");
  if (logo) {
    logo.setAttribute("role", "button");
    logo.setAttribute("tabindex", "0");
    logo.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    logo.setAttribute("aria-expanded", String(mode === "small" ? current === "open" : current === "expanded"));
    logo.setAttribute("aria-label", mode === "small" ? "Tutup menu Studio" : current === "expanded" ? "Ciutkan menu Studio" : "Perluas menu Studio");
    logo.setAttribute("title", logo.getAttribute("aria-label"));
    const letter = logo.querySelector("strong");
    if (letter) letter.textContent = "n";
  }

  const topToggle = toggle();
  if (topToggle) {
    topToggle.setAttribute("aria-expanded", String(mode === "small" ? current === "open" : current === "expanded"));
    const letter = topToggle.querySelector(".sn-mobile-menu-mark strong");
    if (letter) letter.textContent = "n";
  }
  const close = side.querySelector(".sn-side-close");
  if (close) {
    close.hidden = true;
    close.tabIndex = -1;
    close.setAttribute("aria-hidden", "true");
  }
}

function profileMarkup() {
  return `<div class="v250-profile-head"><strong>Akun Ngeblogging</strong><small>Profil dan workspace aktif</small></div>
    <button type="button" role="menuitem" data-action="profile"><b>Profil</b><small>Avatar, nama, biografi, dan website</small></button>
    <button type="button" role="menuitem" data-action="settings"><b>Pengaturan</b><small>Pengaturan situs aktif</small></button>
    <button type="button" role="menuitem" data-action="add-site"><b>Tambahkan situs</b><small>Buat atau pilih situs lain</small></button>
    <button type="button" role="menuitem" data-action="view-site"><b>Lihat situs</b><small>Buka situs publik</small></button>
    <button type="button" role="menuitem" data-action="logout" class="danger"><b>Keluar</b><small>Akhiri sesi pada perangkat ini</small></button>`;
}

function ensureProfileMenu() {
  let menu = document.getElementById(PROFILE_ID);
  if (!menu) {
    menu = document.createElement("div");
    menu.id = PROFILE_ID;
    menu.className = "sn-profile-menu-v250";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Menu profil Ngeblogging");
    menu.innerHTML = profileMarkup();
    document.body.append(menu);
  }
  menu.hidden = !profileOpen;
  return menu;
}

function positionProfileMenu() {
  const menu = ensureProfileMenu();
  const avatar = document.querySelector(".sn-shell .sn-avatar");
  if (!avatar) {
    menu.hidden = true;
    profileOpen = false;
    return;
  }
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-expanded", String(profileOpen));
  avatar.setAttribute("aria-label", "Buka menu profil");
  if (!profileOpen) return;
  const rect = avatar.getBoundingClientRect();
  const viewport = window.visualViewport;
  const vw = Math.max(280, viewport?.width || innerWidth);
  const width = Math.min(320, vw - 20);
  menu.style.width = `${width}px`;
  menu.style.left = `${Math.max(10, Math.min(vw - width - 10, rect.right - width))}px`;
  menu.style.top = `${Math.max(66, rect.bottom + 8)}px`;
}

function clickSidebar(label) {
  const target = [...(sidebar()?.querySelectorAll("button") || [])].find((button) => buttonLabel(button) === label);
  target?.click();
  return Boolean(target);
}

function runProfileAction(action) {
  profileOpen = false;
  positionProfileMenu();
  if (action === "profile") return openProfile(document.querySelector(".sn-shell .sn-avatar"));
  if (action === "settings") return clickSidebar("Pengaturan");
  if (action === "add-site") return document.querySelector(".sn-shell .sn-workspace")?.click();
  if (action === "view-site") {
    const link = document.querySelector(".sn-view-site[href],.sn-secondary-link[href]");
    if (link?.href) window.open(link.href, "_blank", "noopener,noreferrer");
    return;
  }
  if (action === "logout") clickSidebar("Keluar");
}

function syncNara() {
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) return;
  const size = ["small", "medium", "full"].includes(shell.dataset.naraSize) ? shell.dataset.naraSize : "small";
  const full = size === "full";
  layer.dataset.v250Size = size;
  layer.dataset.v250Interaction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.tabIndex = full ? 0 : -1;
    backdrop.setAttribute("aria-hidden", String(!full));
  }
  if (!full) {
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
  }
}

function lineNumbers() {
  document.querySelectorAll(".tn-code-pane").forEach((pane) => {
    const textarea = pane.querySelector("textarea");
    if (!textarea) return;
    let gutter = pane.querySelector(":scope > .tn-code-gutter-v250");
    if (!gutter) {
      gutter = document.createElement("pre");
      gutter.className = "tn-code-gutter-v250";
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
  });
}

function enhanceLayoutMap() {
  const studio = document.querySelector(".tn-layout-studio");
  if (!studio) return;
  let map = studio.querySelector(".v250-layout-map");
  if (!map) {
    map = document.createElement("div");
    map.className = "v250-layout-map";
    map.setAttribute("aria-label", "Denah tata letak tema");
    map.innerHTML = LAYOUT_AREAS.map((area) => `<button type="button" data-layout-area="${area.id}" class="v250-layout-area ${area.id}"><span>${area.label}</span><small>Atur widget</small></button>`).join("");
    const canvas = studio.querySelector(".tn-layout-canvas");
    canvas?.insertAdjacentElement("afterend", map);
    map.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-layout-area]");
      if (!button) return;
      selectedArea = button.dataset.layoutArea || "";
      map.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
      studio.querySelector(".tn-layout-studio-header button,.tn-layout-side>button")?.click();
    });
  }
  document.querySelectorAll(".tn-widget-settings label").forEach((label) => {
    if (!/^Area\b/i.test(label.textContent || "")) return;
    const select = label.querySelector("select");
    if (!select || select.dataset.v250Areas) return;
    select.dataset.v250Areas = RELEASE;
    const previous = select.value;
    select.innerHTML = LAYOUT_AREAS.map((area) => `<option value="${area.id}">${area.label}</option>`).join("");
    if (LAYOUT_AREAS.some((area) => area.id === previous)) select.value = previous;
    else if (selectedArea) {
      select.value = selectedArea;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  lineNumbers();
}

function enhance() {
  frame = 0;
  syncSidebar();
  positionProfileMenu();
  syncNara();
  enhanceLayoutMap();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(enhance);
}

function clickCapture(event) {
  const avatar = event.target.closest?.(".sn-shell .sn-avatar");
  if (avatar) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    profileOpen = !profileOpen;
    positionProfileMenu();
    if (profileOpen) ensureProfileMenu().querySelector("button[data-action]")?.focus();
    return;
  }
  const profileButton = event.target.closest?.(`#${PROFILE_ID} button[data-action]`);
  if (profileButton) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    runProfileAction(profileButton.dataset.action);
    return;
  }
  const logo = event.target.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (logo) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    toggle()?.click();
    requestAnimationFrame(schedule);
    return;
  }
  if (profileOpen && !event.target.closest?.(`#${PROFILE_ID}`)) {
    profileOpen = false;
    positionProfileMenu();
  }
  const navigation = event.target.closest?.("#ngeblogging-studio-sidebar .sn-new,#ngeblogging-studio-sidebar nav button,#ngeblogging-studio-sidebar .sn-account-settings-v135");
  if (navigation && family() === "large") {
    requestAnimationFrame(() => {
      const side = sidebar();
      if (side && !side.classList.contains("collapsed")) toggle()?.click();
      schedule();
    });
  }
}

function keyCapture(event) {
  if (event.key === "Escape") {
    if (profileOpen) {
      profileOpen = false;
      positionProfileMenu();
      document.querySelector(".sn-shell .sn-avatar")?.focus();
      return;
    }
    const side = sidebar();
    if (family() === "small" && side?.classList.contains("mobile-open")) toggle()?.click();
  }
  if ((event.key === "Enter" || event.key === " ") && event.target.matches?.("#ngeblogging-studio-sidebar .sn-logo-mark")) {
    event.preventDefault();
    toggle()?.click();
    requestAnimationFrame(schedule);
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("click", clickCapture, true);
  document.addEventListener("keydown", keyCapture, true);
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  new MutationObserver(schedule).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "src", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-mode", "data-studio-device-variant", "data-studio-desktop-site-phone"],
  });
  schedule();
}
