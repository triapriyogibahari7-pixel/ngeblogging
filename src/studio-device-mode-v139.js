const RELEASE = "studio-device-mode-v139-20260729";
const MODE_EVENT = "ngeblogging:studio-device-mode-change";
const HANDHELD_MAX = 820;
const COMPACT_MAX = 760;

let frame = 0;
let forcedDrawerOpen = false;
let forcedBackdrop = null;

function finitePositive(value, fallback = Number.POSITIVE_INFINITY) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function metrics() {
  const layoutWidth = finitePositive(document.documentElement.clientWidth || window.innerWidth, 1);
  const layoutHeight = finitePositive(document.documentElement.clientHeight || window.innerHeight, 1);
  const visualWidth = finitePositive(window.visualViewport?.width, layoutWidth);
  const visualHeight = finitePositive(window.visualViewport?.height, layoutHeight);
  const visualScale = finitePositive(window.visualViewport?.scale, 1);
  const screenWidth = finitePositive(window.screen?.width, layoutWidth);
  const screenHeight = finitePositive(window.screen?.height, layoutHeight);
  const physicalShortSide = Math.min(screenWidth, screenHeight);
  const effectiveWidth = Math.min(layoutWidth, visualWidth);
  return {
    layoutWidth,
    layoutHeight,
    visualWidth,
    visualHeight,
    visualScale,
    screenWidth,
    screenHeight,
    physicalShortSide,
    effectiveWidth,
  };
}

function handheldSignal() {
  const ua = navigator.userAgent || "";
  return navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)
    || navigator.maxTouchPoints > 1
    || window.matchMedia?.("(pointer: coarse)")?.matches === true;
}

function surfaceMode() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches
    || window.navigator.standalone === true
    ? "application"
    : "browser";
}

export function detectStudioDeviceMode() {
  const view = metrics();
  const compactViewport = view.effectiveWidth <= COMPACT_MAX;
  const handheldPhysicalScreen = handheldSignal() && view.physicalShortSide <= HANDHELD_MAX;
  return compactViewport || handheldPhysicalScreen ? "small" : "large";
}

export function currentStudioDeviceMode() {
  return document.documentElement.dataset.studioDeviceMode || detectStudioDeviceMode();
}

function forcedDesktopSitePhone() {
  const view = metrics();
  return detectStudioDeviceMode() === "small" && view.layoutWidth > COMPACT_MAX;
}

function ensureForcedBackdrop(shell) {
  if (!forcedDesktopSitePhone()) return;
  if (forcedBackdrop?.isConnected) return;
  forcedBackdrop = document.createElement("button");
  forcedBackdrop.type = "button";
  forcedBackdrop.className = "sn-side-backdrop sn-v139-forced-backdrop";
  forcedBackdrop.setAttribute("aria-label", "Tutup menu Studio");
  forcedBackdrop.addEventListener("click", () => setForcedDrawer(false));
  shell.insertBefore(forcedBackdrop, shell.firstChild);
}

function setForcedDrawer(open) {
  const shell = document.querySelector(".sn-shell");
  forcedDrawerOpen = Boolean(open && forcedDesktopSitePhone() && shell);
  if (!shell) return;
  shell.dataset.v139ForcedMobileOpen = String(forcedDrawerOpen);
  document.body.classList.toggle("sn-mobile-sidebar-open", forcedDrawerOpen);
  ensureForcedBackdrop(shell);
  if (forcedBackdrop) forcedBackdrop.hidden = !forcedDrawerOpen;
  const toggle = shell.querySelector(".sn-sidebar-toggle");
  toggle?.setAttribute("aria-expanded", String(forcedDrawerOpen));
}

function syncForcedBridge() {
  const shell = document.querySelector(".sn-shell");
  if (!shell) return;
  shell.dataset.deviceAuthority = RELEASE;
  shell.dataset.v139DesktopSitePhone = String(forcedDesktopSitePhone());
  if (!forcedDesktopSitePhone()) setForcedDrawer(false);
  else ensureForcedBackdrop(shell);
}

function applyDeviceMode() {
  const root = document.documentElement;
  const previous = root.dataset.studioDeviceMode || "";
  const view = metrics();
  const mode = detectStudioDeviceMode();
  root.dataset.studioDeviceMode = mode;
  root.dataset.studioSurfaceMode = surfaceMode();
  root.dataset.studioDeviceRelease = RELEASE;
  root.dataset.studioHandheldSignal = String(handheldSignal());
  root.dataset.studioDesktopSitePhone = String(mode === "small" && view.layoutWidth > COMPACT_MAX);
  root.style.setProperty("--studio-layout-width", `${view.layoutWidth}px`);
  root.style.setProperty("--studio-layout-height", `${view.layoutHeight}px`);
  root.style.setProperty("--studio-visual-width", `${view.visualWidth}px`);
  root.style.setProperty("--studio-visual-height", `${view.visualHeight}px`);
  root.style.setProperty("--studio-visual-scale", String(view.visualScale));
  syncForcedBridge();
  if (previous !== mode) {
    window.dispatchEvent(new CustomEvent(MODE_EVENT, {
      detail: { mode, previous, release: RELEASE },
    }));
  }
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(applyDeviceMode);
}

function isInside(node, selector) {
  return node instanceof Element && Boolean(node.closest(selector));
}

document.addEventListener("click", (event) => {
  if (!forcedDesktopSitePhone()) return;
  const target = event.target;
  if (isInside(target, ".sn-sidebar-toggle")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    setForcedDrawer(!forcedDrawerOpen);
    return;
  }
  if (isInside(target, ".sn-side-close")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    setForcedDrawer(false);
    return;
  }
  if (forcedDrawerOpen && isInside(target, ".sn-side nav button, .sn-account-footer button, .sn-new")) {
    queueMicrotask(() => setForcedDrawer(false));
  }
}, true);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && forcedDrawerOpen) setForcedDrawer(false);
});

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });

applyDeviceMode();

export { RELEASE, MODE_EVENT, COMPACT_MAX };
