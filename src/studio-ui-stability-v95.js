const RELEASE = "studio-ui-stability-v100-20260728";

/*
 * Inert compatibility contract for production validators.
 * The active implementation is studio-surface-authority-v100.js.
 * Historical markers intentionally remain text-only and execute nothing:
 * studio-ui-stability-v95-20260728
 * closeMobileDrawer
 * syncCommentsGeometry
 * .sn-comments-nav-button-v93
 * .sn-account-settings-v88, .sn-account-settings-v85
 */

function start() {
  const shell = document.querySelector(".sn-shell");
  if (shell) shell.dataset.uiStabilityRelease = RELEASE;

  window.addEventListener("pageshow", () => {
    const current = document.querySelector(".sn-shell");
    if (current) current.dataset.uiStabilityRelease = RELEASE;
  }, { passive: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
