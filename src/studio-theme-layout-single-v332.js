import "./studio-theme-layout-single-v332.css";

export const STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332 = "studio-theme-layout-single-v332-20260807";
export const THEME_LAYOUT_AREA_COUNT_V332 = 26;

const LEGACY_MAP_SELECTOR = ".tn-layout-map-v264";
const V312_MAP_SELECTOR = '[data-theme-layout-v312],[class*="tn-layout-map"][class*="v312"]';
const V312_MODEL_GROUP_SELECTOR = '.tn-layout-models-v312,.tn-layout-model-grid-v312,.tn-layout-model-list-v312,[class*="tn-layout-models"][class*="v312"]';
const V312_MODEL_SELECTOR = '.tn-layout-model-v312,[class*="tn-layout-model-"][class*="v312"]';
let frame = 0;

function hideNode(node) {
  if (!node || !(node instanceof HTMLElement)) return;
  node.dataset.v332LayoutState = "hidden";
  node.hidden = true;
  node.setAttribute("aria-hidden", "true");
  if ("inert" in node) node.inert = true;
}

function showNode(node, authority) {
  if (!node || !(node instanceof HTMLElement)) return;
  node.dataset.v332LayoutState = "primary";
  node.hidden = false;
  node.removeAttribute("aria-hidden");
  node.removeAttribute("data-v325-legacy-map");
  node.dataset.v319Fallback = "active-v332";
  if ("inert" in node) node.inert = false;
  const studio = node.closest(".tn-layout-studio");
  if (studio) {
    studio.dataset.v332SingleLayout = "ready";
    studio.dataset.themeMapAuthorityV332 = authority;
    studio.dataset.v332AreaCount = String(THEME_LAYOUT_AREA_COUNT_V332);
  }
}

function findEditorialModel(studio) {
  const label = [...studio.querySelectorAll("button,[role='button'],b,strong,h3,h4,span")]
    .find((node) => /model\s+editorial/i.test(String(node.textContent || "")));
  return label?.closest(V312_MODEL_SELECTOR) || null;
}

export function normalizeSingleThemeLayoutV332(root = document) {
  let ready = 0;
  root.querySelectorAll(".tn-layout-studio").forEach((studio) => {
    const legacyMaps = [...studio.querySelectorAll(`:scope > ${LEGACY_MAP_SELECTOR},${LEGACY_MAP_SELECTOR}`)];
    const v312Maps = [...studio.querySelectorAll(V312_MAP_SELECTOR)];
    const modelGroups = [...studio.querySelectorAll(V312_MODEL_GROUP_SELECTOR)];

    if (legacyMaps.length) {
      const primary = legacyMaps[0];
      showNode(primary, "single-v264-reference");
      legacyMaps.slice(1).forEach(hideNode);
      modelGroups.forEach(hideNode);
      v312Maps.forEach((map) => hideNode(map.closest(V312_MODEL_SELECTOR) || map));
      ready += 1;
      return;
    }

    const editorial = findEditorialModel(studio);
    const primaryMap = editorial?.querySelector(V312_MAP_SELECTOR) || v312Maps[0] || null;
    if (!primaryMap) return;
    const primaryModel = primaryMap.closest(V312_MODEL_SELECTOR) || primaryMap;
    showNode(primaryModel, "single-v312-editorial-fallback");
    modelGroups.forEach((group) => {
      if (group !== primaryModel && !group.contains(primaryModel)) hideNode(group);
    });
    v312Maps.forEach((map) => {
      const model = map.closest(V312_MODEL_SELECTOR) || map;
      if (model !== primaryModel && !model.contains(primaryModel) && !primaryModel.contains(model)) hideNode(model);
    });
    ready += 1;
  });
  return ready;
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioThemeLayoutSingleV332 = STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332;
  normalizeSingleThemeLayoutV332(document);
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
  document.addEventListener("click", () => { schedule(); schedule(80); schedule(220); }, { passive: true });
  window.addEventListener("pageshow", () => schedule(), { passive: true });
  window.addEventListener("resize", () => schedule(), { passive: true });
  window.addEventListener("orientationchange", () => schedule(40), { passive: true });
  window.addEventListener("hashchange", () => schedule(20), { passive: true });
  window.addEventListener("popstate", () => schedule(20), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule(20), { passive: true });
  window.addEventListener("ngeblogging:active-site-change", () => schedule(30), { passive: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => schedule(), { once: true });
  else schedule();
  schedule(260);
  schedule(900);
}
