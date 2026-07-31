import "./studio-mobile-runtime-v180.css";

const RELEASE = "studio-mobile-auth-v180-20260731";
const MOBILE_MAX = 820;
const DRAWER_LOCK_CLASSES = [
  "sn-mobile-sidebar-open",
  "sn-mobile-sidebar-open-v176",
  "sm176-drawer-open",
  "sm177-drawer-open",
  "v179-drawer-open",
];
const NARA_LOCK_CLASSES = [
  "nara-fullscreen-open-v148",
  "nara-fullscreen-open-v176",
  "sm177-nara-full",
  "nara-fullscreen-open",
  "nara-scroll-lock",
  "v179-nara-full",
];

let frame = 0;
let lastDrawerOpen = false;

function viewportWidth() {
  return Math.max(
    0,
    window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 0,
  );
}

function isStandalone() {
  return Boolean(
    window.matchMedia?.("(display-mode: standalone)")?.matches
    || window.navigator.standalone === true,
  );
}

function responsiveFamily() {
  if (isStandalone()) return "application";
  const width = viewportWidth();
  if (width <= 360) return "phone";
  if (width <= 430) return "mobile";
  if (width <= 600) return "compact";
  if (width <= 1100) return "tablet";
  return "desktop";
}

function isMobileStudio() {
  return viewportWidth() <= MOBILE_MAX || responsiveFamily() !== "desktop";
}

function setAttribute(node, name, value) {
  if (!node) return;
  const next = String(value);
  if (node.getAttribute(name) !== next) node.setAttribute(name, next);
}

function removeAttribute(node, name) {
  if (node?.hasAttribute(name)) node.removeAttribute(name);
}

function intentionalModalOpen() {
  return Boolean(document.querySelector([
    ".sn-modal-layer",
    ".ce-preview-layer",
    ".nara-assistant-shell[data-nara-size='full']",
    ".nara-upgrade-card",
  ].join(",")));
}

function clearInlineInteractionLock(node) {
  if (!node) return;
  for (const property of [
    "overflow", "overflow-x", "overflow-y", "pointer-events", "filter", "touch-action",
  ]) node.style.removeProperty(property);
  removeAttribute(node, "inert");
}

function unlockDocumentWhenSafe() {
  if (intentionalModalOpen()) return;
  clearInlineInteractionLock(document.documentElement);
  clearInlineInteractionLock(document.body);
  clearInlineInteractionLock(document.querySelector(".sn-main"));
}

function syncLayoutContract() {
  const root = document.documentElement;
  root.dataset.studioMobileAuthV180 = RELEASE;
  root.dataset.studioLayoutFamilyV180 = responsiveFamily();
  root.dataset.studioStandaloneV180 = String(isStandalone());
}

function drawerState() {
  const shell = document.querySelector(".sn-shell");
  const sidebar = shell?.querySelector(":scope > .sn-side");
  const backdrop = shell?.querySelector(":scope > .sn-side-backdrop")
    || document.querySelector(".sn-side-backdrop");
  const main = shell?.querySelector(":scope > .sn-main");
  const toggle = shell?.querySelector(".sn-sidebar-toggle");
  const open = Boolean(isMobileStudio() && sidebar?.classList.contains("mobile-open"));
  return { shell, sidebar, backdrop, main, toggle, open };
}

function syncDrawer() {
  const { sidebar, backdrop, main, toggle, open } = drawerState();
  document.body.classList.toggle("v180-drawer-open", open);

  if (sidebar) {
    sidebar.dataset.drawerAuthorityV180 = RELEASE;
    setAttribute(sidebar, "aria-hidden", String(isMobileStudio() && !open));
    removeAttribute(sidebar, "inert");
    sidebar.querySelectorAll("button,a,input,select,textarea").forEach((node) => {
      removeAttribute(node, "inert");
      if (open) removeAttribute(node, "aria-hidden");
    });
  }
  if (toggle) setAttribute(toggle, "aria-expanded", String(open));

  if (open) {
    DRAWER_LOCK_CLASSES.forEach((className) => document.body.classList.remove(className));
    if (backdrop) {
      backdrop.hidden = false;
      backdrop.tabIndex = 0;
      setAttribute(backdrop, "aria-hidden", "false");
      backdrop.dataset.drawerBackdropV180 = "outside-only";
    }
    clearInlineInteractionLock(sidebar);
    clearInlineInteractionLock(main);
  } else {
    DRAWER_LOCK_CLASSES.forEach((className) => document.body.classList.remove(className));
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.tabIndex = -1;
      setAttribute(backdrop, "aria-hidden", "true");
    }
    clearInlineInteractionLock(main);
    unlockDocumentWhenSafe();
  }

  if (lastDrawerOpen && !open) {
    requestAnimationFrame(() => {
      clearInlineInteractionLock(document.querySelector(".sn-main"));
      unlockDocumentWhenSafe();
    });
  }
  lastDrawerOpen = open;
}

function naraCloseButton(shell) {
  return [...(shell?.querySelectorAll(".nara-assistant-header > button") || [])]
    .find((button) => /tutup/i.test(`${button.title || ""} ${button.getAttribute("aria-label") || ""}`))
    || shell?.querySelector(".nara-assistant-header > button:last-child")
    || null;
}

function syncNara() {
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) {
    document.body.classList.remove("v180-nara-full");
    NARA_LOCK_CLASSES.forEach((className) => {
      document.body.classList.remove(className);
      document.documentElement.classList.remove(className);
    });
    unlockDocumentWhenSafe();
    return;
  }

  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.naraInteractionV180 = full ? "modal" : "nonmodal";
  shell.dataset.naraStableV180 = RELEASE;
  setAttribute(layer, "aria-modal", String(full));
  document.body.classList.toggle("v180-nara-full", full);

  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.tabIndex = full ? 0 : -1;
    setAttribute(backdrop, "aria-hidden", String(!full));
  }

  const close = naraCloseButton(shell);
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.tabIndex = 0;
    setAttribute(close, "aria-label", "Tutup Nara AI");
    removeAttribute(close, "aria-hidden");
  }

  if (!full) {
    NARA_LOCK_CLASSES.forEach((className) => {
      document.body.classList.remove(className);
      document.documentElement.classList.remove(className);
    });
    unlockDocumentWhenSafe();
  }
}

function syncAll() {
  frame = 0;
  syncLayoutContract();
  syncDrawer();
  syncNara();
}

function scheduleSync() {
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(syncAll);
}

function closeDrawerFromBackdrop(event) {
  const backdrop = event.target.closest(".sn-side-backdrop");
  if (!backdrop || event.target !== backdrop) return;
  const { sidebar, toggle, open } = drawerState();
  if (!open) return;
  event.preventDefault();
  event.stopPropagation();
  const close = sidebar?.querySelector(".sn-side-close");
  if (close && !close.disabled) close.click();
  else toggle?.click();
  scheduleSync();
}

document.addEventListener("click", closeDrawerFromBackdrop, true);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const { sidebar, toggle, open } = drawerState();
  if (!open) return;
  const close = sidebar?.querySelector(".sn-side-close");
  if (close && !close.disabled) close.click();
  else toggle?.click();
  scheduleSync();
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".sn-sidebar-toggle,.sn-side-close,.nara-floating-button,.nara-size-controls-v147,.nara-assistant-header")) {
    requestAnimationFrame(scheduleSync);
  }
}, true);

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
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-nara-size", "hidden", "aria-hidden", "inert"],
});

window.addEventListener("resize", scheduleSync, { passive: true });
window.addEventListener("orientationchange", scheduleSync, { passive: true });
window.visualViewport?.addEventListener("resize", scheduleSync, { passive: true });
window.addEventListener("pageshow", () => {
  document.body.classList.remove("v180-drawer-open", "v180-nara-full");
  DRAWER_LOCK_CLASSES.forEach((className) => document.body.classList.remove(className));
  requestAnimationFrame(scheduleSync);
}, { passive: true });
window.addEventListener("online", scheduleSync, { passive: true });

syncAll();

export { RELEASE, responsiveFamily, syncAll, syncDrawer, syncNara };
