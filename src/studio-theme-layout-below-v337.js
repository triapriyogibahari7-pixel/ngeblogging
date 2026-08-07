import "./studio-theme-layout-below-v337.css";

export const STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337 = "studio-theme-layout-below-v337-20260807";

const LEGACY_MAP_SELECTOR = ".tn-layout-map-v264";
const V312_MAP_SELECTOR = '[data-theme-layout-v312],[class*="tn-layout-map"][class*="v312"]';
const V312_MODEL_SELECTOR = '.tn-layout-model-v312,[class*="tn-layout-model-"][class*="v312"]';
const V312_GROUP_SELECTOR = '.tn-layout-models-v312,.tn-layout-model-grid-v312,.tn-layout-model-list-v312,[class*="tn-layout-models"][class*="v312"]';
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

function clearOldHiddenState(node) {
  if (!(node instanceof HTMLElement)) return;
  node.hidden = false;
  removeAttribute(node, "aria-hidden");
  removeAttribute(node, "data-v332-layout-state");
  removeAttribute(node, "data-v334-duplicate-layout");
  removeAttribute(node, "data-v335-duplicate-layout");
  removeAttribute(node, "data-v336-duplicate-layout");
  removeAttribute(node, "data-v325-legacy-map");
  if ("inert" in node && node.inert) node.inert = false;
  for (const property of [
    "display", "visibility", "pointer-events", "position", "inset", "float",
    "transform", "width", "max-width", "min-width", "height", "min-height",
    "margin", "padding", "overflow", "opacity",
  ]) node.style.removeProperty(property);
}

function showCanonical(node) {
  if (!(node instanceof HTMLElement)) return;
  clearOldHiddenState(node);
  setDataset(node, "v337CanonicalLayout", "primary-v264");
  setImportant(node, "display", "block");
  setImportant(node, "visibility", "visible");
  setImportant(node, "pointer-events", "auto");
  setImportant(node, "position", "relative");
  setImportant(node, "inset", "auto");
  setImportant(node, "float", "none");
  setImportant(node, "transform", "none");
  setImportant(node, "width", "100%");
  setImportant(node, "max-width", "100%");
  setImportant(node, "min-width", "0px");
  setImportant(node, "height", "auto");
  setImportant(node, "margin", "0px auto");
  setImportant(node, "opacity", "1");
}

function showSecondaryBelow(node) {
  if (!(node instanceof HTMLElement)) return;
  clearOldHiddenState(node);
  setDataset(node, "v337SecondaryLayout", "below");
  setImportant(node, "display", "block");
  setImportant(node, "visibility", "visible");
  setImportant(node, "pointer-events", "auto");
  setImportant(node, "position", "relative");
  setImportant(node, "inset", "auto");
  setImportant(node, "float", "none");
  setImportant(node, "transform", "none");
  setImportant(node, "width", "100%");
  setImportant(node, "max-width", "100%");
  setImportant(node, "min-width", "0px");
  setImportant(node, "height", "auto");
  setImportant(node, "min-height", "0px");
  setImportant(node, "margin", "0px");
  setImportant(node, "opacity", "1");
  setImportant(node, "overflow", "visible");
}

function directChildUnder(root, node) {
  let cursor = node;
  while (cursor && cursor.parentElement && cursor.parentElement !== root) cursor = cursor.parentElement;
  return cursor?.parentElement === root ? cursor : null;
}

function semanticSecondary(studio, canonical) {
  const labels = [...studio.querySelectorAll("button,[role='button'],span,b,strong,small,h2,h3,h4")]
    .filter((node) => MODEL_EDITORIAL_RE.test(textOf(node)) || MODEL_MAGAZINE_RE.test(textOf(node)));

  for (const label of labels) {
    let candidate = label.closest(V312_GROUP_SELECTOR) || label.closest(V312_MODEL_SELECTOR) || label.closest(V312_MAP_SELECTOR);
    if (candidate && candidate instanceof HTMLElement && !candidate.contains(canonical) && !canonical.contains(candidate)) {
      let cursor = candidate;
      while (cursor.parentElement && cursor.parentElement !== studio) {
        const parent = cursor.parentElement;
        if (parent.contains(canonical)) break;
        const text = textOf(parent);
        if (!(MODEL_EDITORIAL_RE.test(text) || MODEL_MAGAZINE_RE.test(text) || CONTENT_RE.test(text))) break;
        cursor = parent;
      }
      return cursor;
    }

    let cursor = label.parentElement;
    while (cursor && cursor !== studio) {
      const text = textOf(cursor);
      if (MODEL_EDITORIAL_RE.test(text) && MODEL_MAGAZINE_RE.test(text) && CONTENT_RE.test(text)
        && !cursor.contains(canonical) && !canonical.contains(cursor)) return cursor;
      cursor = cursor.parentElement;
    }
  }

  const directCandidates = [...studio.children]
    .filter((child) => child instanceof HTMLElement && child !== canonical && !child.contains(canonical))
    .map((child) => ({ child, text: textOf(child) }))
    .filter(({ text }) => MODEL_EDITORIAL_RE.test(text) && MODEL_MAGAZINE_RE.test(text));
  return directCandidates[0]?.child || null;
}

function placeSecondaryBelow(studio, canonical, secondary) {
  if (!(secondary instanceof HTMLElement) || secondary === canonical || secondary.contains(canonical) || canonical.contains(secondary)) return;
  const primaryTop = directChildUnder(studio, canonical);
  const secondaryTop = directChildUnder(studio, secondary);

  if (primaryTop && secondaryTop && primaryTop !== secondaryTop) {
    primaryTop.insertAdjacentElement("afterend", secondaryTop);
    showSecondaryBelow(secondaryTop);
    return secondaryTop;
  }

  canonical.insertAdjacentElement("afterend", secondary);
  showSecondaryBelow(secondary);
  return secondary;
}

function normalizeStudio(studio) {
  if (!(studio instanceof HTMLElement)) return false;
  const canonical = studio.querySelector(LEGACY_MAP_SELECTOR);
  if (!(canonical instanceof HTMLElement)) return false;

  setDataset(studio, "v337SecondaryBelow", "ready");
  setDataset(studio, "v337LayoutOrder", "primary-then-secondary");
  setDataset(studio, "themeMapAuthorityV319", "v264-primary-v337");
  setDataset(studio, "themeLayoutV321", "v337-primary-secondary");
  setDataset(studio, "v325ThemeLayout", "v337-primary-secondary");
  removeAttribute(studio, "data-v336-one-layout");
  removeAttribute(studio, "data-v335-single-layout");
  removeAttribute(studio, "data-v334-single-layout");

  showCanonical(canonical);

  const secondary = semanticSecondary(studio, canonical);
  const placedSecondary = placeSecondaryBelow(studio, canonical, secondary);
  if (placedSecondary) setDataset(studio, "v337SecondaryFound", "true");
  else setDataset(studio, "v337SecondaryFound", "false");

  // The four-area bootstrap map is not a third design once the real 26-area map exists.
  studio.querySelectorAll(".tn-layout-canvas").forEach((canvas) => {
    if (!(canvas instanceof HTMLElement) || canvas.contains(canonical) || canvas === placedSecondary || canvas.contains(placedSecondary)) return;
    setDataset(canvas, "v337BootstrapLayout", "hidden");
    canvas.hidden = true;
    canvas.setAttribute("aria-hidden", "true");
  });

  // Keep a separate Widget Terpilih summary below both designs when it exists.
  const widgetSummary = studio.querySelector(":scope > .tn-layout-side");
  if (widgetSummary instanceof HTMLElement && widgetSummary !== placedSecondary) {
    clearOldHiddenState(widgetSummary);
    setDataset(widgetSummary, "v337WidgetSummary", "below-layouts");
    const anchor = placedSecondary || directChildUnder(studio, canonical) || canonical;
    if (anchor.parentElement === studio) anchor.insertAdjacentElement("afterend", widgetSummary);
    setImportant(widgetSummary, "display", "block");
    setImportant(widgetSummary, "position", "relative");
    setImportant(widgetSummary, "width", "100%");
    setImportant(widgetSummary, "max-width", "100%");
    setImportant(widgetSummary, "min-width", "0px");
    setImportant(widgetSummary, "margin", "0px");
  }

  return true;
}

export function enforceThemeLayoutBelowV337(root = document) {
  let repaired = 0;
  root.querySelectorAll(".tn-layout-studio").forEach((studio) => {
    if (normalizeStudio(studio)) repaired += 1;
  });
  return repaired;
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioThemeLayoutBelowV337 = STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337;
  enforceThemeLayoutBelowV337(document);
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
      "data-v325-legacy-map",
      "data-v332-layout-state",
      "data-v334-duplicate-layout",
      "data-v335-duplicate-layout",
      "data-v336-duplicate-layout",
      "data-theme-map-authority-v319",
      "data-theme-layout-v321",
      "data-v325-theme-layout",
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
