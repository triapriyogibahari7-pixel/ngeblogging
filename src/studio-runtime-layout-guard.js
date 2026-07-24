const MOBILE_LAYOUT_RELEASE = "studio-icon-rail-v10-20260724";
const MOBILE_BREAKPOINT = 760;
const MOBILE_RAIL = 68;
const MOBILE_UA = /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i;

function isMobileDevice() {
  if (navigator.userAgentData?.mobile === true) return true;
  if (MOBILE_UA.test(navigator.userAgent || "")) return true;
  const coarse = window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(any-pointer: coarse)").matches;
  const screenValues = [window.screen?.width, window.screen?.height]
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
  const shortSide = screenValues.length ? Math.min(...screenValues) : window.innerWidth;
  return window.innerWidth <= MOBILE_BREAKPOINT || (coarse && shortSide <= MOBILE_BREAKPOINT);
}

function responsiveDeviceMode() {
  if (isMobileDevice()) return "mobile";
  if (window.innerWidth <= 1024) return "tablet";
  if (window.innerWidth <= 1440) return "laptop";
  return "desktop";
}

function important(node, property, value) {
  node?.style?.setProperty(property, value, "important");
}

function clear(node, properties) {
  properties.forEach((property) => node?.style?.removeProperty(property));
}

function removeLegacyControls(shell) {
  shell.querySelectorAll(":scope > .sn-mobile-nav, :scope > .sn-mobile-sheet-layer").forEach((node) => node.remove());
  shell.querySelectorAll(":scope > .sn-side > .sn-side-close").forEach((node) => node.remove());
}

function enforceMobile(shell) {
  removeLegacyControls(shell);
  const main = shell.querySelector(":scope > .sn-main");
  const top = main?.querySelector(":scope > .sn-top");
  const side = shell.querySelector(":scope > .sn-side");
  const toggle = top?.querySelector(".sn-icon");

  shell.dataset.runtimeDevice = "mobile";
  shell.dataset.mobileLayoutRelease = MOBILE_LAYOUT_RELEASE;
  important(shell, "padding-bottom", "0");
  important(shell, "width", "100%");
  important(shell, "max-width", "100%");
  important(shell, "overflow-x", "clip");

  important(main, "margin-left", `${MOBILE_RAIL}px`);
  important(main, "width", `calc(100% - ${MOBILE_RAIL}px)`);
  important(main, "max-width", `calc(100% - ${MOBILE_RAIL}px)`);
  important(main, "min-width", "0");
  important(main, "overflow-x", "clip");

  if (top) {
    important(top, "position", "sticky");
    important(top, "top", "0");
    important(top, "left", "auto");
    important(top, "right", "auto");
    important(top, "width", "100%");
    important(top, "max-width", "100%");
  }

  if (side) {
    side.id ||= "ngeblogging-studio-sidebar";
    side.dataset.mobileRail = String(MOBILE_RAIL);
  }

  if (toggle) {
    toggle.setAttribute("aria-controls", side?.id || "ngeblogging-studio-sidebar");
    toggle.dataset.sidebarAuthority = "single";
    toggle.setAttribute("aria-expanded", String(Boolean(side && !side.classList.contains("collapsed"))));
  }

  // Start compact on phones, but keep the icon rail visible. The same React
  // button expands and collapses the panel; no second close button exists.
  if (side && toggle && !shell.dataset.initialMobileRail) {
    shell.dataset.initialMobileRail = "true";
    if (!side.classList.contains("collapsed")) toggle.click();
  }
}

function releaseDesktop(shell) {
  removeLegacyControls(shell);
  delete shell.dataset.runtimeDevice;
  delete shell.dataset.mobileLayoutRelease;
  clear(shell, ["padding-bottom", "width", "max-width", "overflow-x"]);
  const main = shell.querySelector(":scope > .sn-main");
  const top = main?.querySelector(":scope > .sn-top");
  clear(main, ["margin-left", "width", "max-width", "min-width", "overflow-x"]);
  clear(top, ["position", "top", "left", "right", "width", "max-width"]);
}

function apply() {
  const mode = responsiveDeviceMode();
  document.documentElement.dataset.deviceMode = mode;
  document.documentElement.dataset.mobileLayoutRelease = MOBILE_LAYOUT_RELEASE;
  document.querySelectorAll(".sn-shell").forEach((shell) => {
    if (mode === "mobile") enforceMobile(shell);
    else releaseDesktop(shell);
  });
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(apply);
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule);
window.addEventListener("ngeblogging:device-mode", schedule);
schedule();
