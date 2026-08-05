import "./studio-sidebar-hard-lock-v301.css";

export const STUDIO_SIDEBAR_HARD_LOCK_RELEASE_V301 = "studio-sidebar-hard-lock-v301-20260805";
export const STUDIO_SIDEBAR_GEOMETRY_OWNER_V301 = "studio-sidebar-inline-geometry-owner-v301";

const SMALL_RESPONSIVE = new Set(["application", "phone", "mobile", "compact"]);
const LARGE_RESPONSIVE = new Set(["tablet", "desktop"]);
let frame = 0;

const root = () => document.documentElement;
const shell = () => document.querySelector(".sn-shell");
const sidebar = () => document.getElementById("ngeblogging-studio-sidebar");
const main = () => document.querySelector(".sn-shell>.sn-main");

function mobileUa() {
  if (navigator.userAgentData?.mobile === true) return true;
  return /\bMobile\b|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "");
}

function physicalShortSide() {
  const width = Number(window.screen?.width || window.innerWidth || 0);
  const height = Number(window.screen?.height || window.innerHeight || 0);
  const density = Math.max(1, Number(window.devicePixelRatio || 1));
  const normalized = [width, height].map((value) => value > 900 && density >= 1.25 ? value / density : value);
  return Math.min(...normalized.filter((value) => Number.isFinite(value) && value > 0), 9999);
}

function family() {
  const responsive = root().dataset.studioResponsiveMode || "";
  const explicitDesktopSite = root().dataset.studioDesktopSitePhone === "true";

  // A real mobile UA on a phone must never inherit the old desktop rail merely
  // because Chrome reports a transient desktop-like layout viewport.
  if (!explicitDesktopSite && mobileUa() && physicalShortSide() <= 760) return "small";
  if (SMALL_RESPONSIVE.has(responsive)) return "small";
  if (LARGE_RESPONSIVE.has(responsive)) return "large";
  return root().dataset.studioDeviceMode === "large" || shell()?.dataset.deviceMode === "large" ? "large" : "small";
}

function important(node, property, value) {
  if (!node) return;
  node.style.setProperty(property, value, "important");
}

function show(node, display = "") {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("inert");
  node.removeAttribute("aria-hidden");
  important(node, "visibility", "visible");
  important(node, "opacity", "1");
  important(node, "pointer-events", "auto");
  if (display) important(node, "display", display);
}

function hide(node) {
  if (!node) return;
  important(node, "display", "none");
  important(node, "visibility", "hidden");
  important(node, "pointer-events", "none");
}

function exposeMenu(side) {
  const logo = side.querySelector(":scope>.sn-logo");
  const brand = side.querySelector(":scope>.sn-logo>b");
  const create = side.querySelector(":scope>.sn-new");
  const nav = side.querySelector(":scope>nav");
  const footer = side.querySelector(":scope>.sn-account-footer");
  show(logo, "flex");
  show(brand, "block");
  show(create, "flex");
  show(nav, "flex");
  show(footer, "flex");
  important(nav, "flex-direction", "column");
  important(nav, "gap", "2px");
  important(nav, "overflow-y", "auto");
  important(nav, "overflow-x", "hidden");
  important(footer, "flex-direction", "column");
  side.querySelectorAll(":scope>.sn-new, :scope>nav>button, :scope>.sn-account-footer>button").forEach((button) => {
    show(button, "flex");
    important(button, "width", "100%");
    important(button, "min-height", "39px");
    important(button, "justify-content", "flex-start");
    important(button, "margin", "0");
    important(button, "min-width", "0");
    const span = button.querySelector(":scope>span");
    if (span) {
      show(span, "inline");
      important(span, "white-space", "nowrap");
    }
  });
}

function collapseToRail(side) {
  const brand = side.querySelector(":scope>.sn-logo>b");
  hide(brand);
  side.querySelectorAll(":scope>.sn-new, :scope>nav>button, :scope>.sn-account-footer>button").forEach((button) => {
    show(button, "grid");
    important(button, "place-items", "center");
    important(button, "width", "46px");
    important(button, "padding", "0");
    important(button, "margin-left", "auto");
    important(button, "margin-right", "auto");
    const span = button.querySelector(":scope>span");
    if (span) hide(span);
  });
}

function syncMark(side, isOpen) {
  const mark = side.querySelector(".sn-logo-mark");
  if (!mark) return;
  show(mark, "grid");
  important(mark, "place-items", "center");
  important(mark, "width", "46px");
  important(mark, "height", "46px");
  important(mark, "min-width", "46px");
  important(mark, "min-height", "46px");
  important(mark, "margin", "0");
  important(mark, "padding", "0");
  important(mark, "position", "relative");
  important(mark, "transform", "none");
  important(mark, "filter", "none");
  mark.dataset.v301GeometryOwner = STUDIO_SIDEBAR_GEOMETRY_OWNER_V301;
  mark.setAttribute("role", "button");
  mark.setAttribute("tabindex", "0");
  mark.setAttribute("aria-expanded", String(isOpen));
  mark.setAttribute("aria-label", isOpen ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
  const letter = mark.querySelector("strong");
  if (letter) {
    letter.textContent = "n";
    show(letter, "grid");
    important(letter, "place-items", "center");
    important(letter, "width", "100%");
    important(letter, "height", "100%");
    important(letter, "color", "#fff");
    important(letter, "-webkit-text-fill-color", "#fff");
    important(letter, "font-size", "25px");
    important(letter, "line-height", "1");
  }
}

function applySmall(sh, side, content) {
  const open = side.classList.contains("mobile-open");
  sh.dataset.deviceMode = "small";
  root().dataset.studioDeviceMode = "small";
  root().dataset.studioSidebarHardLockFamilyV301 = "small";

  [document.documentElement, document.body, document.getElementById("root"), sh, content].filter(Boolean).forEach((node) => {
    important(node, "max-width", "100%");
    important(node, "box-sizing", "border-box");
  });
  important(sh, "position", "relative");
  important(sh, "left", "0");
  important(sh, "margin", "0");
  important(sh, "padding", "0");
  important(sh, "width", "100%");
  important(sh, "overflow-x", "hidden");

  important(content, "position", "relative");
  important(content, "left", "0");
  important(content, "margin-left", "0");
  important(content, "margin-right", "0");
  important(content, "padding-left", "0");
  important(content, "width", "100%");
  important(content, "max-width", "100%");
  important(content, "transform", "none");

  show(side, "flex");
  important(side, "position", "fixed");
  important(side, "left", "max(8px, env(safe-area-inset-left, 0px))");
  important(side, "top", "max(8px, env(safe-area-inset-top, 0px))");
  important(side, "right", "auto");
  important(side, "z-index", open ? "12150" : "12100");
  important(side, "transform", "none");
  important(side, "filter", "none");

  if (open) {
    important(side, "inset", "0 auto 0 0");
    important(side, "width", "min(78vw, 336px)");
    important(side, "min-width", "min(78vw, 336px)");
    important(side, "max-width", "min(78vw, 336px)");
    important(side, "height", "100dvh");
    important(side, "max-height", "100dvh");
    important(side, "padding", "max(10px, env(safe-area-inset-top, 0px)) 8px max(10px, env(safe-area-inset-bottom, 0px))");
    important(side, "overflow", "hidden");
    important(side, "background", "#fff");
    important(side, "border-right", "1px solid #dfe6ef");
    important(side, "border-radius", "0 18px 18px 0");
    important(side, "box-shadow", "14px 0 42px rgba(21,40,70,.18)");
    exposeMenu(side);
  } else {
    important(side, "inset", "auto");
    important(side, "left", "max(8px, env(safe-area-inset-left, 0px))");
    important(side, "top", "max(8px, env(safe-area-inset-top, 0px))");
    important(side, "width", "54px");
    important(side, "min-width", "54px");
    important(side, "max-width", "54px");
    important(side, "height", "54px");
    important(side, "min-height", "54px");
    important(side, "max-height", "54px");
    important(side, "padding", "4px");
    important(side, "overflow", "visible");
    important(side, "background", "transparent");
    important(side, "border", "0");
    important(side, "box-shadow", "none");
    const logo = side.querySelector(":scope>.sn-logo");
    show(logo, "grid");
    important(logo, "place-items", "center");
    important(logo, "width", "46px");
    important(logo, "height", "46px");
    hide(side.querySelector(":scope>.sn-logo>b"));
    hide(side.querySelector(":scope>.sn-new"));
    hide(side.querySelector(":scope>nav"));
    hide(side.querySelector(":scope>.sn-account-footer"));
  }

  syncMark(side, open);
  document.querySelectorAll(".sn-side-backdrop").forEach(hide);
  [document.documentElement, document.body].forEach((node) => {
    important(node, "filter", "none");
    important(node, "backdrop-filter", "none");
    important(node, "-webkit-backdrop-filter", "none");
  });
}

function applyLarge(sh, side, content) {
  const collapsed = side.classList.contains("collapsed");
  sh.dataset.deviceMode = "large";
  root().dataset.studioDeviceMode = "large";
  root().dataset.studioSidebarHardLockFamilyV301 = "large";

  show(side, "flex");
  important(side, "position", "fixed");
  important(side, "inset", "0 auto 0 0");
  important(side, "z-index", "4300");
  important(side, "width", collapsed ? "70px" : "220px");
  important(side, "min-width", collapsed ? "70px" : "220px");
  important(side, "max-width", collapsed ? "70px" : "220px");
  important(side, "height", "100dvh");
  important(side, "padding", "10px 8px");
  important(side, "overflow", "hidden");
  important(side, "background", "#fff");
  important(side, "border-right", "1px solid #dfe6ef");
  important(side, "transform", "none");
  important(side, "filter", "none");

  important(content, "position", "relative");
  important(content, "left", "0");
  important(content, "margin-left", collapsed ? "70px" : "220px");
  important(content, "padding-left", "0");
  important(content, "width", collapsed ? "calc(100% - 70px)" : "calc(100% - 220px)");
  important(content, "max-width", collapsed ? "calc(100% - 70px)" : "calc(100% - 220px)");
  important(content, "transform", "none");

  exposeMenu(side);
  if (collapsed) collapseToRail(side);
  syncMark(side, !collapsed);
}

function pinSupportingSurfaces() {
  const top = document.querySelector(".sn-shell>.sn-main>.sn-top");
  if (top) {
    important(top, "max-width", "100%");
    important(top, "box-sizing", "border-box");
  }
  const avatar = document.querySelector(".sn-top .sn-avatar");
  if (avatar) show(avatar, "grid");
  const nara = document.querySelector(".nara-floating-button");
  if (nara) {
    show(nara, "grid");
    important(nara, "position", "fixed");
    important(nara, "right", "max(10px, env(safe-area-inset-right, 0px))");
    important(nara, "bottom", "max(10px, calc(env(safe-area-inset-bottom, 0px) + 8px))");
    important(nara, "left", "auto");
    important(nara, "top", "auto");
    important(nara, "z-index", "11900");
    important(nara, "transform", "none");
    important(nara, "animation", "none");
  }
}

export function syncStudioSidebarHardLockV301() {
  frame = 0;
  const sh = shell();
  const side = sidebar();
  const content = main();
  if (!sh || !side || !content) return false;
  root().dataset.studioSidebarHardLockV301 = STUDIO_SIDEBAR_HARD_LOCK_RELEASE_V301;
  side.dataset.v301GeometryOwner = STUDIO_SIDEBAR_GEOMETRY_OWNER_V301;
  if (family() === "small") applySmall(sh, side, content);
  else applyLarge(sh, side, content);
  pinSupportingSurfaces();
  return true;
}

function schedule(delay = 0) {
  if (delay > 0) {
    window.setTimeout(() => schedule(), delay);
    return;
  }
  if (frame) return;
  frame = requestAnimationFrame(syncStudioSidebarHardLockV301);
}

function boot(attempt = 0) {
  if (syncStudioSidebarHardLockV301()) return;
  if (attempt >= 7) return;
  window.setTimeout(() => boot(attempt + 1), [20,50,100,180,320,560,900,1400][attempt] || 560);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", () => { schedule(); schedule(70); }, false);
  window.addEventListener("resize", () => schedule(30), { passive:true });
  window.addEventListener("orientationchange", () => schedule(70), { passive:true });
  window.addEventListener("pageshow", () => boot(), { passive:true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule());
  window.addEventListener("ngeblogging:auth-session-ready", () => schedule(30));
  window.addEventListener("ngeblogging:auth-callback-complete", () => schedule(30));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => boot(), { once:true });
  else boot();
}
