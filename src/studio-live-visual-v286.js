import "./studio-live-visual-v286.css";

export const RELEASE = "studio-live-visual-v286-20260805";
export const BREAKPOINT = 761;

let frame = 0;

const shell = () => document.querySelector(".sn-shell");
const sidebar = () => document.getElementById("ngeblogging-studio-sidebar");

export function liveFamily() {
  const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  return width >= BREAKPOINT ? "large" : "small";
}

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("aria-hidden");
  node.removeAttribute("inert");
}

function normalizeSidebar(family) {
  const side = sidebar();
  if (!side) return;
  reveal(side);
  side.style.removeProperty("filter");
  side.style.removeProperty("backdrop-filter");
  side.style.removeProperty("-webkit-backdrop-filter");

  const mark = side.querySelector(".sn-logo-mark");
  reveal(mark);
  const letter = mark?.querySelector("strong");
  if (letter) {
    letter.textContent = "n";
    letter.style.removeProperty("opacity");
    letter.style.removeProperty("filter");
  }
  if (mark) {
    const expanded = family === "large" ? !side.classList.contains("collapsed") : side.classList.contains("mobile-open");
    mark.setAttribute("aria-expanded", String(expanded));
    mark.setAttribute("aria-label", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
    mark.setAttribute("title", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
  }

  side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button").forEach((button) => {
    reveal(button);
    button.disabled = false;
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
  reveal(avatar);
  avatar.disabled = false;
  avatar.style.removeProperty("display");
  avatar.style.removeProperty("visibility");
  avatar.style.removeProperty("opacity");
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    reveal(launcher);
    launcher.disabled = false;
    launcher.dataset.v286Floating = "viewport-fixed";
  }

  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) return;
  const full = panel.dataset.naraSize === "full";
  layer.dataset.v286Interaction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  const backdrop = layer.querySelector(":scope>.nara-assistant-backdrop");
  if (backdrop && !full) {
    backdrop.hidden = true;
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.style.pointerEvents = "none";
  }
  panel.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.model,.nara-select.intelligence,.nara-attachment-menu-wrap").forEach(reveal);
  if (!full) {
    document.documentElement.style.removeProperty("overflow");
    document.body.style.removeProperty("overflow");
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
  }
}

function normalizeContainment() {
  document.querySelectorAll(".sn-main,.sn-main>*,.sn-view-pad,.sn-view-pad>*,.sn-content-card,.sn-content-card>*,.tn-studio,.tn-studio>*,.tn-layout-studio,.tn-code-workspace,.tn-code-pane,.tn-code-preview-pane,.sv124-page,.sv124-page>*,.op41-panel,.op41-panel>*").forEach((node) => {
    node.style.setProperty("min-width", "0");
    node.style.setProperty("max-width", "100%");
  });
}

export function sync() {
  frame = 0;
  const app = shell();
  if (!app) return;
  const family = liveFamily();
  document.documentElement.dataset.studioLiveVisualV286 = RELEASE;
  app.dataset.v286Family = family;
  normalizeSidebar(family);
  normalizeProfile();
  normalizeNara();
  normalizeContainment();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
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
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
}

/* v287 owns profile/logo interaction; v288 is loaded after it as the final geometry authority. */
import("./studio-react-shell-v287.js")
  .then(() => import("./studio-final-authority-v288.js"))
  .catch((error) => console.error("Studio v288 authority failed to load", error));
