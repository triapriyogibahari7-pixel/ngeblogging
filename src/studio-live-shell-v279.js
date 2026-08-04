export const RELEASE = "studio-live-shell-v279-20260804";
export const RETIRED_LIVE_OBSERVERS_BY = "studio-native-shell-v280-20260804";

let bootPass = 0;
const BOOT_PASSES = 2;

function root() { return document.documentElement; }
function shell() { return document.querySelector(".sn-shell[data-device-mode]") || document.querySelector(".sn-shell"); }
function sidebar() { return document.getElementById("ngeblogging-studio-sidebar"); }

function layoutMode() {
  const shellMode = shell()?.dataset?.deviceMode;
  if (shellMode === "small" || shellMode === "large") return shellMode;
  const rootMode = root().dataset.studioDeviceMode;
  if (rootMode === "small" || rootMode === "large") return rootMode;
  return window.matchMedia?.("(min-width:761px)")?.matches ? "large" : "small";
}

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("aria-hidden");
  node.removeAttribute("inert");
}

function resetContainingBlocks() {
  for (const node of [root(), document.body, document.getElementById("root"), shell()]) {
    if (!node) continue;
    node.style.setProperty("transform", "none", "important");
    node.style.setProperty("filter", "none", "important");
    node.style.setProperty("perspective", "none", "important");
    node.style.setProperty("contain", "none", "important");
    node.style.setProperty("will-change", "auto", "important");
  }
}

function normalizeSidebar() {
  const side = sidebar();
  const app = shell();
  if (!side || !app) return;
  const mode = layoutMode();
  const small = mode === "small";
  const open = small && side.classList.contains("mobile-open");

  app.dataset.v279LayoutMode = mode;
  reveal(side);
  side.style.setProperty("display", "flex", "important");
  side.style.setProperty("visibility", "visible", "important");
  side.style.setProperty("opacity", "1", "important");
  side.style.setProperty("pointer-events", "auto", "important");
  side.style.setProperty("filter", "none", "important");
  side.style.setProperty("backdrop-filter", "none", "important");
  side.style.setProperty("-webkit-backdrop-filter", "none", "important");

  const mark = side.querySelector(".sn-logo-mark");
  reveal(mark);
  if (mark) {
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    mark.setAttribute("aria-expanded", String(small ? open : !side.classList.contains("collapsed")));
    const label = small
      ? (open ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging")
      : (side.classList.contains("collapsed") ? "Buka sidebar Ngeblogging" : "Ciutkan sidebar Ngeblogging");
    mark.setAttribute("aria-label", label);
    mark.setAttribute("title", label);
    const letter = mark.querySelector("strong");
    if (letter) {
      letter.textContent = "n";
      letter.style.setProperty("color", "#fff", "important");
      letter.style.setProperty("-webkit-text-fill-color", "#fff", "important");
      letter.style.setProperty("opacity", "1", "important");
    }
  }

  side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button").forEach((button) => {
    reveal(button);
    button.disabled = false;
  });
}

function normalizeTopbar() {
  const top = document.querySelector(".sn-main>.sn-top");
  const avatar = top?.querySelector(".sn-avatar");
  if (!top) return;
  reveal(top);
  top.style.setProperty("visibility", "visible", "important");
  top.style.setProperty("opacity", "1", "important");
  if (avatar) {
    reveal(avatar);
    avatar.disabled = false;
    avatar.setAttribute("aria-haspopup", "menu");
    avatar.setAttribute("aria-label", "Buka menu profil");
  }
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    reveal(launcher);
    launcher.disabled = false;
    launcher.dataset.v279ViewportFixed = "true";
    launcher.style.setProperty("position", "fixed", "important");
    launcher.style.setProperty("right", "max(10px, env(safe-area-inset-right, 0px))", "important");
    launcher.style.setProperty("bottom", "max(14px, calc(env(safe-area-inset-bottom, 0px) + 10px))", "important");
    launcher.style.setProperty("left", "auto", "important");
    launcher.style.setProperty("top", "auto", "important");
    launcher.style.setProperty("transform", "none", "important");
    launcher.style.setProperty("animation", "none", "important");
  }

  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) return;
  const full = panel.dataset.naraSize === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";

  if (!full) {
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
    for (const node of [root(), document.body, document.getElementById("root"), shell(), document.querySelector(".sn-main")]) {
      node?.removeAttribute?.("inert");
      node?.style?.removeProperty?.("pointer-events");
      node?.style?.removeProperty?.("overflow");
      node?.style?.removeProperty?.("touch-action");
    }
  }
}

function sync() {
  root().dataset.studioLiveShellV279 = `${RELEASE}:compat-v280`;
  resetContainingBlocks();
  normalizeSidebar();
  normalizeTopbar();
  normalizeNara();
}

function start() {
  sync();
  const pulse = () => {
    sync();
    bootPass += 1;
    if (bootPass < BOOT_PASSES) setTimeout(pulse, 160);
  };
  setTimeout(pulse, 70);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  // Compatibility boot only. v280 owns live resize/orientation/device-mode synchronization.
  // No scroll listener, no visualViewport scroll listener, no MutationObserver.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
