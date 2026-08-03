export const SIDEBAR_BRAND_RELEASE_V246 = "studio-sidebar-brand-toggle-v246-20260803";

const ROOT_ID = "ngeblogging-studio-chrome-v244";
const SIDEBAR_KEY = "ngeblogging-sidebar-state-v244";
const SMALL = new Set(["application", "phone", "mobile", "compact", "small"]);
const LARGE = new Set(["tablet", "laptop", "desktop", "computer", "large"]);
let desktopExpanded = true;
let mobileOpen = false;
let initialized = false;
let raf = 0;
let observer = null;

function readExpanded() {
  try { return localStorage.getItem(SIDEBAR_KEY) !== "collapsed"; }
  catch { return true; }
}

function writeExpanded() {
  try { localStorage.setItem(SIDEBAR_KEY, desktopExpanded ? "expanded" : "collapsed"); }
  catch { /* storage may be unavailable */ }
}

function viewportWidth() {
  const layout = Number(document.documentElement.clientWidth || innerWidth || 0);
  const visual = Number(window.visualViewport?.width || layout || 0);
  if (layout > 0 && visual > 0) return Math.min(layout, visual);
  return layout || visual || 0;
}

function family(root) {
  const html = document.documentElement;
  const declared = String(html.dataset.studioResponsiveMode || "").toLowerCase();
  const deviceMode = String(html.dataset.studioDeviceMode || "").toLowerCase();
  const desktopSite = html.dataset.studioDesktopSitePhone === "true" || html.dataset.desktopSitePhone === "true";

  // The responsive detector is the authority. Never let an old v244/root family
  // keep a phone stuck in desktop mode after resize/orientation/React re-render.
  if (desktopSite) return "large";
  if (SMALL.has(declared)) return "small";
  if (LARGE.has(declared)) return "large";
  if (deviceMode === "small" || deviceMode === "large") return deviceMode;

  const width = viewportWidth();
  if (width > 0) return width <= 760 ? "small" : "large";

  const historical = String(html.dataset.studioV244Family || root?.dataset.family || "").toLowerCase();
  return historical === "large" ? "large" : "small";
}

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function forceVisible(node) {
  if (!node) return;
  setImportant(node, "visibility", "visible");
  setImportant(node, "opacity", "1");
  setImportant(node, "filter", "none");
}

function ensureBrand(root) {
  const brand = root?.querySelector(".v244-brand-row");
  const nButton = root?.querySelector(".v244-internal-n");
  const nText = nButton?.querySelector("span");
  const name = brand?.querySelector(":scope > strong");
  const mobileN = root?.querySelector(".v244-mobile-n");
  const mobileText = mobileN?.querySelector("span");
  const avatar = root?.querySelector(".v244-avatar");

  if (nText && nText.textContent !== "n") nText.textContent = "n";
  if (mobileText && mobileText.textContent !== "n") mobileText.textContent = "n";
  if (name && name.textContent !== "Ngeblogging") name.textContent = "Ngeblogging";

  nButton?.setAttribute("aria-label", "Buka atau tutup menu Studio");
  mobileN?.setAttribute("aria-label", mobileOpen ? "Tutup menu Studio" : "Buka menu Studio");
  brand?.setAttribute("data-v246-brand", "visible");
  nButton?.setAttribute("data-v246-toggle", "desktop-internal");
  mobileN?.setAttribute("data-v246-toggle", "mobile-topbar");
  avatar?.setAttribute("data-v246-profile", "visible");

  for (const node of [brand, nButton, nText, name, mobileN, mobileText, avatar]) forceVisible(node);
  if (nButton) {
    setImportant(nButton, "display", "grid");
    setImportant(nButton, "place-items", "center");
    setImportant(nButton, "pointer-events", "auto");
    setImportant(nButton, "color", "#ffffff");
    setImportant(nButton, "background", "linear-gradient(145deg,#3379ea,#5f54dc)");
  }
  if (nText) {
    setImportant(nText, "display", "grid");
    setImportant(nText, "place-items", "center");
    setImportant(nText, "color", "#ffffff");
  }
  if (name) {
    setImportant(name, "color", "#17243a");
    setImportant(name, "writing-mode", "horizontal-tb");
  }
  if (avatar) {
    setImportant(avatar, "display", "grid");
    setImportant(avatar, "place-items", "center");
    setImportant(avatar, "pointer-events", "auto");
  }
}

function neutralizeLegacyBlockingLayers() {
  document.body.classList.remove("sn-mobile-sidebar-open");
  for (const node of document.querySelectorAll(".sn-side-backdrop,.sn-sidebar-backdrop,[data-legacy-sidebar-backdrop]")) {
    setImportant(node, "display", "none");
    setImportant(node, "visibility", "hidden");
    setImportant(node, "opacity", "0");
    setImportant(node, "pointer-events", "none");
    setImportant(node, "backdrop-filter", "none");
    setImportant(node, "-webkit-backdrop-filter", "none");
  }
}

function applyMainGeometry(mode, state, root) {
  const main = document.querySelector(".sn-shell .sn-main");
  const topbar = root?.querySelector(".v244-topbar");
  const sidebar = root?.querySelector(".v244-sidebar");
  if (!main || !root) return;

  if (mode === "large") {
    const width = state === "expanded" ? "248px" : "70px";
    setImportant(sidebar, "width", width);
    setImportant(sidebar, "max-width", width);
    setImportant(sidebar, "transform", "none");
    setImportant(sidebar, "visibility", "visible");
    setImportant(sidebar, "opacity", "1");
    setImportant(sidebar, "pointer-events", "auto");
    setImportant(topbar, "left", width);
    setImportant(topbar, "right", "0px");
    setImportant(main, "margin-left", width);
    setImportant(main, "width", `calc(100% - ${width})`);
    setImportant(main, "max-width", "none");
    setImportant(main, "transform", "none");
    setImportant(main, "zoom", "1");
  } else {
    setImportant(topbar, "left", "0px");
    setImportant(topbar, "right", "0px");
    setImportant(main, "margin-left", "0px");
    setImportant(main, "width", "100%");
    setImportant(main, "max-width", "100%");
    setImportant(main, "transform", "none");
    setImportant(main, "zoom", "1");
    if (state === "open") {
      setImportant(sidebar, "visibility", "visible");
      setImportant(sidebar, "opacity", "1");
      setImportant(sidebar, "pointer-events", "auto");
      setImportant(sidebar, "transform", "translateX(0)");
    } else {
      setImportant(sidebar, "visibility", "hidden");
      setImportant(sidebar, "opacity", "0");
      setImportant(sidebar, "pointer-events", "none");
      setImportant(sidebar, "transform", "translateX(-105%)");
    }
  }
}

function synchronizeHistoricalState(root, mode, state) {
  const html = document.documentElement;
  html.dataset.studioV244Family = mode;
  html.dataset.studioV244Sidebar = state;
  root.dataset.family = mode;
  root.dataset.sidebar = state;
}

function apply() {
  const shell = document.querySelector(".sn-shell");
  const root = document.getElementById(ROOT_ID);
  if (!shell || !root) return;

  if (!initialized) {
    desktopExpanded = readExpanded();
    const v244State = root.dataset.sidebar || document.documentElement.dataset.studioV244Sidebar || "";
    if (v244State === "expanded") desktopExpanded = true;
    if (v244State === "collapsed") desktopExpanded = false;
    mobileOpen = v244State === "open";
    initialized = true;
  }

  const mode = family(root);
  const state = mode === "small" ? (mobileOpen ? "open" : "closed") : (desktopExpanded ? "expanded" : "collapsed");
  const html = document.documentElement;
  html.dataset.studioV246 = SIDEBAR_BRAND_RELEASE_V246;
  html.dataset.studioV246Family = mode;
  html.dataset.studioV246Sidebar = state;
  root.dataset.v246Family = mode;
  root.dataset.v246Sidebar = state;
  root.hidden = false;

  synchronizeHistoricalState(root, mode, state);
  neutralizeLegacyBlockingLayers();
  ensureBrand(root);
  applyMainGeometry(mode, state, root);
}

function schedule() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    apply();
  });
}

function closeProfileIfClickOutside(event, root) {
  const menu = root?.querySelector(".v244-profile-menu");
  const avatar = root?.querySelector(".v244-avatar");
  if (!menu || menu.hidden || !avatar) return;
  if (menu.contains(event.target) || avatar.contains(event.target)) return;
  requestAnimationFrame(() => {
    if (!menu.hidden) avatar.click();
  });
}

function handleClick(event) {
  const root = document.getElementById(ROOT_ID);
  if (!root) return;
  closeProfileIfClickOutside(event, root);

  const target = event.target.closest?.("button, a");
  if (!target || !root.contains(target)) return;
  const mode = family(root);

  if (target.closest(".v244-internal-n")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (mode === "small") mobileOpen = false;
    else {
      desktopExpanded = !desktopExpanded;
      writeExpanded();
    }
    schedule();
    return;
  }

  if (target.closest(".v244-mobile-n")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    mobileOpen = !mobileOpen;
    schedule();
    return;
  }

  if (target.closest(".v244-drawer-backdrop")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    mobileOpen = false;
    schedule();
    return;
  }

  const navigationTarget = target.closest(".v244-create,.v244-nav button,.v244-footer button");
  if (navigationTarget) {
    requestAnimationFrame(() => {
      if (mode === "small") mobileOpen = false;
      else {
        desktopExpanded = false;
        writeExpanded();
      }
      schedule();
    });
  }
}

function handleKey(event) {
  if (event.key !== "Escape") return;
  const root = document.getElementById(ROOT_ID);
  const menu = root?.querySelector(".v244-profile-menu");
  const avatar = root?.querySelector(".v244-avatar");
  if (menu && !menu.hidden && avatar) avatar.click();
  if (mobileOpen) {
    mobileOpen = false;
    schedule();
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", handleKey, true);
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  observer = new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" || record.attributeName === "style" || record.attributeName === "data-sidebar" || record.attributeName === "data-family" || record.attributeName === "class" || record.attributeName === "data-studio-responsive-mode" || record.attributeName === "data-studio-device-mode")) schedule();
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["style", "class", "data-sidebar", "data-family", "data-studio-v244-family", "data-studio-v244-sidebar", "data-studio-responsive-mode", "data-studio-device-mode", "data-studio-desktop-site-phone"],
  });
  schedule();
}
