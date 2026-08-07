import "./studio-theme-single-layout-v332.css";

export const STUDIO_THEME_SINGLE_LAYOUT_RELEASE_V332 = "studio-theme-single-layout-v332-20260806";

const LEGACY_MAP_SELECTOR = ".tn-layout-map-v264";
const V312_MAP_SELECTOR = '[data-theme-layout-v312],[class*="tn-layout-map"][class*="v312"]';
const V312_MODEL_GROUP_SELECTOR = '.tn-layout-models-v312,.tn-layout-model-grid-v312,.tn-layout-model-list-v312,[class*="tn-layout-models"][class*="v312"]';
const V312_MODEL_SELECTOR = '.tn-layout-model-v312,[class*="tn-layout-model-"][class*="v312"]';
let frame = 0;

function hideNode(node) {
  if (!node || !(node instanceof HTMLElement)) return;
  node.dataset.v332SingleLayout = "hidden";
  node.hidden = true;
  node.setAttribute("aria-hidden", "true");
  if ("inert" in node) node.inert = true;
}

function showNode(node, authority) {
  if (!node || !(node instanceof HTMLElement)) return;
  node.dataset.v332SingleLayout = "primary";
  node.hidden = false;
  node.removeAttribute("aria-hidden");
  node.removeAttribute("data-v325-legacy-map");
  node.dataset.v319Fallback = "active-v332";
  if ("inert" in node) node.inert = false;
  const studio = node.closest(".tn-layout-studio");
  if (studio) studio.dataset.themeMapAuthorityV332 = authority;
}

function findEditorialModel(studio) {
  const labeled = [...studio.querySelectorAll("button,[role='button'],b,strong,h3,h4,span")]
    .find((node) => /model\s+editorial/i.test(String(node.textContent || "")));
  if (!labeled) return null;
  return labeled.closest(V312_MODEL_SELECTOR) || labeled.parentElement?.querySelector?.(V312_MAP_SELECTOR)?.closest(V312_MODEL_SELECTOR) || null;
}

function normalizeSingleLayoutMap() {
  document.querySelectorAll(".tn-layout-studio").forEach((studio) => {
    const legacyMaps = [...studio.querySelectorAll(LEGACY_MAP_SELECTOR)];
    const v312Maps = [...studio.querySelectorAll(V312_MAP_SELECTOR)];
    const modelGroups = [...studio.querySelectorAll(V312_MODEL_GROUP_SELECTOR)];

    if (legacyMaps.length) {
      const primary = legacyMaps[0];
      showNode(primary, "single-v264-reference");
      legacyMaps.slice(1).forEach(hideNode);

      // The screenshot reference requested by the user is the single full-width
      // 26-area map. The later dual-model v312 surface is intentionally removed
      // from interaction/rendering here so it cannot squeeze beside the map.
      modelGroups.forEach((group) => {
        if (!group.contains(primary)) hideNode(group);
      });
      v312Maps.forEach((map) => {
        if (map !== primary && !map.contains(primary) && !primary.contains(map)) {
          const model = map.closest(V312_MODEL_SELECTOR);
          hideNode(model || map);
        }
      });
      return;
    }

    // Defensive fallback for a build where v264 is genuinely absent: keep only
    // the editorial v312 model and suppress every duplicate/majalah model.
    const editorialModel = findEditorialModel(studio);
    const primaryMap = editorialModel?.querySelector(V312_MAP_SELECTOR) || v312Maps[0] || null;
    if (!primaryMap) return;
    const primaryModel = primaryMap.closest(V312_MODEL_SELECTOR) || primaryMap;
    showNode(primaryModel, "single-v312-editorial");
    modelGroups.forEach((group) => {
      if (group !== primaryModel && !group.contains(primaryModel)) hideNode(group);
    });
    v312Maps.forEach((map) => {
      const model = map.closest(V312_MODEL_SELECTOR) || map;
      if (model !== primaryModel && !model.contains(primaryModel) && !primaryModel.contains(model)) hideNode(model);
    });
  });
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioThemeSingleLayoutV332 = STUDIO_THEME_SINGLE_LAYOUT_RELEASE_V332;
  normalizeSingleLayoutMap();
}

function schedule(delay = 0) {
  if (typeof window === "undefined") return;
  if (delay > 0) {
    window.setTimeout(() => schedule(), delay);
    return;
  }
  if (frame) return;
  frame = window.requestAnimationFrame(sync);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", () => {
    schedule();
    schedule(60);
    schedule(180);
  }, { passive: true });
  window.addEventListener("pageshow", () => schedule(), { passive: true });
  window.addEventListener("resize", () => schedule(), { passive: true });
  window.addEventListener("orientationchange", () => schedule(40), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule(20), { passive: true });
  window.addEventListener("ngeblogging:active-site-change", () => schedule(30), { passive: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => schedule(), { once: true });
  else schedule();
  schedule(220);
  schedule(700);
}
