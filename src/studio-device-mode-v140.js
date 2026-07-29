const RELEASE = "studio-device-mode-v140-20260729";
const MODE_EVENT = "ngeblogging:studio-device-mode-change";
const COMPACT_MAX = 820;
const LAYOUT_NODES = [
  ".sn-shell",
  ".sn-shell > .sn-side",
  ".sn-shell > .sn-main",
  ".sn-shell > .sn-main > .sn-top",
  ".sn-shell > .sn-side-backdrop",
  ".sn-shell .sn-sidebar-toggle",
];
const LEGACY_INLINE_PROPERTIES = [
  "inset", "top", "right", "bottom", "left",
  "width", "min-width", "max-width", "height", "min-height", "max-height",
  "margin", "margin-left", "margin-right", "padding-left", "padding-right",
  "transform", "translate", "scale", "filter", "backdrop-filter", "-webkit-backdrop-filter",
  "opacity", "visibility", "display", "position", "z-index", "overflow", "overflow-x",
];

let frame = 0;
let cleanupFrame = 0;

function layoutWidth() {
  return Math.max(
    1,
    Number(document.documentElement.clientWidth)
      || Number(window.innerWidth)
      || 1,
  );
}

function surfaceMode() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches
    || window.navigator.standalone === true
    ? "application"
    : "browser";
}

export function detectStudioDeviceMode() {
  return layoutWidth() <= COMPACT_MAX ? "small" : "large";
}

export function currentStudioDeviceMode() {
  return document.documentElement.dataset.studioDeviceMode || detectStudioDeviceMode();
}

function clearLegacyInlineLayout() {
  cleanupFrame = 0;
  const shell = document.querySelector(".sn-shell");
  if (!shell) return;

  for (const selector of LAYOUT_NODES) {
    document.querySelectorAll(selector).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      for (const property of LEGACY_INLINE_PROPERTIES) node.style.removeProperty(property);
    });
  }

  shell.dataset.navigationOwner = "react-v140";
  shell.dataset.layoutAuthority = RELEASE;
  shell.querySelectorAll([
    ".sn-mobile-v30-header",
    ".sn-mobile-v30-search",
    ".sn-mobile-v30-launcher",
    ".sn-mobile-v30-scrim",
    ".sn-mobile-v29-header",
    ".sn-mobile-v29-search",
    ".sn-mobile-v29-launcher",
    ".sn-mobile-v29-scrim",
    ".sn-sidebar-scrim-v23",
    ".sn-device-toggle-v26",
    ".sn-device-toggle-v27",
    ".sn-device-scrim-v27",
    ".sn-mobile-nav",
    ".sn-mobile-sheet-layer",
  ].join(",")).forEach((node) => node.remove());
}

function scheduleLegacyCleanup() {
  if (cleanupFrame) return;
  cleanupFrame = requestAnimationFrame(clearLegacyInlineLayout);
}

function applyDeviceMode() {
  frame = 0;
  const root = document.documentElement;
  const previous = root.dataset.studioDeviceMode || "";
  const mode = detectStudioDeviceMode();
  const width = layoutWidth();

  root.dataset.studioDeviceMode = mode;
  root.dataset.studioSurfaceMode = surfaceMode();
  root.dataset.studioDeviceRelease = RELEASE;
  root.dataset.studioNavigationAuthority = "react-v140";
  root.style.setProperty("--studio-layout-width", `${width}px`);

  scheduleLegacyCleanup();

  if (previous !== mode) {
    window.dispatchEvent(new CustomEvent(MODE_EVENT, {
      detail: { mode, previous, release: RELEASE, width },
    }));
  }
}

function schedule() {
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(applyDeviceMode);
}

const media = window.matchMedia?.(`(max-width:${COMPACT_MAX}px)`);
media?.addEventListener?.("change", schedule);
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });

const observer = new MutationObserver((mutations) => {
  if (mutations.some((mutation) => {
    if (mutation.type === "childList") return mutation.addedNodes.length > 0;
    return mutation.type === "attributes" && mutation.attributeName === "style";
  })) scheduleLegacyCleanup();
});
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["style"],
});

applyDeviceMode();

export { RELEASE, MODE_EVENT, COMPACT_MAX };
