const RELEASE = "studio-runtime-v22-20260725";
let frame = 0;

function viewportProfile() {
  const layoutWidth = Math.max(1, Number(window.innerWidth) || 1);
  const layoutHeight = Math.max(1, Number(window.innerHeight) || 1);
  const screenWidth = Math.max(1, Number(window.screen?.width) || layoutWidth);
  const screenHeight = Math.max(1, Number(window.screen?.height) || layoutHeight);
  const physicalScreenMobile = Math.min(screenWidth, screenHeight) <= 760;
  const compactViewport = layoutWidth <= 760;
  const desktopSitePhone = physicalScreenMobile && !compactViewport;
  return { layoutWidth, layoutHeight, screenWidth, screenHeight, physicalScreenMobile, compactViewport, desktopSitePhone };
}

function syncDeviceFlags() {
  const profile = viewportProfile();
  const root = document.documentElement;
  root.dataset.studioRuntime = RELEASE;
  root.dataset.physicalScreenMobile = String(profile.physicalScreenMobile);
  root.dataset.desktopSitePhone = String(profile.desktopSitePhone);
  root.dataset.desktopLayoutRequested = String(profile.desktopSitePhone);
  root.dataset.physicalMobile = String(profile.compactViewport);
  root.dataset.orientation = window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
  root.style.setProperty("--sn-layout-width", `${profile.layoutWidth.toFixed(2)}px`);
  root.style.setProperty("--sn-layout-height", `${profile.layoutHeight.toFixed(2)}px`);
}

function normalizeNara() {
  document.querySelectorAll([
    ".nara-floating-proxy-v14",
    ".nara-floating-proxy-v15",
    ".nara-floating-proxy-v16",
    ".nara-floating-proxy-v17",
    ".nara-floating-proxy-v18",
    ".nara-floating-proxy-v19",
    ".nara-floating-proxy-v20",
    ".nara-floating-proxy-v21",
  ].join(",")).forEach((node) => node.remove());

  const launchers = [...document.querySelectorAll(".nara-floating-button")];
  launchers.forEach((button, index) => {
    if (index > 0) {
      button.remove();
      return;
    }
    button.type = "button";
    button.hidden = false;
    button.disabled = false;
    button.dataset.naraLauncherAuthority = "single-v22";
    button.removeAttribute("aria-hidden");
    button.setAttribute("aria-label", "Buka Nara AI");
    button.style.removeProperty("display");
    button.style.removeProperty("visibility");
    button.style.removeProperty("opacity");
    button.style.removeProperty("pointer-events");
    button.style.removeProperty("transform");
  });

  document.querySelectorAll(".sn-top-actions .sn-nara-button, .ce-nara").forEach((button) => {
    button.hidden = true;
    button.tabIndex = -1;
    button.setAttribute("aria-hidden", "true");
  });

  const layer = document.querySelector(".nara-assistant-layer");
  document.documentElement.dataset.naraOpen = String(Boolean(layer));
  document.body.classList.toggle("nara-open-v22", Boolean(layer));
}

function normalizeSidebar() {
  document.querySelectorAll([
    ".sn-sidebar-edge-v14",
    ".sn-sidebar-edge-v15",
    ".sn-sidebar-edge-v16",
    ".sn-sidebar-edge-v17",
    ".sn-sidebar-edge-v18",
    ".sn-sidebar-edge-v19",
    ".sn-sidebar-edge-v20",
  ].join(",")).forEach((node) => node.remove());

  document.querySelectorAll(".sn-shell").forEach((shell) => {
    const side = shell.querySelector(":scope > .sn-side");
    const toggle = shell.querySelector(":scope > .sn-main > .sn-top .sn-icon");
    if (!side || !toggle) return;

    side.id ||= "ngeblogging-studio-sidebar";
    toggle.type = "button";
    toggle.hidden = false;
    toggle.disabled = false;
    toggle.dataset.sidebarAuthority = "single-v22";
    toggle.setAttribute("aria-controls", side.id);
    toggle.setAttribute("aria-expanded", String(!side.classList.contains("collapsed")));
    toggle.setAttribute("aria-label", side.classList.contains("collapsed") ? "Buka menu Studio" : "Tutup menu Studio");
    shell.dataset.v21SidebarOpen = String(!side.classList.contains("collapsed"));

    shell.querySelectorAll(".sn-mobile-nav, .sn-mobile-sheet-layer, .sn-side-close, .sn-side-bottom")
      .forEach((node) => node.remove());
  });
}

function normalizeEditor() {
  document.querySelectorAll(".ce-titlebar").forEach((titlebar) => {
    titlebar.dataset.editorChromeAuthority = "v22";
  });
  document.querySelectorAll(".ce-tabs").forEach((tabs) => {
    tabs.dataset.editorChromeAuthority = "v22";
  });
  document.querySelectorAll(".ce-ribbon").forEach((ribbon) => {
    ribbon.dataset.editorChromeAuthority = "v22";
  });
}

function sync() {
  syncDeviceFlags();
  normalizeNara();
  normalizeSidebar();
  normalizeEditor();
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length || mutation.type === "attributes")) schedule();
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "aria-hidden"],
});

window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });

document.addEventListener("click", (event) => {
  const toggle = event.target.closest(".sn-icon[data-sidebar-authority]");
  if (toggle) requestAnimationFrame(schedule);
}, true);

schedule();
