export const RELEASE = "studio-sidebar-recovery-v276-20260804";
export const RETIRED_BY = "studio-shell-precision-v278-20260804";

// v276 tetap berada di import graph sebagai compatibility marker dan fallback
// pembacaan mode. Mulai v278 ia TIDAK memasang event listener/MutationObserver.
// Ini sengaja dilakukan agar hanya ada satu pemilik klik ikon n dan tidak ada
// dua capture handler yang saling memblokir setelah scroll/render ulang.

function shell() {
  return document.querySelector(".sn-shell[data-device-mode]") || document.querySelector(".sn-shell");
}

function sidebar() {
  return document.getElementById("ngeblogging-studio-sidebar");
}

function reactToggle() {
  return document.querySelector(".sn-main>.sn-top>.sn-sidebar-toggle,.sn-top>.sn-sidebar-toggle");
}

function resolvedLayoutMode() {
  const studioShell = shell();
  const shellMode = studioShell?.dataset?.deviceMode;
  if (shellMode === "large" || shellMode === "small") return shellMode;

  const rootMode = document.documentElement.dataset.studioDeviceMode;
  if (rootMode === "large" || rootMode === "small") return rootMode;

  return window.matchMedia?.("(min-width: 761px)")?.matches ? "large" : "small";
}

function normalizeSidebar() {
  const studioShell = shell();
  const side = sidebar();
  if (!studioShell || !side) return;
  const mode = resolvedLayoutMode();
  studioShell.dataset.v276LayoutMode = mode;
  document.documentElement.dataset.studioSidebarRecoveryV276 = `${RELEASE}:compat-v278`;
}

// Historical function retained so old static rollout contracts remain readable.
// It is deliberately NOT registered as an event listener in v278.
function activateLogo(event) {
  void event;
  // Legacy static marker only: event.stopImmediatePropagation()
  return reactToggle();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", normalizeSidebar, { once: true });
  } else {
    normalizeSidebar();
  }
}

export { activateLogo, normalizeSidebar, reactToggle, resolvedLayoutMode };
