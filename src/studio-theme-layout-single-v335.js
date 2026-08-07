import "./studio-theme-layout-single-v335.css";

export const STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V335 = "studio-theme-layout-single-v335-20260807";

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

function hideDuplicate(node) {
  if (!node || !(node instanceof HTMLElement)) return;
  node.dataset.v335DuplicateLayout = "hidden";
  node.hidden = true;
  node.setAttribute("aria-hidden", "true");
  if ("inert" in node) node.inert = true;
}

function showCanonical(node, authority) {
  if (!node || !(node instanceof HTMLElement)) return;
  node.dataset.v335CanonicalLayout = authority;
  node.hidden = false;
  node.removeAttribute("aria-hidden");
  node.removeAttribute("data-v325-legacy-map");
  node.removeAttribute("data-v332-layout-state");
  if ("inert" in node) node.inert = false;
  const host = node.parentElement;
  if (host) host.dataset.v335CanonicalHost = "ready";
}

function directChildUnder(root, node) {
  let cursor = node;
  while (cursor && cursor.parentElement && cursor.parentElement !== root) cursor = cursor.parentElement;
  return cursor?.parentElement === root ? cursor : null;
}

function semanticModelCarrier(studio) {
  const labels = [...studio.querySelectorAll("button,[role='button'],span,b,strong,small,h2,h3,h4")]
    .filter((node) => MODEL_EDITORIAL_RE.test(textOf(node)) || MODEL_MAGAZINE_RE.test(textOf(node)));
  for (const label of labels) {
    const known = label.closest(V312_GROUP_SELECTOR) || label.closest(V312_MODEL_SELECTOR);
    if (known && studio.contains(known)) return known;
    let cursor = label.parentElement;
    while (cursor && cursor !== studio) {
      const text = textOf(cursor);
      if (MODEL_EDITORIAL_RE.test(text) && MODEL_MAGAZINE_RE.test(text) && CONTENT_RE.test(text)) return cursor;
      cursor = cursor.parentElement;
    }
  }
  return null;
}

function normalizeWithLegacy(studio, canonical) {
  showCanonical(canonical, "single-reference-v264");

  studio.querySelectorAll(`${V312_GROUP_SELECTOR},${V312_MAP_SELECTOR}`).forEach((node) => {
    if (node === canonical || node.contains(canonical) || canonical.contains(node)) return;
    hideDuplicate(node.closest(V312_GROUP_SELECTOR) || node.closest(V312_MODEL_SELECTOR) || node);
  });

  const carrier = semanticModelCarrier(studio);
  if (carrier && !carrier.contains(canonical) && !canonical.contains(carrier)) {
    const direct = directChildUnder(studio, carrier);
    hideDuplicate(direct && !direct.contains(canonical) ? direct : carrier);
  }

  // Final hard lock: any direct sibling that contains the v312 model surface is
  // removed from layout flow. This is the narrow right-hand map crossed out in
  // the supplied screenshot; the v264 reference map remains the only authority.
  [...studio.children].forEach((child) => {
    if (!(child instanceof HTMLElement) || child === canonical || child.contains(canonical)) return;
    const hasModel = child.matches(V312_GROUP_SELECTOR)
      || Boolean(child.querySelector(V312_GROUP_SELECTOR))
      || Boolean(child.querySelector(V312_MODEL_SELECTOR));
    const text = textOf(child);
    if (hasModel || (MODEL_EDITORIAL_RE.test(text) && MODEL_MAGAZINE_RE.test(text))) hideDuplicate(child);
  });
}

function normalizeWithoutLegacy(studio) {
  const models = [...studio.querySelectorAll(V312_MODEL_SELECTOR)];
  const editorial = models.find((model) => MODEL_EDITORIAL_RE.test(textOf(model))) || models[0] || null;
  if (!editorial) return false;
  showCanonical(editorial, "single-editorial-fallback");
  models.forEach((model) => { if (model !== editorial && !model.contains(editorial)) hideDuplicate(model); });
  studio.querySelectorAll(V312_GROUP_SELECTOR).forEach((group) => {
    if (!group.contains(editorial)) hideDuplicate(group);
  });
  return true;
}

export function hardLockSingleThemeLayoutV335(root = document) {
  let repaired = 0;
  root.querySelectorAll(".tn-layout-studio").forEach((studio) => {
    if (!(studio instanceof HTMLElement)) return;
    const legacyMaps = [...studio.querySelectorAll(LEGACY_MAP_SELECTOR)];
    const canonical = legacyMaps[0] || null;
    if (canonical) {
      legacyMaps.slice(1).forEach(hideDuplicate);
      normalizeWithLegacy(studio, canonical);
      repaired += 1;
    } else if (normalizeWithoutLegacy(studio)) repaired += 1;

    if (canonical || studio.querySelector(V312_MODEL_SELECTOR)) {
      studio.dataset.v335SingleLayout = "ready";
      studio.dataset.v335VisibleLayoutMaps = "1";
    }
  });
  return repaired;
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioThemeLayoutSingleV335 = STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V335;
  hardLockSingleThemeLayoutV335(document);
}

function schedule() {
  if (typeof window === "undefined" || frame) return;
  frame = window.requestAnimationFrame(sync);
}

function startObserver() {
  if (observer || typeof MutationObserver === "undefined" || !document.body) return;
  observer = new MutationObserver((records) => {
    if (records.some((record) => record.addedNodes.length || record.removedNodes.length)) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
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
