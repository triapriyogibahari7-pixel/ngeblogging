const RELEASE = "studio-reflow-v48-20260726";
let frame = 0;

function labelOf(button) {
  return String(button?.querySelector("span")?.textContent || button?.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("id-ID");
}

function removeLayoutRoutes() {
  document.querySelectorAll([
    ".sn-side nav button",
    ".sn-mobile-nav button",
    ".sn-mobile-sheet-layer button",
    "[data-layout-route-v29]",
    "[data-studio-layout-route]",
  ].join(",")).forEach((button) => {
    const label = labelOf(button);
    if (label === "tata letak" || label === "layout" || button.matches("[data-layout-route-v29],[data-studio-layout-route]")) {
      button.remove();
    }
  });
}

function normalizeOpenSurfaces() {
  document.querySelectorAll(".sn-modal-layer, .tn-modal-layer").forEach((layer) => {
    layer.dataset.viewportSurface = "true";
  });
  document.querySelectorAll(".tn-frame-shell.mobile").forEach((frameShell) => {
    frameShell.dataset.cleanMobilePreview = "true";
  });
}

function scan() {
  document.documentElement.dataset.studioReflowV48 = RELEASE;
  removeLayoutRoutes();
  normalizeOpenSurfaces();
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length || mutation.type === "characterData")) {
    schedule();
  }
}).observe(document.documentElement, { childList:true, subtree:true, characterData:true });

window.addEventListener("resize", schedule, { passive:true });
window.addEventListener("orientationchange", schedule, { passive:true });
scan();
