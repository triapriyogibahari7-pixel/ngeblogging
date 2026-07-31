import "./production-entry-v154.js";
import "./studio-platform-v160.js";
import "./studio-mobile-interaction-v162.css";
import "./studio-mobile-interaction-v162.js";

const RELEASE = "studio-style-authority-v162-20260731";

const LEGACY_STUDIO_STYLES = new Set([
  "/src/studio-responsive-v23.css",
  "/src/studio-shell-v30.css",
  "/src/studio-mobile-content-v31.css",
  "/src/studio-mobile-polish-v32.css",
  "/src/studio-mobile-overlap-v33.css",
  "/src/studio-content-flow-v34.css",
  "/src/studio-domain-backup-v35.css",
  "/src/studio-production-audit-v37.css",
  "/src/studio-layout-builder-v39.css",
  "/src/studio-quality-v39.css",
  "/src/studio-layout-device-v40.css",
  "/src/studio-responsive-repair-v43.css",
  "/src/studio-operations-v41.css",
  "/src/studio-reflow-v48.css",
  "/src/studio-flow-v49.css",
  "/src/studio-theme-domain-v50.css",
  "/src/studio-site-switcher-v52.css",
  "/src/studio-site-switcher-stability-v53.css",
  "/src/sidebar-final-v91.css",
  "/src/studio-ui-stability-v95.css",
  "/src/studio-surface-authority-v100.css",
  "/src/studio-mobile-precision-v99.css",
  "/src/studio-final-v106.css",
  "/src/sidebar-account-collapsed-icons-v119.css",
]);

function stylesheetPath(link) {
  try {
    return new URL(link.href, window.location.href).pathname;
  } catch {
    return String(link.getAttribute("href") || "").split("?")[0];
  }
}

function disableLegacyStudioStyles() {
  document.querySelectorAll('link[rel~="stylesheet"][href]').forEach((link) => {
    if (!LEGACY_STUDIO_STYLES.has(stylesheetPath(link))) return;
    link.media = "not all";
    link.dataset.disabledAuthority = RELEASE;
    link.dataset.studioLegacyStyle = "disabled";
  });
  document.documentElement.dataset.studioStyleAuthority = RELEASE;
}

disableLegacyStudioStyles();

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length > 0)) {
    disableLegacyStudioStyles();
  }
}).observe(document.head, { childList: true, subtree: true });

window.addEventListener("pageshow", disableLegacyStudioStyles, { passive: true });

export { RELEASE, LEGACY_STUDIO_STYLES, disableLegacyStudioStyles };
