import "./studio-production-polish-v323.css";

export const STUDIO_PRODUCTION_POLISH_RELEASE_V323 = "studio-production-polish-v323-20260806";

let scheduledFrame = 0;

function markThemeStudio() {
  const studio = document.querySelector(".tn-layout-studio");
  if (!studio) return;
  studio.dataset.productionPolishV323 = "ready";

  const modelContainers = studio.querySelectorAll(
    ".tn-layout-models-v312,.tn-layout-model-grid-v312,.tn-layout-model-list-v312,[class*='tn-layout-models'][class*='v312']",
  );
  modelContainers.forEach((node) => { node.dataset.productionModelRowsV323 = "ready"; });

  const models = studio.querySelectorAll(
    ".tn-layout-model-v312,[class*='tn-layout-model-'][class*='v312']",
  );
  models.forEach((node) => { node.dataset.productionModelV323 = "ready"; });

  const maps = studio.querySelectorAll(
    "[data-theme-layout-v312],[class*='tn-layout-map'][class*='v312']",
  );
  maps.forEach((map) => {
    map.dataset.productionMapV323 = "ready";
    if (map.parentElement) map.parentElement.dataset.productionMapShellV323 = "ready";
  });
}

function markCodeEditor() {
  document.querySelectorAll(".tn-modal.fullscreen").forEach((modal) => {
    if (!modal.querySelector(".tn-code-workspace")) return;
    modal.dataset.productionCodeV323 = "ready";
  });
}

function markContentEditor() {
  document.querySelectorAll(".ce-app").forEach((editor) => {
    editor.dataset.productionEditorV323 = "ready";
  });
}

function markDomainPanel() {
  document.querySelectorAll(".sv124-domain-page").forEach((page) => {
    page.dataset.productionDomainV323 = "ready";
  });
}

function sync() {
  scheduledFrame = 0;
  document.documentElement.dataset.studioProductionPolishV323 = STUDIO_PRODUCTION_POLISH_RELEASE_V323;
  markThemeStudio();
  markCodeEditor();
  markContentEditor();
  markDomainPanel();
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
