import "./studio-theme-domain-v321.css";

export const STUDIO_THEME_DOMAIN_RELEASE_V321 = "studio-theme-domain-v321-20260806";

let scheduledFrame = 0;

function markThemeModels(studio) {
  const buttons = [...studio.querySelectorAll("button,[role='button']")];
  const modelButtons = buttons.filter((node) => /model\s+(editorial|majalah)/i.test(String(node.textContent || "")));
  for (const button of modelButtons) {
    const model = button.closest("[class*='tn-layout-model']") || button.parentElement;
    if (!model) continue;
    model.dataset.themeModelV321 = "true";
    const rows = model.parentElement;
    if (rows) rows.dataset.themeModelRowsV321 = "true";
  }
}

function markThemeMaps(studio) {
  const maps = [...studio.querySelectorAll(
    "[data-theme-layout-v312],[class*='tn-layout-map'][class*='v312']",
  )];
  for (const map of maps) {
    map.dataset.themeMapV321 = "detail";
    const shell = map.parentElement;
    if (shell) shell.dataset.themeMapScrollShellV321 = "true";
  }
  return maps.length;
}

function normalizeThemeStudio() {
  const studio = document.querySelector(".tn-layout-studio");
  if (!studio) return;
  const hasV312 = Boolean(studio.querySelector(
    "[data-theme-layout-v312],[class*='tn-layout-map'][class*='v312'],.tn-layout-models-v312,.tn-layout-model-grid-v312,.tn-layout-model-list-v312",
  ));
  if (!hasV312) return;
  studio.dataset.themeLayoutV321 = "ready";
  markThemeModels(studio);
  markThemeMaps(studio);
}

function normalizeCodeEditor() {
  document.querySelectorAll(".tn-modal.fullscreen").forEach((modal) => {
    if (!modal.querySelector(".tn-code-workspace")) return;
    modal.dataset.codeGeometryV321 = "ready";
    const workspace = modal.querySelector(".tn-code-workspace");
    if (workspace) workspace.dataset.codeWorkspaceV321 = "ready";
    const pane = modal.querySelector(".tn-code-pane");
    if (pane) pane.dataset.codePaneV321 = "ready";
  });
}

function normalizeDomainPanel() {
  document.querySelectorAll(".sv124-domain-item").forEach((item) => {
    item.dataset.domainResponsiveV321 = "ready";
  });
}

function sync() {
  scheduledFrame = 0;
  document.documentElement.dataset.studioThemeDomainV321 = STUDIO_THEME_DOMAIN_RELEASE_V321;
  normalizeThemeStudio();
  normalizeCodeEditor();
  normalizeDomainPanel();
}

function schedule(delay = 0) {
  if (typeof window === "undefined") return;
  if (delay > 0) {
    window.setTimeout(() => schedule(), delay);
    return;
  }
  if (scheduledFrame) return;
  scheduledFrame = window.requestAnimationFrame(sync);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", () => {
    schedule();
    schedule(80);
    schedule(220);
  }, { passive: true });
  window.addEventListener("pageshow", () => schedule(), { passive: true });
  window.addEventListener("resize", () => schedule(), { passive: true });
  window.addEventListener("orientationchange", () => schedule(60), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule(20), { passive: true });
  window.addEventListener("ngeblogging:active-site-change", () => schedule(40), { passive: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => schedule(), { once: true });
  else schedule();
  schedule(300);
  schedule(900);
}
