import "./studio-recovery-v150.js";
import "./studio-recovery-v150.css";
import "./studio-ui-contract-v159.css";

const RELEASE = "studio-ui-contract-v159-20260730";
const SMALL_NARA_SHELLS = new WeakSet();
let scanFrame = 0;

function isSmallStudio() {
  const shell = document.querySelector(".sn-shell");
  return shell?.dataset.deviceMode === "small"
    || document.documentElement.dataset.studioDeviceMode === "small";
}

function updateEdgeToggle(sidebar, button) {
  const collapsed = sidebar.classList.contains("collapsed");
  button.dataset.collapsed = String(collapsed);
  button.setAttribute("aria-label", collapsed ? "Perluas menu Studio" : "Ciutkan menu Studio");
  button.setAttribute("title", collapsed ? "Perluas sidebar" : "Ciutkan sidebar");
  button.textContent = collapsed ? "›" : "‹";
}

function ensureSidebarEdgeToggle() {
  const sidebar = document.querySelector("#ngeblogging-studio-sidebar.sn-side");
  if (!sidebar) return;
  sidebar.dataset.sidebarAuthority = RELEASE;

  let button = sidebar.querySelector(":scope > .sn-sidebar-edge-toggle-v159");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "sn-sidebar-edge-toggle-v159";
    button.dataset.uiRelease = RELEASE;
    button.setAttribute("aria-controls", sidebar.id);
    button.addEventListener("click", () => {
      const source = document.querySelector(".sn-sidebar-toggle");
      if (!source || isSmallStudio()) return;
      source.click();
      requestAnimationFrame(() => updateEdgeToggle(sidebar, button));
    });
    sidebar.append(button);
  }
  updateEdgeToggle(sidebar, button);
}

function syncSidebarContract() {
  const shell = document.querySelector(".sn-shell");
  const sidebar = shell?.querySelector(".sn-side");
  const nav = sidebar?.querySelector(":scope > nav");
  const footer = sidebar?.querySelector(".sn-account-footer");
  if (!shell || !sidebar || !nav || !footer) return;

  shell.dataset.uiContract = RELEASE;
  nav.dataset.menuCenter = "true";
  footer.dataset.menuFooter = "true";
  sidebar.setAttribute("aria-label", "Menu utama Ngeblogging Studio");
  ensureSidebarEdgeToggle();
}

function syncThemeStudio() {
  const studio = document.querySelector(".tn-studio");
  if (!studio) return;
  studio.dataset.uiContract = RELEASE;
  document.querySelector(".tn-layout-studio")?.setAttribute("data-layout-map-authority", RELEASE);
  document.querySelector(".tn-code-workspace")?.setAttribute("data-code-preview-split", RELEASE);
}

function syncNaraShell(shell) {
  const layer = shell.closest(".nara-assistant-layer");
  if (!layer) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");

  layer.dataset.naraInteractionV159 = size;
  layer.setAttribute("aria-modal", full ? "true" : "false");
  layer.setAttribute("data-ui-release", RELEASE);
  shell.setAttribute("data-nara-nonmodal", full ? "false" : "true");

  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.tabIndex = full ? 0 : -1;
    if (full) backdrop.removeAttribute("aria-hidden");
    else backdrop.setAttribute("aria-hidden", "true");
  }
}

function ensureNaraContract() {
  document.querySelectorAll(".nara-assistant-shell").forEach((shell) => {
    if (!SMALL_NARA_SHELLS.has(shell)) {
      SMALL_NARA_SHELLS.add(shell);
      const smallButton = shell.querySelector('.nara-size-controls-v147 [data-size="small"],.nara-native-size-controls-v149 [data-size="small"]');
      if (smallButton && shell.dataset.naraSize !== "small") {
        requestAnimationFrame(() => smallButton.click());
      }
    }
    syncNaraShell(shell);
  });
}

function syncProfileMenu() {
  const avatar = document.querySelector(".sn-avatar");
  if (!avatar) return;
  avatar.setAttribute("aria-haspopup", "menu");
  if (!avatar.hasAttribute("aria-expanded")) avatar.setAttribute("aria-expanded", "false");
  document.querySelector(".sn-profile-menu-v150")?.setAttribute("data-ui-release", RELEASE);
}

function syncContentSurfaces() {
  document.querySelectorAll(".sn-main > *,.sn-view-pad,.ce-app,.tn-studio").forEach((node) => {
    node.setAttribute("data-overlap-guard", RELEASE);
  });
  const analytics = [...document.querySelectorAll(".sn-page-title h1")]
    .find((title) => title.textContent?.trim() === "Analitik")
    ?.closest(".sn-view-pad");
  if (analytics) analytics.dataset.analyticsAuthority = RELEASE;
}

function scan() {
  scanFrame = 0;
  document.documentElement.dataset.studioUiContractV159 = RELEASE;
  syncSidebarContract();
  syncProfileMenu();
  syncThemeStudio();
  ensureNaraContract();
  syncContentSurfaces();
}

function scheduleScan() {
  if (scanFrame) return;
  scanFrame = requestAnimationFrame(scan);
}

new MutationObserver(scheduleScan).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-device-mode", "data-nara-size"],
});

window.addEventListener("resize", scheduleScan, { passive: true });
window.addEventListener("orientationchange", scheduleScan, { passive: true });
window.addEventListener("pageshow", scheduleScan, { passive: true });
window.visualViewport?.addEventListener("resize", scheduleScan, { passive: true });

scheduleScan();

export { RELEASE, ensureSidebarEdgeToggle, ensureNaraContract };
