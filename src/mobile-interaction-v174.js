import "./mobile-interaction-v174.css";

const RELEASE = "mobile-interaction-v174-20260731";
const VIEWPORTS = Object.freeze([
  [320,568],[360,640],[375,667],[390,844],[412,915],[430,932],
  [600,960],[768,1024],[820,1180],[1024,768],[1280,720],[1366,768],[1440,900],[1920,1080],
]);

let frame = 0;
let observer;

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizedScreenWidth() {
  const layout = finite(document.documentElement.clientWidth || window.innerWidth, 1920);
  const visual = finite(window.visualViewport?.width, layout);
  const rawScreen = finite(window.screen?.width, layout);
  const density = finite(window.devicePixelRatio, 1);
  const screen = rawScreen > 900 && density >= 1.25 ? rawScreen / density : rawScreen;
  return Math.min(layout, visual, screen);
}

function smallSurface() {
  const root = document.documentElement;
  const declared = root.dataset.studioDeviceMode === "small";
  const handheld = root.dataset.studioHandheld === "true"
    || navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(navigator.userAgent || "");
  return declared || normalizedScreenWidth() <= 900 || handheld;
}

function syncRoot() {
  const root = document.documentElement;
  root.dataset.mobileInteractionV174 = RELEASE;
  root.dataset.v174Small = String(smallSurface());
  root.dataset.v174ViewportCount = String(VIEWPORTS.length);
  root.style.setProperty("--v174-visual-width", `${window.visualViewport?.width || window.innerWidth}px`);
  root.style.setProperty("--v174-visual-height", `${window.visualViewport?.height || window.innerHeight}px`);
}

function syncDrawer() {
  const shell = document.querySelector(".sn-shell");
  const sidebar = shell?.querySelector("#ngeblogging-studio-sidebar.sn-side");
  const backdrop = shell?.querySelector(".sn-side-backdrop");
  const main = shell?.querySelector(".sn-main");
  if (!shell || !sidebar || !main) {
    document.body.classList.remove("sn-mobile-sidebar-open-v174");
    return;
  }

  shell.dataset.mobileInteractionAuthority = RELEASE;
  const mobile = smallSurface();
  const open = mobile && sidebar.classList.contains("mobile-open");
  shell.dataset.mobileDrawerOpenV174 = String(open);

  if (mobile) {
    sidebar.setAttribute("aria-hidden", open ? "false" : "true");
    sidebar.toggleAttribute("inert", !open);
  } else {
    sidebar.setAttribute("aria-hidden", "false");
    sidebar.removeAttribute("inert");
  }

  main.toggleAttribute("inert", open);
  document.body.classList.toggle("sn-mobile-sidebar-open-v174", open);

  if (backdrop) {
    backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    backdrop.tabIndex = open ? 0 : -1;
  }

  if (!open && document.activeElement && sidebar.contains(document.activeElement)) {
    shell.querySelector(".sn-sidebar-toggle")?.focus({ preventScroll: true });
  }
}

function syncProfile() {
  const menu = document.querySelector(".sn-profile-dropdown");
  const trigger = document.querySelector(".sn-profile-menu-wrap .sn-avatar");
  if (!trigger) return;
  trigger.dataset.mobileInteractionV174 = RELEASE;
  trigger.setAttribute("aria-haspopup", "menu");
  if (!menu) return;
  menu.dataset.mobileInteractionV174 = RELEASE;
  menu.setAttribute("role", "menu");
  menu.querySelectorAll("button").forEach((button) => button.setAttribute("role", "menuitem"));
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.mobileInteractionV174 = RELEASE;
    launcher.setAttribute("aria-label", "Buka Nara AI");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) {
    document.body.classList.remove("nara-nonmodal-v174");
    return;
  }

  const size = shell.dataset.naraSize || layer.dataset.naraLayerSize || "small";
  layer.dataset.naraLayerSize = size;
  layer.dataset.mobileInteractionV174 = RELEASE;
  const full = size === "full";
  layer.setAttribute("aria-modal", String(full));
  document.body.classList.toggle("nara-nonmodal-v174", !full);
  document.body.classList.toggle("nara-fullscreen-v174", full);

  if (!full) {
    document.body.classList.remove("nara-fullscreen-open-v148");
    const backdrop = layer.querySelector(".nara-assistant-backdrop");
    backdrop?.setAttribute("aria-hidden", "true");
    if (backdrop) backdrop.tabIndex = -1;
  }
}

function sync() {
  frame = 0;
  syncRoot();
  syncDrawer();
  syncProfile();
  syncNara();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

observer = new MutationObserver(schedule);
observer.observe(document.documentElement, {
  childList:true,
  subtree:true,
  attributes:true,
  attributeFilter:["class","data-device-mode","data-nara-size","data-nara-layer-size","aria-expanded"],
});

window.addEventListener("resize", schedule, { passive:true });
window.addEventListener("orientationchange", schedule, { passive:true });
window.addEventListener("pageshow", schedule, { passive:true });
window.visualViewport?.addEventListener("resize", schedule, { passive:true });

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const sidebar = document.querySelector("#ngeblogging-studio-sidebar.sn-side.mobile-open");
  if (sidebar && smallSurface()) {
    sidebar.querySelector(".sn-side-close")?.click();
    schedule();
  }
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".sn-side-backdrop,.sn-side-close,.sn-sidebar-toggle,.sn-side nav button,.sn-account-footer button,.nara-floating-button,.nara-size-controls-v147 button")) {
    requestAnimationFrame(schedule);
  }
}, { passive:true });

sync();

export { RELEASE, VIEWPORTS, normalizedScreenWidth, smallSurface, syncDrawer, syncNara };
