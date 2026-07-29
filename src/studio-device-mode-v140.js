const RELEASE = "studio-device-mode-v141-20260729";
const MODE_EVENT = "ngeblogging:studio-device-mode-change";
const COMPACT_MAX = 820;
const HANDHELD_MAX = 820;
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
const LEGACY_NODES = [
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
  ".sn-comments-nav-host-v93",
  ".sn-comments-page-host-v93",
  "#ngeblogging-api-keys-nav-v135",
  "#ngeblogging-api-keys-v135",
  ".sn-v139-forced-backdrop",
];

let frame = 0;
let cleanupFrame = 0;

function positive(value, fallback = Number.POSITIVE_INFINITY) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function viewportProfile() {
  const layoutWidth = positive(document.documentElement.clientWidth || window.innerWidth, 1);
  const layoutHeight = positive(document.documentElement.clientHeight || window.innerHeight, 1);
  const visualWidth = positive(window.visualViewport?.width, layoutWidth);
  const visualHeight = positive(window.visualViewport?.height, layoutHeight);
  const screenWidth = positive(window.screen?.width, layoutWidth);
  const screenHeight = positive(window.screen?.height, layoutHeight);
  return {
    layoutWidth,
    layoutHeight,
    visualWidth,
    visualHeight,
    screenWidth,
    screenHeight,
    effectiveWidth: Math.min(layoutWidth, visualWidth),
    physicalShortSide: Math.min(screenWidth, screenHeight),
  };
}

function handheldSignal() {
  return navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(
      navigator.userAgent || "",
    )
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
  const profile = viewportProfile();
  const compactViewport = profile.effectiveWidth <= COMPACT_MAX;
  const physicalHandheld = handheldSignal() && profile.physicalShortSide <= HANDHELD_MAX;
  return compactViewport || physicalHandheld ? "small" : "large";
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

  shell.dataset.navigationOwner = "react-v138";
  shell.dataset.navigationAuthority = "react-v141";
  shell.dataset.layoutAuthority = RELEASE;
  shell.removeAttribute("data-v139-forced-mobile-open");
  shell.querySelectorAll(LEGACY_NODES.join(",")).forEach((node) => node.remove());
}

function scheduleLegacyCleanup() {
  if (cleanupFrame) return;
  cleanupFrame = requestAnimationFrame(clearLegacyInlineLayout);
}

function applyDeviceMode() {
  frame = 0;
  const root = document.documentElement;
  const previous = root.dataset.studioDeviceMode || "";
  const profile = viewportProfile();
  const mode = detectStudioDeviceMode();

  root.dataset.studioDeviceMode = mode;
  root.dataset.studioSurfaceMode = surfaceMode();
  root.dataset.studioDeviceRelease = RELEASE;
  root.dataset.studioNavigationAuthority = "react-v141";
  root.dataset.studioHandheldSignal = String(handheldSignal());
  root.dataset.studioDesktopSitePhone = String(
    mode === "small" && profile.layoutWidth > COMPACT_MAX,
  );
  root.style.setProperty("--studio-layout-width", `${profile.layoutWidth}px`);
  root.style.setProperty("--studio-layout-height", `${profile.layoutHeight}px`);
  root.style.setProperty("--studio-visual-width", `${profile.visualWidth}px`);
  root.style.setProperty("--studio-visual-height", `${profile.visualHeight}px`);

  if (mode === "large") document.body?.classList.remove("sn-mobile-sidebar-open");
  scheduleLegacyCleanup();

  if (previous !== mode) {
    window.dispatchEvent(new CustomEvent(MODE_EVENT, {
      detail: { mode, previous, release: RELEASE, profile },
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

export { RELEASE, MODE_EVENT, COMPACT_MAX, HANDHELD_MAX };
