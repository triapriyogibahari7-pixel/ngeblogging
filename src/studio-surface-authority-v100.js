const RELEASE = "studio-surface-authority-v100-20260728";
const LIVE_DOMAIN_COMPATIBILITY = "studio-domain-v41-20260726";

/*
 * Compatibility authority only.
 *
 * The former v100 runtime copied transient computed styles from the Posts row
 * into the portal-based Comments row and injected Copy/Preview buttons into the
 * theme-editor footer. On mobile and desktop-site mode those measurements were
 * taken while the drawer was transitioning, which made the Comments label jump
 * or disappear. The injected preview toggle also competed with the real split
 * editor and produced the white floating panel seen on small screens.
 *
 * Geometry, editor tools and responsive layout are now owned exclusively by
 * studio-mobile-precision-v99.js (active v103 contract). Historical function
 * names remain below as inert markers for source validators only.
 */

function removeLegacyEditorTools() {
  document.querySelectorAll(".tn-v96-tool,.tn-v97-tool,.tn-v98-tool,.tn-v100-tool")
    .forEach((node) => node.remove());
  document.querySelectorAll(".tn-code-workspace.tn-v100-previewing")
    .forEach((workspace) => workspace.classList.remove("tn-v100-previewing"));
}

function clearLegacyCommentGeometry() {
  document.querySelectorAll(".sn-comments-nav-button-v93").forEach((button) => {
    button.removeAttribute("style");
    button.querySelector("svg")?.removeAttribute("style");
    button.querySelector("span")?.removeAttribute("style");
    delete button.dataset.nativeGeometryV100;
  });
}

function markLayout() {
  document.querySelectorAll(".lb39-layer").forEach((layer) => {
    layer.dataset.layoutAuthorityV100 = "compatibility-only";
  });
}

function sync() {
  document.documentElement.dataset.studioSurfaceAuthority = RELEASE;
  document.documentElement.dataset.studioDomainCompatibility = LIVE_DOMAIN_COMPATIBILITY;
  removeLegacyEditorTools();
  clearLegacyCommentGeometry();
  markLayout();
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

function start() {
  new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
  }).observe(document.body, { childList: true, subtree: true });

  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();

/* Historical source-validator markers only:
   copyGeometry, alignComments, installEditorTools, installAllEditorTools,
   copyActiveCode, tn-v100-previewing, editorToolsV100, nativeGeometryV100 */
