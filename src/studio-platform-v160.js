import "./studio-ui-contract-v159.js";
import "./studio-platform-v160.css";

const RELEASE = "studio-platform-v160-20260730";
const SIDEBAR_STORAGE_KEY = "ngeblogging:studio:sidebar:v160";
const VIEWPORT_MATRIX = [
  [320, 568], [360, 640], [375, 667], [390, 844], [412, 915], [430, 932],
  [600, 960], [768, 1024], [820, 1180], [1024, 768], [1280, 720],
  [1366, 768], [1440, 900], [1920, 1080],
];

let scanFrame = 0;
let sidebarHydrated = false;
let sidebarObserver = null;
let lastSidebarButton = null;

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* penyimpanan dibatasi browser */ }
}

function isSmallMode() {
  const shell = document.querySelector(".sn-shell");
  return shell?.dataset.deviceMode === "small";
}

function sidebarPreference() {
  const stored = safeGet(SIDEBAR_STORAGE_KEY);
  if (stored === "open" || stored === "closed") return stored;
  return "open";
}

function writeSidebarPreference(sidebar) {
  if (!sidebar || isSmallMode()) return;
  safeSet(SIDEBAR_STORAGE_KEY, sidebar.classList.contains("collapsed") ? "closed" : "open");
}

function applySidebarPreference() {
  const sidebar = document.querySelector("#ngeblogging-studio-sidebar.sn-side");
  const toggle = document.querySelector(".sn-sidebar-toggle");
  if (!sidebar || !toggle || isSmallMode()) return;

  const shouldCollapse = sidebarPreference() === "closed";
  const isCollapsed = sidebar.classList.contains("collapsed");
  if (!sidebarHydrated && shouldCollapse !== isCollapsed) {
    sidebarHydrated = true;
    toggle.click();
  } else {
    sidebarHydrated = true;
  }

  if (sidebarObserver?.target !== sidebar) {
    sidebarObserver?.observer?.disconnect();
    const observer = new MutationObserver(() => {
      writeSidebarPreference(sidebar);
      syncSidebarLabels();
    });
    observer.observe(sidebar, { attributes: true, attributeFilter: ["class"] });
    sidebarObserver = { target: sidebar, observer };
  }
}

function syncSidebarLabels() {
  const sidebar = document.querySelector("#ngeblogging-studio-sidebar.sn-side");
  if (!sidebar) return;
  const collapsed = sidebar.classList.contains("collapsed") && !isSmallMode();
  sidebar.querySelectorAll("nav button,.sn-account-footer button,.sn-new").forEach((button) => {
    const label = button.querySelector("span")?.textContent?.trim() || button.getAttribute("aria-label") || "Menu";
    button.setAttribute("aria-label", label);
    if (collapsed) button.setAttribute("title", label);
    else button.removeAttribute("title");
  });
}

function syncDrawerAccessibility() {
  const shell = document.querySelector(".sn-shell");
  const sidebar = shell?.querySelector("#ngeblogging-studio-sidebar");
  const main = shell?.querySelector(".sn-main");
  const toggle = shell?.querySelector(".sn-sidebar-toggle");
  if (!shell || !sidebar || !main || !toggle) return;

  const mobileOpen = isSmallMode() && sidebar.classList.contains("mobile-open");
  sidebar.setAttribute("aria-hidden", isSmallMode() && !mobileOpen ? "true" : "false");
  main.toggleAttribute("inert", mobileOpen);
  if (mobileOpen) {
    lastSidebarButton = toggle;
    sidebar.querySelector(".sn-side-close,nav button,.sn-new")?.focus({ preventScroll: true });
  } else if (lastSidebarButton && document.activeElement && sidebar.contains(document.activeElement)) {
    lastSidebarButton.focus({ preventScroll: true });
  }
}

function syncProfileKeyboard() {
  const menu = document.querySelector(".sn-profile-menu-v150");
  if (!menu || menu.dataset.keyboardV160) return;
  menu.dataset.keyboardV160 = RELEASE;
  menu.setAttribute("aria-label", "Menu profil pengguna");
  menu.addEventListener("keydown", (event) => {
    const items = [...menu.querySelectorAll('[role="menuitem"]')];
    if (!items.length) return;
    const current = Math.max(0, items.indexOf(document.activeElement));
    let next = current;
    if (event.key === "ArrowDown") next = (current + 1) % items.length;
    else if (event.key === "ArrowUp") next = (current - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    items[next]?.focus();
  });
}

function syncSafeAreas() {
  const root = document.documentElement;
  root.dataset.studioPlatformV160 = RELEASE;
  root.dataset.viewportContract = `${window.innerWidth}x${window.innerHeight}`;
  root.dataset.viewportMatrixCount = String(VIEWPORT_MATRIX.length);
  root.style.setProperty("--nge-visual-height", `${window.visualViewport?.height || window.innerHeight}px`);
  root.style.setProperty("--nge-visual-width", `${window.visualViewport?.width || window.innerWidth}px`);
}

function scan() {
  scanFrame = 0;
  syncSafeAreas();
  applySidebarPreference();
  syncSidebarLabels();
  syncDrawerAccessibility();
  syncProfileKeyboard();
}

function scheduleScan() {
  if (scanFrame) return;
  scanFrame = requestAnimationFrame(scan);
}

new MutationObserver(scheduleScan).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-device-mode", "aria-expanded"],
});

window.addEventListener("resize", scheduleScan, { passive: true });
window.addEventListener("orientationchange", scheduleScan, { passive: true });
window.addEventListener("pageshow", scheduleScan, { passive: true });
window.visualViewport?.addEventListener("resize", scheduleScan, { passive: true });

document.addEventListener("click", (event) => {
  if (event.target.closest(".sn-sidebar-toggle,.sn-sidebar-edge-toggle-v159")) {
    requestAnimationFrame(() => {
      writeSidebarPreference(document.querySelector("#ngeblogging-studio-sidebar.sn-side"));
      scheduleScan();
    });
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const sidebar = document.querySelector("#ngeblogging-studio-sidebar.sn-side.mobile-open");
  if (sidebar && isSmallMode()) {
    document.querySelector(".sn-side-close")?.click();
    requestAnimationFrame(() => lastSidebarButton?.focus({ preventScroll: true }));
  }
});

scheduleScan();

export { RELEASE, SIDEBAR_STORAGE_KEY, VIEWPORT_MATRIX, applySidebarPreference };
