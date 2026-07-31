import "./studio-screenshot-stability-v177.css";

const RELEASE = "studio-screenshot-stability-v177-20260731";
const NARA_SIZE_KEY = "ngeblogging-nara-size-v148";
const MOBILE_QUERY = "(max-width: 820px)";
let frame = 0;

function mobileLike() {
  const shellMode = document.querySelector(".sn-shell")?.dataset.deviceMode;
  return shellMode === "small"
    || document.documentElement.dataset.studioDeviceMode === "small"
    || window.matchMedia(MOBILE_QUERY).matches
    || window.matchMedia("(display-mode: standalone)").matches;
}

function drawerWidth() {
  const width = Math.max(1, window.innerWidth || 1);
  if (width <= 360) return Math.min(width * 0.82, 296);
  if (width <= 430) return Math.min(width * 0.74, 320);
  return Math.min(width * 0.66, 360);
}

function syncRoot() {
  const root = document.documentElement;
  root.dataset.studioScreenshotStabilityV177 = RELEASE;
  root.style.setProperty("--sm177-drawer-width", `${Math.round(drawerWidth())}px`);
  root.style.setProperty("--sm177-visual-height", `${Math.round(window.visualViewport?.height || window.innerHeight)}px`);
}

function syncDrawer() {
  const shell = document.querySelector(".sn-shell");
  const sidebar = shell?.querySelector("#ngeblogging-studio-sidebar.sn-side");
  const main = shell?.querySelector(".sn-main");
  const backdrop = shell?.querySelector(".sn-side-backdrop");
  const toggle = shell?.querySelector(".sn-sidebar-toggle");
  if (!shell || !sidebar || !main || !toggle) return;

  const mobile = mobileLike();
  const open = mobile && sidebar.classList.contains("mobile-open");

  main.removeAttribute("inert");
  main.dataset.drawerInteractionV177 = open ? "blocked-only-by-outside-backdrop" : "interactive";
  sidebar.setAttribute("aria-hidden", mobile && !open ? "true" : "false");
  sidebar.dataset.drawerClickableV177 = String(open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.dataset.mobileToggleV177 = RELEASE;

  document.body.classList.toggle("sm177-drawer-open", open);
  if (!open) {
    document.body.classList.remove("sn-mobile-sidebar-open", "sn-mobile-sidebar-open-v176", "sm176-drawer-open");
    document.body.style.removeProperty("overflow");
  }

  if (backdrop) {
    backdrop.dataset.drawerBackdropV177 = open ? "outside-only" : "closed";
    backdrop.setAttribute("aria-hidden", open ? "false" : "true");
  }
}

function syncTopbar() {
  const topbar = document.querySelector(".sn-top");
  if (!topbar) return;
  topbar.dataset.mobileTopbarV177 = mobileLike() ? "compact" : "desktop";
  const toggle = topbar.querySelector(".sn-sidebar-toggle");
  if (toggle) {
    toggle.setAttribute("aria-label", toggle.getAttribute("aria-expanded") === "true" ? "Tutup menu Studio" : "Buka menu Studio");
    toggle.title = toggle.getAttribute("aria-label");
  }
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.naraLauncherV177 = RELEASE;
    launcher.setAttribute("aria-label", "Buka Nara AI");
    launcher.title = "Nara AI";
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) {
    document.body.classList.remove("sm177-nara-full");
    return;
  }

  const size = ["small", "medium", "full"].includes(shell.dataset.naraSize)
    ? shell.dataset.naraSize
    : "small";
  shell.dataset.naraSize = size;
  shell.dataset.naraStableV177 = RELEASE;

  const full = size === "full";
  layer.dataset.naraInteractionV177 = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", full ? "true" : "false");
  document.body.classList.toggle("sm177-nara-full", full);

  if (!full) {
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-fullscreen-open-v176");
    document.body.style.removeProperty("overflow");
  }

  const header = shell.querySelector(".nara-assistant-header");
  const close = header?.lastElementChild;
  if (close?.tagName === "BUTTON") {
    close.dataset.naraCloseV177 = RELEASE;
    close.setAttribute("aria-label", "Tutup Nara AI");
    close.title = "Tutup Nara AI";
  }
}

function scan() {
  frame = 0;
  syncRoot();
  syncDrawer();
  syncTopbar();
  syncNara();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(scan);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-device-mode", "data-nara-size", "aria-expanded", "inert"],
});

window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", () => {
  document.querySelector(".sn-main")?.removeAttribute("inert");
  document.body.classList.remove("sm177-drawer-open", "sn-mobile-sidebar-open", "sn-mobile-sidebar-open-v176", "sm176-drawer-open");
  schedule();
}, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });

document.addEventListener("click", (event) => {
  const target = event.target;
  if (target.closest(".nara-floating-button")) {
    try { localStorage.setItem(NARA_SIZE_KEY, "small"); } catch { /* storage optional */ }
  }
  if (target.closest("#ngeblogging-studio-sidebar.sn-side.mobile-open nav button,#ngeblogging-studio-sidebar.sn-side.mobile-open .sn-account-footer button,#ngeblogging-studio-sidebar.sn-side.mobile-open .sn-new")) {
    requestAnimationFrame(schedule);
  }
  schedule();
}, true);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const close = document.querySelector(".nara-assistant-shell [data-nara-close-v177]");
  if (close && document.querySelector(".nara-assistant-layer")) {
    close.click();
    return;
  }
  document.querySelector("#ngeblogging-studio-sidebar.sn-side.mobile-open .sn-side-close")?.click();
});

schedule();

export { RELEASE, drawerWidth, mobileLike, syncDrawer, syncNara };
