import "./studio-screenshot-regression-v319.css";

export const STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319 = "studio-screenshot-regression-v319-20260806";
export const THEME_CODE_LINE_GUIDE_V319 = 10000;

const LINE_GUIDE = Array.from({ length: THEME_CODE_LINE_GUIDE_V319 }, (_, index) => String(index + 1)).join("\n");
let frame = 0;

function hasV312Layout(studio) {
  return Boolean(
    studio?.querySelector(
      ".tn-layout-models-v312,.tn-layout-model-grid-v312,.tn-layout-model-list-v312,[class*=\"tn-layout-models\"][class*=\"v312\"],[class*=\"tn-layout-map\"][class*=\"v312\"],[data-theme-layout-v312]",
    ),
  );
}

function normalizeThemeMap() {
  const studio = document.querySelector(".tn-layout-studio");
  if (!studio) return;

  const v312 = hasV312Layout(studio);
  studio.dataset.themeMapAuthorityV319 = v312 ? "v312-native" : "v264-fallback";

  // v264 is retained as a fallback for an unpatched development source. Once
  // the v312 build-time Theme map exists, showing both maps is the regression
  // visible in the supplied screenshots, so only the native v312 map is shown.
  const legacy = studio.querySelector(":scope > .tn-layout-map-v264");
  if (legacy) {
    legacy.dataset.v319Fallback = v312 ? "hidden-by-v312" : "active";
    legacy.setAttribute("aria-hidden", String(v312));
  }

  studio.querySelectorAll(".tn-layout-models-v312,.tn-layout-model-grid-v312,.tn-layout-model-list-v312,[class*=\"tn-layout-models\"][class*=\"v312\"]")
    .forEach((node) => { node.dataset.v319ModelRows = "separate"; });
}

function normalizeLegacyWidgetLabels() {
  document.querySelectorAll(".tn-layout-popover-v264 [data-widget=\"custom-html\"] span")
    .forEach((node) => {
      if (node.textContent !== "HTML / CSS / JavaScript") node.textContent = "HTML / CSS / JavaScript";
    });
}

function installFallbackLineGuide(pane) {
  if (!pane || pane.dataset.v319LineGuide === "ready") return;
  if (pane.querySelector('[data-theme-code-v312="line-numbers-10000"],.tn-code-gutter-v312,.tn-code-gutter-v265')) {
    pane.dataset.v319LineGuide = "native-v312";
    return;
  }

  const textarea = pane.querySelector(":scope > textarea");
  if (!textarea) return;

  let gutter = pane.querySelector(":scope > .tn-code-gutter-v319");
  if (!gutter) {
    gutter = document.createElement("pre");
    gutter.className = "tn-code-gutter-v319";
    gutter.dataset.themeCodeV319 = "line-numbers-10000";
    gutter.setAttribute("aria-hidden", "true");
    gutter.textContent = LINE_GUIDE;
    textarea.insertAdjacentElement("beforebegin", gutter);
  }

  pane.classList.add("tn-code-pane-v319");
  pane.dataset.v319LineGuide = "ready";

  const syncScroll = () => { gutter.scrollTop = textarea.scrollTop; };
  textarea.addEventListener("scroll", syncScroll, { passive: true });
  syncScroll();
}

function normalizeCodeEditor() {
  document.querySelectorAll(".tn-code-pane").forEach(installFallbackLineGuide);
  document.querySelectorAll(".tn-modal.fullscreen,.tn-modal.preview").forEach((modal) => {
    modal.dataset.viewportSafeV319 = "true";
    const body = modal.querySelector(":scope > .tn-modal-body");
    if (body) body.dataset.viewportSafeV319 = "true";
  });
}

function normalizeOnboarding() {
  const onboarding = document.querySelector(".so75-startup,.so75-onboarding,.so75-first-site,[data-first-site-guard-v305]");
  if (onboarding) onboarding.dataset.stableSurfaceV319 = "true";
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) launcher.dataset.fixedCornerV319 = "true";
  const shell = document.querySelector(".nara-assistant-shell[data-nara-size]");
  if (shell) shell.dataset.geometryV319 = shell.dataset.naraSize || "small";
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioScreenshotRegressionV319 = STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319;
  normalizeThemeMap();
  normalizeLegacyWidgetLabels();
  normalizeCodeEditor();
  normalizeOnboarding();
  normalizeNara();
}

function schedule(delay = 0) {
  if (delay) {
    window.setTimeout(() => schedule(), delay);
    return;
  }
  if (frame) return;
  frame = window.requestAnimationFrame(sync);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", () => {
    schedule();
    schedule(90);
  }, { passive: true });
  window.addEventListener("pageshow", () => schedule(), { passive: true });
  window.addEventListener("resize", () => schedule(), { passive: true });
  window.addEventListener("orientationchange", () => schedule(60), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule(), { passive: true });
  window.addEventListener("ngeblogging:active-site-change", () => schedule(30), { passive: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => schedule(), { once: true });
  else schedule();
  schedule(300);
  schedule(900);
}
