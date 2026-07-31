import "./studio-mobile-panels-v179.css";

const RELEASE = "studio-mobile-panels-v179-20260731";

function activate() {
  document.documentElement.dataset.studioMobilePanelsV179 = RELEASE;
  document.querySelectorAll(".sn-main, .sn-view-pad, .sn-api-page, .sv124-page, .mv176-page, .tn-studio")
    .forEach((node) => node.setAttribute("data-mobile-panel-v179", "stable"));
}

new MutationObserver(activate).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("pageshow", activate, { passive: true });
window.addEventListener("resize", activate, { passive: true });
activate();

export { RELEASE, activate };
