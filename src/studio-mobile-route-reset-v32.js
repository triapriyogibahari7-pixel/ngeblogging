const RELEASE = "studio-mobile-route-reset-v33-20260725";
const ROUTE_SELECTOR = ".sn-side > nav > button, .sn-avatar";
const VIEW_SELECTOR = ".sn-main > .sn-view-pad, .sn-main > .nw-page, .sn-main > .tn-studio";
const MODAL_SELECTOR = ".tn-modal-layer";
let resetTicket = 0;

function compactStudio() {
  return document.documentElement.classList.contains("studio-v30-compact");
}

function resetNode(node) {
  if (!node) return;
  try {
    if (typeof node.scrollTo === "function") node.scrollTo({ top: 0, left: 0, behavior: "auto" });
    node.scrollTop = 0;
    node.scrollLeft = 0;
  } catch {
    // Browser-owned scrolling roots may reject direct assignments.
  }
}

function performReset(ticket) {
  if (ticket !== resetTicket || !compactStudio()) return;
  try { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); } catch { window.scrollTo(0, 0); }
  [
    document.scrollingElement,
    document.documentElement,
    document.body,
    document.querySelector(".sn-main"),
  ].forEach(resetNode);
}

function resetStudioScroll() {
  if (!compactStudio()) return;
  resetTicket += 1;
  const ticket = resetTicket;
  performReset(ticket);
  requestAnimationFrame(() => {
    performReset(ticket);
    requestAnimationFrame(() => performReset(ticket));
  });
  [40, 100, 180, 320].forEach((delay) => window.setTimeout(() => performReset(ticket), delay));
}

function resetThemeModal(layer) {
  if (!compactStudio() || !layer) return;
  const perform = () => {
    resetNode(layer.querySelector(":scope > .tn-modal > .tn-modal-body"));
    resetNode(layer.querySelector(".tn-fields"));
  };
  perform();
  requestAnimationFrame(perform);
}

document.addEventListener("click", (event) => {
  const route = event.target.closest(ROUTE_SELECTOR);
  if (route && compactStudio()) resetStudioScroll();
}, true);

document.addEventListener("popstate", resetStudioScroll);

new MutationObserver((mutations) => {
  let routeContentAdded = false;
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      if (node.matches(MODAL_SELECTOR)) resetThemeModal(node);
      node.querySelectorAll?.(MODAL_SELECTOR).forEach(resetThemeModal);
      if (node.matches(VIEW_SELECTOR) || node.querySelector?.(VIEW_SELECTOR)) routeContentAdded = true;
    }
  }
  if (routeContentAdded) resetStudioScroll();
}).observe(document.body, { childList: true, subtree: true });

document.documentElement.dataset.studioMobileRouteResetV32 = RELEASE;
