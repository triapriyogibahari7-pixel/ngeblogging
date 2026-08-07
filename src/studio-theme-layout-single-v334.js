import "./studio-theme-layout-single-v334.css";

export const STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V334 = "studio-theme-layout-single-v334-20260807";

const MODEL_EDITORIAL_RE = /model\s+editorial/i;
const MODEL_MAGAZINE_RE = /model\s+majalah/i;
const CONTENT_RE = /konten\s+utama|post\s*\/?\s*page/i;
const MAP_RE = /peta\s+tata\s+letak/i;
const LEGACY_MAP_SELECTOR = ".tn-layout-map-v264";
const KNOWN_MAP_SELECTOR = [
  LEGACY_MAP_SELECTOR,
  "[data-theme-layout-v312]",
  '[class*="tn-layout-map"][class*="v312"]',
].join(",");

let scheduledFrame = 0;

function nodeText(node) {
  return String(node?.textContent || "").replace(/\s+/g, " ").trim();
}

function hideDuplicate(node) {
  if (!node || !(node instanceof HTMLElement)) return;
  node.dataset.v334DuplicateMap = "hidden";
  node.hidden = true;
  node.setAttribute("aria-hidden", "true");
  if ("inert" in node) node.inert = true;
}

function showCanonical(node) {
  if (!node || !(node instanceof HTMLElement)) return;
  node.dataset.v334CanonicalMap = "ready";
  node.dataset.v334LayoutState = "primary";
  node.hidden = false;
  node.removeAttribute("aria-hidden");
  node.removeAttribute("data-v325-legacy-map");
  node.removeAttribute("data-v332-layout-state");
  if ("inert" in node) node.inert = false;
  const parent = node.parentElement;
  if (parent) parent.dataset.v334CanonicalHost = "ready";
}

function findSemanticDuplicate(scope) {
  const labels = [...scope.querySelectorAll("button,[role='button'],span,b,strong,small,h2,h3,h4")]
    .filter((node) => MODEL_EDITORIAL_RE.test(nodeText(node)) || MODEL_MAGAZINE_RE.test(nodeText(node)));

  for (const label of labels) {
    let cursor = label.parentElement;
    while (cursor && cursor !== scope) {
      const text = nodeText(cursor);
      if (MODEL_EDITORIAL_RE.test(text) && MODEL_MAGAZINE_RE.test(text) && CONTENT_RE.test(text)) {
        return cursor;
      }
      cursor = cursor.parentElement;
    }
  }
  return null;
}

function findReferenceMap(scope, duplicate) {
  const legacy = [...scope.querySelectorAll(LEGACY_MAP_SELECTOR)]
    .find((node) => !duplicate || !duplicate.contains(node));
  if (legacy) return legacy;

  const known = [...scope.querySelectorAll(KNOWN_MAP_SELECTOR)]
    .filter((node) => !duplicate || !duplicate.contains(node));
  if (known.length) {
    return known.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return (br.width * br.height) - (ar.width * ar.height);
    })[0];
  }

  const contentLabels = [...scope.querySelectorAll("button,[role='button'],span,b,strong,small,h2,h3,h4,div")]
    .filter((node) => CONTENT_RE.test(nodeText(node)));
  for (const label of contentLabels) {
    let cursor = label.parentElement;
    while (cursor && cursor !== scope) {
      const text = nodeText(cursor);
      const hasLeft = /(?:kiri\s*1|sidebar\s+kiri)/i.test(text);
      const hasRight = /(?:kanan\s*1|sidebar\s+kanan)/i.test(text);
      if (hasLeft && hasRight && !MODEL_EDITORIAL_RE.test(text) && !MODEL_MAGAZINE_RE.test(text)) return cursor;
      cursor = cursor.parentElement;
    }
  }
  return null;
}

function normalizeScope(scope) {
  if (!(scope instanceof HTMLElement)) return false;
  const text = nodeText(scope);
  if (!MAP_RE.test(text) && !scope.querySelector(KNOWN_MAP_SELECTOR)) return false;

  const duplicate = findSemanticDuplicate(scope);
  if (duplicate && duplicate !== scope) hideDuplicate(duplicate);

  const canonical = findReferenceMap(scope, duplicate);
  if (canonical) showCanonical(canonical);

  scope.dataset.v334SingleLayout = "ready";
  scope.dataset.v334VisibleMaps = "1";

  // Any additional known map is hidden after the canonical map has been chosen.
  if (canonical) {
    scope.querySelectorAll(KNOWN_MAP_SELECTOR).forEach((map) => {
      if (map === canonical || map.contains(canonical) || canonical.contains(map)) return;
      const container = map.closest('[data-v334-duplicate-map="hidden"]') || map;
      hideDuplicate(container);
    });
  }
  return Boolean(canonical || duplicate);
}

export function normalizeSingleThemeLayoutV334(root = document) {
  let repaired = 0;
  const studios = [...root.querySelectorAll(".tn-layout-studio")];
  studios.forEach((studio) => { if (normalizeScope(studio)) repaired += 1; });

  // Production v312 can wrap the compact Editorial/Majalah surface outside the
  // exact .tn-layout-studio selector. Use the Theme Studio root as a semantic
  // fallback so the crossed-out duplicate cannot survive a class-name variation.
  if (!repaired) {
    root.querySelectorAll(".tn-studio").forEach((studio) => {
      if (normalizeScope(studio)) repaired += 1;
    });
  }
  return repaired;
}

function sync() {
  scheduledFrame = 0;
  document.documentElement.dataset.studioThemeLayoutSingleV334 = STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V334;
  normalizeSingleThemeLayoutV334(document);
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
  document.addEventListener("click", () => { schedule(); schedule(70); schedule(180); }, { passive: true });
  window.addEventListener("pageshow", () => schedule(), { passive: true });
  window.addEventListener("resize", () => schedule(), { passive: true });
  window.addEventListener("orientationchange", () => schedule(40), { passive: true });
  window.addEventListener("hashchange", () => schedule(20), { passive: true });
  window.addEventListener("popstate", () => schedule(20), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule(20), { passive: true });
  window.addEventListener("ngeblogging:active-site-change", () => schedule(30), { passive: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => schedule(), { once: true });
  else schedule();
  schedule(120);
  schedule(360);
  schedule(900);
  schedule(1800);
}
