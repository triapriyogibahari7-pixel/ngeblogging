import "./studio-theme-layout-one-v336.css";

export const STUDIO_THEME_LAYOUT_ONE_RELEASE_V336 = "studio-theme-layout-one-v336-20260807";

const LEGACY_MAP_SELECTOR = ".tn-layout-map-v264";
const V312_MAP_SELECTOR = '[data-theme-layout-v312],[class*="tn-layout-map"][class*="v312"]';
const V312_MODEL_SELECTOR = '.tn-layout-model-v312,[class*="tn-layout-model-"][class*="v312"]';
const V312_GROUP_SELECTOR = '.tn-layout-models-v312,.tn-layout-model-grid-v312,.tn-layout-model-list-v312,[class*="tn-layout-models"][class*="v312"]';
const OLD_MODEL_MARKERS = '[data-theme-model-v321="true"],[data-theme-model-rows-v321="true"],[data-theme-map-v321="detail"],[data-theme-map-scroll-shell-v321="true"],[data-v325-model-card="ready"],[data-v325-model-stack="ready"],[data-v325-layout-map="ready"],[data-v325-map-shell="ready"]';
const MODEL_EDITORIAL_RE = /model\s+editorial/i;
const MODEL_MAGAZINE_RE = /model\s+majalah/i;
const CONTENT_RE = /konten\s+utama|post\s*\/?\s*page/i;

let frame = 0;
let observer = null;

function textOf(node) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function setDataset(node, key, value) {
  if (!node?.dataset || node.dataset[key] === value) return;
  node.dataset[key] = value;
}

function removeAttribute(node, name) {
  if (node?.hasAttribute?.(name)) node.removeAttribute(name);
}

function setImportant(node, property, value) {
  if (!(node instanceof HTMLElement)) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function forceHidden(node) {
  if (!(node instanceof HTMLElement)) return;
  setDataset(node, "v336DuplicateLayout", "hidden");
  if (!node.hidden) node.hidden = true;
  if (node.getAttribute("aria-hidden") !== "true") node.setAttribute("aria-hidden", "true");
  if ("inert" in node && !node.inert) node.inert = true;
  setImportant(node, "display", "none");
  setImportant(node, "visibility", "hidden");
  setImportant(node, "pointer-events", "none");
  setImportant(node, "position", "absolute");
  setImportant(node, "width", "0px");
  setImportant(node, "height", "0px");
  setImportant(node, "min-width", "0px");
  setImportant(node, "min-height", "0px");
  setImportant(node, "margin", "0px");
  setImportant(node, "padding", "0px");
  setImportant(node, "overflow", "hidden");
}

function forceCanonical(node) {
  if (!(node instanceof HTMLElement)) return;
  setDataset(node, "v336CanonicalLayout", "single-reference-v264");
  if (node.hidden) node.hidden = false;
  removeAttribute(node, "aria-hidden");
  removeAttribute(node, "data-v319-fallback");
  removeAttribute(node, "data-v325-legacy-map");
  removeAttribute(node, "data-v332-layout-state");
  if ("inert" in node && node.inert) node.inert = false;
  setImportant(node, "display", "block");
  setImportant(node, "visibility", "visible");
  setImportant(node, "pointer-events", "auto");
  setImportant(node, "position", "relative");
  setImportant(node, "inset", "auto");
  setImportant(node, "width", "100%");
  setImportant(node, "max-width", "100%");
  setImportant(node, "height", "auto");
  setImportant(node, "margin", "0px auto");
  setImportant(node, "opacity", "1");
}

function semanticDuplicate(studio, canonical) {
  const labels = [...studio.querySelectorAll("button,[role='button'],span,b,strong,small,h2,h3,h4")]
    .filter((node) => MODEL_EDITORIAL_RE.test(textOf(node)) || MODEL_MAGAZINE_RE.test(textOf(node)));

  for (const label of labels) {
    const known = label.closest(V312_GROUP_SELECTOR) || label.closest(V312_MODEL_SELECTOR) || label.closest(V312_MAP_SELECTOR);
    if (known && studio.contains(known) && !known.contains(canonical) && !canonical.contains(known)) return known;

    let cursor = label.parentElement;
    while (cursor && cursor !== studio) {
      const text = textOf(cursor);
      if (MODEL_EDITORIAL_RE.test(text) && MODEL_MAGAZINE_RE.test(text) && CONTENT_RE.test(text)
        && !cursor.contains(canonical) && !canonical.contains(cursor)) return cursor;
      cursor = cursor.parentElement;
    }
  }
  return null;
}

function collectDuplicates(studio, canonical) {
  const duplicates = new Set();
  studio.querySelectorAll(`${V312_GROUP_SELECTOR},${V312_MODEL_SELECTOR},${V312_MAP_SELECTOR},${OLD_MODEL_MARKERS}`).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (node === canonical || node.contains(canonical) || canonical.contains(node)) return;
    duplicates.add(node.closest(V312_GROUP_SELECTOR) || node.closest(V312_MODEL_SELECTOR) || node);
  });

  const semantic = semanticDuplicate(studio, canonical);
  if (semantic) duplicates.add(semantic);

  [...studio.children].forEach((child) => {
    if (!(child instanceof HTMLElement) || child === canonical || child.contains(canonical)) return;
    const text = textOf(child);
    if (MODEL_EDITORIAL_RE.test(text) && MODEL_MAGAZINE_RE.test(text) && CONTENT_RE.test(text)) duplicates.add(child);
  });

  return [...duplicates].filter((node) => node instanceof HTMLElement && !node.contains(canonical) && !canonical.contains(node));
}

function normalizeStudio(studio) {
  if (!(studio instanceof HTMLElement)) return false;
  const canonical = studio.querySelector(LEGACY_MAP_SELECTOR);
  if (!(canonical instanceof HTMLElement)) return false;

  setDataset(studio, "v336OneLayout", "ready");
  setDataset(studio, "v336VisibleLayoutMaps", "1");
  setDataset(studio, "themeMapAuthorityV319", "v264-canonical");
  setDataset(studio, "themeLayoutV321", "v264-canonical");
  setDataset(studio, "v325ThemeLayout", "v264-canonical");

  forceCanonical(canonical);

  // The small four-area React canvas is only a bootstrap surface. Once the real
  // 26-area v264 map exists, keeping it would create another visible layout map.
  studio.querySelectorAll(".tn-layout-canvas").forEach((canvas) => {
    if (!canvas.contains(canonical)) forceHidden(canvas);
  });

  collectDuplicates(studio, canonical).forEach(forceHidden);

  // Keep the real Widget Terpilih panel, but place it below the single map rather
  // than allowing it to become another side column.
  const widgetSummary = studio.querySelector(":scope > .tn-layout-side");
  if (widgetSummary instanceof HTMLElement) {
    setDataset(widgetSummary, "v336WidgetSummary", "below-map");
    setImportant(widgetSummary, "display", "block");
    setImportant(widgetSummary, "position", "relative");
    setImportant(widgetSummary, "width", "100%");
    setImportant(widgetSummary, "max-width", "100%");
    setImportant(widgetSummary, "margin", "14px 0px 0px");
  }

  return true;
}

export function enforceOneThemeLayoutV336(root = document) {
  let repaired = 0;
  root.querySelectorAll(".tn-layout-studio").forEach((studio) => {
    if (normalizeStudio(studio)) repaired += 1;
  });
  return repaired;
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioThemeLayoutOneV336 = STUDIO_THEME_LAYOUT_ONE_RELEASE_V336;
  enforceOneThemeLayoutV336(document);
}

function schedule() {
  if (typeof window === "undefined" || frame) return;
  frame = window.requestAnimationFrame(sync);
}

function startObserver() {
  if (observer || typeof MutationObserver === "undefined" || !document.body) return;
  observer = new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" || record.type === "attributes")) schedule();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "class",
      "hidden",
      "data-theme-map-authority-v319",
      "data-theme-layout-v321",
      "data-v325-theme-layout",
      "data-v325-legacy-map",
    ],
  });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("hashchange", schedule, { passive: true });
  window.addEventListener("popstate", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule, { passive: true });
  window.addEventListener("ngeblogging:active-site-change", schedule, { passive: true });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { startObserver(); schedule(); }, { once: true });
  } else {
    startObserver();
    schedule();
  }
}
