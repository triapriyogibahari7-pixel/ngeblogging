import { openProfile } from "./studio-finalization-v178.js";
import "./studio-mobile-runtime-v179.css";
import "./studio-mobile-nara-v179.css";

const RELEASE = "studio-mobile-runtime-v179-20260731";
const MENU_CLASS = "sn-account-menu-v179";
const loadingTimers = new WeakMap();
let accountMenu = null;
let accountTrigger = null;
let resizeFrame = 0;

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches
    || window.navigator.standalone === true;
}

function viewportWidth() {
  return Math.max(0, window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 0);
}

function layoutFamily() {
  if (isStandalone()) return "application";
  const width = viewportWidth();
  if (width <= 360) return "phone";
  if (width <= 430) return "mobile";
  if (width <= 600) return "compact";
  if (width <= 1100) return "tablet";
  return "desktop";
}

function desktopVariant() {
  const width = viewportWidth();
  if (width < 1280) return "laptop";
  if (width < 1600) return "desktop";
  return "computer";
}

function setDataset(node, key, value) {
  const next = String(value);
  if (node?.dataset?.[key] !== next) node.dataset[key] = next;
}

function setAttribute(node, name, value) {
  if (!node) return;
  const next = String(value);
  if (node.getAttribute(name) !== next) node.setAttribute(name, next);
}

function removeAttribute(node, name) {
  if (node?.hasAttribute(name)) node.removeAttribute(name);
}

function syncLayoutDataset() {
  const root = document.documentElement;
  setDataset(root, "studioMobileRuntimeV179", RELEASE);
  setDataset(root, "studioLayoutFamilyV179", layoutFamily());
  setDataset(root, "studioDesktopVariantV179", desktopVariant());
  setDataset(root, "studioStandaloneV179", isStandalone());
}

function removeLegacyAccountMenus() {
  document.querySelectorAll(".sn-profile-menu-v150,.sn-account-menu-v179").forEach((node) => {
    if (node !== accountMenu) node.remove();
  });
}

function closeAccountMenu({ restoreFocus = false } = {}) {
  accountMenu?.remove();
  accountMenu = null;
  setAttribute(document.querySelector(".sn-avatar"), "aria-expanded", "false");
  if (restoreFocus) accountTrigger?.focus?.({ preventScroll: true });
  accountTrigger = null;
}

function buttonText(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function sidebarAction(label) {
  const candidates = [...document.querySelectorAll(".sn-side button,.sn-account-footer button")];
  return candidates.find((button) => buttonText(button) === label) || null;
}

function icon(path) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"></path></svg>`;
}

function profileLabel() {
  const trigger = document.querySelector(".sn-avatar");
  return trigger?.getAttribute("title")?.trim()
    || trigger?.getAttribute("aria-label")?.replace(/^Buka menu profil\s*/i, "").trim()
    || "Akun Ngeblogging";
}

function buildAccountMenu() {
  const menu = document.createElement("section");
  menu.className = MENU_CLASS;
  menu.dataset.release = RELEASE;
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Menu akun");
  menu.innerHTML = `
    <header><b>${profileLabel().replace(/[<>&"]/g, "")}</b><small>Profil pribadi dan pengaturan situs dipisahkan.</small></header>
    <button type="button" role="menuitem" data-action="profile">${icon("M20 21a8 8 0 0 0-16 0 M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8")}<span>Profil</span></button>
    <button type="button" role="menuitem" data-action="settings">${icon("M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7 M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2 3.46-.08-.02a1.7 1.7 0 0 0-1.88-.34l-.6.35a1.7 1.7 0 0 0-.84 1.47V22h-4v-.14a1.7 1.7 0 0 0-.84-1.47l-.6-.35a1.7 1.7 0 0 0-1.88.34L7 20.4l-2-3.46.06-.06A1.7 1.7 0 0 0 5.4 15l-.35-.6A1.7 1.7 0 0 0 3.58 13.5H3v-4h.58a1.7 1.7 0 0 0 1.47-.84l.35-.6a1.7 1.7 0 0 0-.34-1.88L5 6.12l2-3.46.08.02a1.7 1.7 0 0 0 1.88.34l.6-.35A1.7 1.7 0 0 0 10.4 1.2V1h4v.2a1.7 1.7 0 0 0 .84 1.47l.6.35a1.7 1.7 0 0 0 1.88-.34l.08-.02 2 3.46-.06.06a1.7 1.7 0 0 0-.34 1.88l.35.6a1.7 1.7 0 0 0 1.47.84H22v4h-.78a1.7 1.7 0 0 0-1.47.84z")}<span>Pengaturan</span></button>
    <button type="button" role="menuitem" data-action="logout">${icon("M10 17l5-5-5-5 M15 12H3 M21 19V5a2 2 0 0 0-2-2h-6")}<span>Keluar</span></button>`;
  menu.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    const trigger = accountTrigger || document.querySelector(".sn-avatar");
    closeAccountMenu();
    if (action === "profile") {
      openProfile(trigger);
      return;
    }
    if (action === "settings") {
      sidebarAction("Pengaturan")?.click();
      return;
    }
    if (action === "logout") sidebarAction("Keluar")?.click();
  });
  menu.addEventListener("keydown", (event) => {
    const items = [...menu.querySelectorAll('[role="menuitem"]')];
    const index = items.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      closeAccountMenu({ restoreFocus: true });
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1 + items.length) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    }
  });
  return menu;
}

function toggleAccountMenu(trigger) {
  if (accountMenu) {
    closeAccountMenu({ restoreFocus: true });
    return;
  }
  removeLegacyAccountMenus();
  accountTrigger = trigger;
  accountMenu = buildAccountMenu();
  document.body.append(accountMenu);
  setAttribute(trigger, "aria-haspopup", "menu");
  setAttribute(trigger, "aria-expanded", "true");
  requestAnimationFrame(() => accountMenu?.querySelector('[role="menuitem"]')?.focus({ preventScroll: true }));
}

function interceptAvatar(event) {
  const trigger = event.target.closest(".sn-avatar");
  if (!trigger) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  toggleAccountMenu(trigger);
}

function syncDrawer() {
  const sidebar = document.querySelector(".sn-shell>.sn-side");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));
  if (sidebar) {
    removeAttribute(sidebar, "inert");
    setAttribute(sidebar, "aria-hidden", String(!open && layoutFamily() !== "desktop"));
    sidebar.querySelectorAll("button,a,input,select,textarea").forEach((node) => {
      removeAttribute(node, "inert");
      if (open) removeAttribute(node, "aria-hidden");
    });
  }
  document.body.classList.toggle("v179-drawer-open", open);
  if (!open) document.body.classList.remove("sn-mobile-sidebar-open", "sm177-drawer-open");
}

function syncNara() {
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) {
    document.body.classList.remove("v179-nara-full");
    return;
  }
  const size = shell.dataset.naraSize || shell.getAttribute("data-size") || "small";
  const full = size === "full";
  setDataset(layer, "naraInteractionV179", full ? "modal" : "nonmodal");
  document.body.classList.toggle("v179-nara-full", full);
  if (!full) {
    document.body.classList.remove("sm177-nara-full", "nara-fullscreen-open", "nara-scroll-lock");
    document.documentElement.classList.remove("nara-scroll-lock");
  }
  const close = shell.querySelector('[data-nara-close-v177],button[aria-label*="Tutup" i],button[title*="Tutup" i]');
  if (close) {
    if (close.hidden) close.hidden = false;
    if (close.disabled) close.disabled = false;
    removeAttribute(close, "aria-hidden");
  }
}

function retryButtonFor(node) {
  const page = node.closest(".sv124-page,.sn-api-page,.mv176-page,.sn-view-pad") || document;
  return page.querySelector([
    ".sv124-page-title button",
    ".sn-api-list>header button",
    ".mv176-title-actions button:first-child",
    "button[aria-label*='muat' i]",
  ].join(","));
}

function markLoadingStalled(node) {
  if (!node.isConnected || node.dataset.v179Stalled === "true") return;
  const visible = node.getClientRects().length > 0 && getComputedStyle(node).display !== "none";
  if (!visible) return;
  setDataset(node, "v179Stalled", "true");
  node.classList.add("v179-loading-stalled");
  if (!node.querySelector(".v179-loading-note")) {
    const note = document.createElement("p");
    note.className = "v179-loading-note";
    note.textContent = "Pemuatan melewati batas waktu. Sesi tetap dipertahankan; coba lagi tanpa keluar dari akun.";
    node.append(note);
  }
  if (!node.querySelector(".v179-loading-retry")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "v179-loading-retry";
    button.textContent = "Coba lagi";
    button.addEventListener("click", () => {
      setDataset(node, "v179Stalled", "false");
      node.classList.remove("v179-loading-stalled");
      node.querySelector(".v179-loading-note")?.remove();
      button.remove();
      const retry = retryButtonFor(node);
      if (retry && !retry.disabled) retry.click();
      else window.dispatchEvent(new Event("online"));
    });
    node.append(button);
  }
}

function watchLoading() {
  const selectors = ".sv124-domain-loading,.sv124-panel-loading,.sn-api-loading,.mv176-loading,.sn-loading";
  document.querySelectorAll(selectors).forEach((node) => {
    if (loadingTimers.has(node)) return;
    const delay = node.classList.contains("sn-loading") ? 20000 : 12000;
    const timer = window.setTimeout(() => markLoadingStalled(node), delay);
    loadingTimers.set(node, timer);
  });
}

function syncAll() {
  syncLayoutDataset();
  syncDrawer();
  syncNara();
  watchLoading();
}

function scheduleSync() {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(syncAll);
}

document.addEventListener("click", interceptAvatar, true);
document.addEventListener("pointerdown", (event) => {
  if (!accountMenu || accountMenu.contains(event.target) || event.target.closest(".sn-avatar")) return;
  closeAccountMenu();
}, true);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && accountMenu) closeAccountMenu({ restoreFocus: true });
});

const observer = new MutationObserver((mutations) => {
  const relevant = mutations.some((mutation) => {
    if (mutation.type === "childList") return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
    if (mutation.type !== "attributes") return false;
    if (mutation.target === document.documentElement && mutation.attributeName?.startsWith("data-studio-")) return false;
    return true;
  });
  if (relevant) scheduleSync();
});
observer.observe(document.documentElement, {
  childList:true,
  subtree:true,
  attributes:true,
  attributeFilter:["class","data-nara-size","aria-hidden","inert"],
});
window.addEventListener("resize", scheduleSync, { passive:true });
window.visualViewport?.addEventListener("resize", scheduleSync, { passive:true });
window.addEventListener("pageshow", scheduleSync, { passive:true });
window.addEventListener("online", scheduleSync, { passive:true });

syncAll();
navigator.serviceWorker?.getRegistration?.().then((registration) => registration?.update?.()).catch(() => {});

export { RELEASE, closeAccountMenu, layoutFamily, syncAll };
