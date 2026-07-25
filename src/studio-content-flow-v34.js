const RELEASE = "studio-content-flow-v34-20260725";
const VIEW_SELECTOR = ".sn-main > .sn-view-pad, .sn-main > .nw-page, .sn-main > .tn-studio";
const FAVICON_ID = "ngeblogging-site-favicon-settings";
let resetToken = 0;

function resetNode(node) {
  if (!node) return;
  try {
    if (typeof node.scrollTo === "function") node.scrollTo({ top: 0, left: 0, behavior: "auto" });
    node.scrollTop = 0;
    node.scrollLeft = 0;
  } catch {
    // Browser-owned scrolling roots can reject direct assignments.
  }
}

function studioMounted() {
  return Boolean(document.querySelector(".sn-shell"));
}

function resetStudioScroll() {
  if (!studioMounted()) return;
  resetToken += 1;
  const token = resetToken;
  const perform = () => {
    if (token !== resetToken || !studioMounted()) return;
    try { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); }
    catch { window.scrollTo(0, 0); }
    [
      document.scrollingElement,
      document.documentElement,
      document.body,
      document.querySelector(".sn-main"),
    ].forEach(resetNode);
  };

  perform();
  requestAnimationFrame(() => {
    perform();
    requestAnimationFrame(perform);
  });
  [50, 120, 220, 360].forEach((delay) => window.setTimeout(perform, delay));
}

function normalizeSettings(view) {
  if (!(view instanceof Element)) return;
  const grid = view.querySelector(":scope > .sn-settings-grid");
  const favicon = view.querySelector(`:scope > #${FAVICON_ID}`) || document.getElementById(FAVICON_ID);
  if (!grid || !favicon || !view.contains(favicon)) return;

  // The dynamic favicon bridge must always live after the two settings form cards.
  if (favicon.previousElementSibling !== grid) grid.insertAdjacentElement("afterend", favicon);
  favicon.dataset.studioContentFlowV34 = "true";
}

function normalizeView(view) {
  if (!(view instanceof Element)) return;
  view.dataset.studioContentFlowV34 = "true";
  normalizeSettings(view);
}

function normalizeAll() {
  document.querySelectorAll(VIEW_SELECTOR).forEach(normalizeView);
  const favicon = document.getElementById(FAVICON_ID);
  if (favicon) normalizeSettings(favicon.closest(".sn-view-pad"));
}

document.documentElement.dataset.studioContentFlowV34 = RELEASE;
normalizeAll();
document.addEventListener("popstate", resetStudioScroll);

new MutationObserver((mutations) => {
  let newView = false;
  let faviconChanged = false;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      if (node.matches(VIEW_SELECTOR)) {
        normalizeView(node);
        newView = true;
      }
      node.querySelectorAll?.(VIEW_SELECTOR).forEach((view) => {
        normalizeView(view);
        newView = true;
      });
      if (node.id === FAVICON_ID || node.querySelector?.(`#${FAVICON_ID}`)) faviconChanged = true;
    }
  }

  if (faviconChanged) normalizeAll();
  if (newView) resetStudioScroll();
}).observe(document.body, { childList: true, subtree: true });
