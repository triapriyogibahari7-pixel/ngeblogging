export const RELEASE = "studio-responsive-lock-v285-20260805";
export const BREAKPOINT = 761;

let frame = 0;

const root = () => document.documentElement;
const shell = () => document.querySelector(".sn-shell");
const sidebar = () => document.getElementById("ngeblogging-studio-sidebar");
const reactToggle = () => document.querySelector(".sn-main>.sn-top>.sn-sidebar-toggle,.sn-top>.sn-sidebar-toggle");

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

export function responsiveFamily() {
  const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  if (width >= BREAKPOINT) return "large";
  return "small";
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

function safeToggle() {
  const button = reactToggle();
  if (!button || button.disabled) return;
  button.click();
  requestAnimationFrame(schedule);
}

function bindLogo(mark) {
  if (!mark || mark.dataset.v284NativeBound === "true" || mark.dataset.v285Bound === "true") return;
  mark.dataset.v285Bound = "true";
  mark.addEventListener("click", (event) => {
    event.preventDefault();
    safeToggle();
  });
  mark.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    safeToggle();
  });
}

function normalizeSidebar(family) {
  const side = sidebar();
  if (!side) return;
  side.hidden = false;
  side.removeAttribute("hidden");
  side.removeAttribute("aria-hidden");
  side.removeAttribute("inert");
  side.style.removeProperty("filter");
  side.style.removeProperty("backdrop-filter");
  side.style.removeProperty("-webkit-backdrop-filter");

  const mark = side.querySelector(".sn-logo-mark");
  bindLogo(mark);
  if (mark) {
    const expanded = family === "large" ? !side.classList.contains("collapsed") : side.classList.contains("mobile-open");
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    mark.setAttribute("aria-expanded", String(expanded));
    mark.setAttribute("aria-label", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
    const letter = mark.querySelector("strong");
    if (letter) letter.textContent = "n";
  }

  side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button").forEach((button) => {
    button.hidden = false;
    button.disabled = false;
    button.removeAttribute("aria-hidden");
    button.removeAttribute("inert");
  });

  if (family === "large") {
    side.classList.remove("mobile-open");
    document.body.classList.remove("sn-mobile-sidebar-open");
  } else {
    document.body.classList.toggle("sn-mobile-sidebar-open", side.classList.contains("mobile-open"));
  }
}

function normalizeProfile() {
  const avatar = document.querySelector(".sn-top .sn-avatar");
  if (!avatar) return;
  avatar.hidden = false;
  avatar.disabled = false;
  avatar.removeAttribute("aria-hidden");
  avatar.removeAttribute("inert");
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-label", "Buka menu profil");
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.hidden = false;
    launcher.disabled = false;
    launcher.removeAttribute("inert");
    launcher.dataset.v285Floating = "fixed";
  }
  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) return;
  const full = panel.dataset.naraSize === "full";
  layer.dataset.v285Interaction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  const backdrop = layer.querySelector(":scope>.nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.style.pointerEvents = full ? "auto" : "none";
  }
  if (!full) {
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
    document.documentElement.style.removeProperty("overflow");
    document.body.style.removeProperty("overflow");
  }
}

export function sync() {
  frame = 0;
  const app = shell();
  if (!app) return;
  const family = responsiveFamily();
  root().dataset.studioResponsiveLockV285 = RELEASE;
  root().dataset.v285Family = family;
  app.dataset.v285Family = family;
  app.dataset.v285Standalone = String(isStandalone());
  normalizeSidebar(family);
  normalizeProfile();
  normalizeNara();
}

function boot() {
  sync();
  setTimeout(sync, 80);
  setTimeout(sync, 320);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", boot, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
}
