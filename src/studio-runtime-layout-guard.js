const MOBILE_LAYOUT_RELEASE = "studio-mobile-v4-20260724";
const MOBILE_BREAKPOINT = 760;
const MOBILE_UA = /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i;

function isMobileDevice() {
  if (navigator.userAgentData?.mobile === true) return true;
  if (MOBILE_UA.test(navigator.userAgent || "")) return true;
  const coarse = window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(any-pointer: coarse)").matches;
  const screenValues = [window.screen?.width, window.screen?.height].map(Number).filter((value) => Number.isFinite(value) && value > 0);
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

function enforceMobile(shell) {
  const nav = shell.querySelector(":scope > .sn-mobile-nav");
  const main = shell.querySelector(":scope > .sn-main");
  const top = main?.querySelector(":scope > .sn-top");
  const side = shell.querySelector(":scope > .sn-side");
  const toggle = top?.querySelector(".sn-icon");

  shell.dataset.runtimeDevice = "mobile";
  shell.dataset.mobileLayoutRelease = MOBILE_LAYOUT_RELEASE;
  important(shell, "padding-bottom", "calc(82px + env(safe-area-inset-bottom))");
  important(shell, "width", "100%");
  important(shell, "max-width", "100%");
  important(shell, "overflow-x", "hidden");

  important(main, "margin-left", "0");
  important(main, "width", "100%");
  important(main, "max-width", "100%");
  important(main, "min-width", "0");
  important(main, "overflow-x", "hidden");

  if (top) {
    important(top, "position", "sticky");
    important(top, "top", "0");
    important(top, "left", "0");
    important(top, "right", "0");
    important(top, "width", "100%");
    important(top, "max-width", "100%");
  }

  if (nav) {
    important(nav, "display", "grid");
    important(nav, "position", "fixed");
    important(nav, "top", "auto");
    important(nav, "inset-block-start", "auto");
    important(nav, "bottom", "0");
    important(nav, "left", "0");
    important(nav, "right", "0");
    important(nav, "width", "100%");
    important(nav, "height", "auto");
    important(nav, "margin", "0");
    important(nav, "transform", "translate3d(0,0,0)");
    important(nav, "z-index", "4000");
  }

  side?.querySelectorAll(":scope > .sn-side-close").forEach((node) => node.remove());
  if (side && toggle && !side.classList.contains("collapsed")) toggle.click();
}

function releaseDesktop(shell) {
  delete shell.dataset.runtimeDevice;
  delete shell.dataset.mobileLayoutRelease;
  clear(shell, ["padding-bottom", "width", "max-width", "overflow-x"]);
  const main = shell.querySelector(":scope > .sn-main");
  const top = main?.querySelector(":scope > .sn-top");
  const nav = shell.querySelector(":scope > .sn-mobile-nav");
  clear(main, ["margin-left", "width", "max-width", "min-width", "overflow-x"]);
  clear(top, ["position", "top", "left", "right", "width", "max-width"]);
  clear(nav, ["display", "position", "top", "inset-block-start", "bottom", "left", "right", "width", "height", "margin", "transform", "z-index"]);
}

function apply() {
  const mode = responsiveDeviceMode();
  document.documentElement.dataset.deviceMode = mode;
  document.documentElement.dataset.mobileLayoutRelease = MOBILE_LAYOUT_RELEASE;
  document.querySelectorAll(".sn-shell").forEach((shell) => mode === "mobile" ? enforceMobile(shell) : releaseDesktop(shell));
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
