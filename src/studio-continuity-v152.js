const RELEASE = "studio-continuity-v152-20260729";
const SIDEBAR_PREFERENCE_KEY = "ngeblogging-studio-sidebar-v152";
const restoredShells = new WeakSet();
let scheduledFrame = 0;

function readSidebarPreference() {
  try {
    const stored = localStorage.getItem(SIDEBAR_PREFERENCE_KEY);
    return stored === "expanded" || stored === "collapsed" ? stored : "";
  } catch {
    return "";
  }
}

function writeSidebarPreference(value) {
  try {
    localStorage.setItem(SIDEBAR_PREFERENCE_KEY, value);
  } catch {
    // Private browsing or a full storage quota must never break Studio navigation.
  }
}

function currentLayoutMode() {
  return document.documentElement.dataset.studioDeviceMode === "small" ? "small" : "large";
}

function syncSidebarContinuity() {
  const shell = document.querySelector(".sn-shell");
  const sidebar = shell?.querySelector(":scope > .sn-side");
  if (!shell || !sidebar) return;

  const state = sidebar.classList.contains("collapsed") ? "collapsed" : "expanded";
  shell.dataset.sidebarContinuityRelease = RELEASE;
  shell.dataset.sidebarState = state;

  if (currentLayoutMode() === "small") return;

  if (!restoredShells.has(shell)) {
    restoredShells.add(shell);
    const preferred = readSidebarPreference();
    if (preferred && preferred !== state) {
      shell.querySelector(".sn-sidebar-toggle")?.click();
      requestAnimationFrame(scheduleContinuity);
      return;
    }
  }

  writeSidebarPreference(state);
}

function syncNaraInteraction() {
  const layer = document.querySelector(".nara-assistant-layer");
  if (!layer) {
    document.body.classList.remove("nara-nonmodal-open-v152");
    return;
  }

  const shell = layer.querySelector(".nara-assistant-shell");
  if (!shell) return;
  const size = shell.dataset.naraSize || "small";
  const modal = size === "full";

  layer.dataset.naraInteraction = modal ? "modal" : "non-modal";
  layer.dataset.naraContinuityRelease = RELEASE;
  layer.setAttribute("aria-modal", modal ? "true" : "false");
  shell.setAttribute("aria-modal", modal ? "true" : "false");

  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.setAttribute("aria-hidden", modal ? "false" : "true");
    backdrop.tabIndex = modal ? 0 : -1;
  }

  document.body.classList.toggle("nara-nonmodal-open-v152", !modal);
}

function protectResponsiveGeometry() {
  const shell = document.querySelector(".sn-shell");
  if (!shell) return;
  shell.dataset.continuityRelease = RELEASE;

  shell.querySelectorAll([
    ".sn-main",
    ".sn-main > *",
    ".sn-view-pad",
    ".sn-view-pad > *",
    ".sv124-page",
    ".sv124-page > *",
    ".tn-studio",
    ".tn-studio > *",
    ".ce-app",
    ".ce-app > *",
  ].join(",")).forEach((node) => {
    node.style.setProperty("min-width", "0");
    node.style.setProperty("max-width", "100%");
  });
}

function enhanceContinuity() {
  scheduledFrame = 0;
  syncSidebarContinuity();
  syncNaraInteraction();
  protectResponsiveGeometry();
  document.documentElement.dataset.studioContinuityV152 = RELEASE;
}

function scheduleContinuity() {
  if (scheduledFrame) return;
  scheduledFrame = requestAnimationFrame(enhanceContinuity);
}

new MutationObserver(scheduleContinuity).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    "class",
    "data-nara-size",
    "data-studio-device-mode",
    "data-studio-responsive-mode",
    "data-studio-device-variant",
  ],
});

window.addEventListener("resize", scheduleContinuity, { passive: true });
window.addEventListener("orientationchange", scheduleContinuity, { passive: true });
window.addEventListener("pageshow", scheduleContinuity, { passive: true });
window.addEventListener("ngeblogging:studio-device-mode-change", scheduleContinuity);

enhanceContinuity();

export {
  RELEASE,
  SIDEBAR_PREFERENCE_KEY,
  enhanceContinuity,
  syncNaraInteraction,
  syncSidebarContinuity,
};
