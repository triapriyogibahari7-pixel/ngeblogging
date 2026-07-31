import "./studio-screenshot-fix-v177.css";

export const RELEASE = "studio-screenshot-fix-v177-20260731";

let frame = 0;

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

function isSmallStudio() {
  const htmlMode = document.documentElement.dataset.studioDeviceMode;
  const shellMode = document.querySelector(".sn-shell")?.dataset.deviceMode;
  return htmlMode === "small" || shellMode === "small";
}

function syncDrawer() {
  const shell = document.querySelector(".sn-shell");
  const sidebar = shell?.querySelector("#ngeblogging-studio-sidebar.sn-side");
  const main = shell?.querySelector(".sn-main");
  const backdrop = shell?.querySelector(".sn-side-backdrop");
  const toggle = shell?.querySelector(".sn-sidebar-toggle");
  if (!shell || !sidebar || !main || !toggle) return;

  const small = isSmallStudio();
  const open = small && sidebar.classList.contains("mobile-open");
  main.removeAttribute("inert");
  sidebar.removeAttribute("inert");
  main.style.removeProperty("pointer-events");
  sidebar.style.removeProperty("pointer-events");
  document.body.style.removeProperty("pointer-events");
  document.documentElement.style.removeProperty("pointer-events");

  sidebar.setAttribute("aria-hidden", small && !open ? "true" : "false");
  toggle.setAttribute("aria-expanded", String(open));
  shell.dataset.drawerStateV177 = open ? "open" : "closed";
  document.body.classList.toggle("sm177-drawer-open", open);

  if (backdrop) {
    backdrop.dataset.drawerBackdropV177 = open ? "outside-only" : "closed";
    backdrop.tabIndex = open ? 0 : -1;
  }

  if (!open) {
    document.body.classList.remove("sn-mobile-sidebar-open", "sn-mobile-sidebar-open-v176");
    if (!document.body.classList.contains("nara-fullscreen-open-v177")) {
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("touch-action");
    }
  }
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) launcher.dataset.launcherV177 = RELEASE;

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) {
    document.body.classList.remove("nara-fullscreen-open-v177");
    return;
  }

  const size = ["small", "medium", "full"].includes(shell.dataset.naraSize)
    ? shell.dataset.naraSize
    : "small";
  const full = size === "full";
  layer.dataset.naraInteractionV177 = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", full ? "true" : "false");
  shell.dataset.naraGeometryV177 = RELEASE;
  document.body.classList.toggle("nara-fullscreen-open-v177", full);

  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop && !full) {
    backdrop.hidden = true;
    backdrop.style.setProperty("display", "none", "important");
    backdrop.style.setProperty("pointer-events", "none", "important");
  }

  if (!full) {
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-fullscreen-open-v176");
    if (!document.body.classList.contains("sm177-drawer-open")) {
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("touch-action");
    }
  }
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioScreenshotFixV177 = RELEASE;
  syncDrawer();
  syncNara();
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-device-mode", "data-nara-size", "aria-expanded", "inert"],
});

window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
document.addEventListener("visibilitychange", schedule, { passive: true });

document.addEventListener("click", schedule, true);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") schedule();
});

schedule();
