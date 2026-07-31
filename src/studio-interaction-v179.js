import "./studio-interaction-v179.css";

const RELEASE = "studio-mobile-auth-interaction-v179-20260731";
const NARA_SIZE_KEY = "ngeblogging-nara-size-v148";
let frame = 0;

function mobileLike() {
  return document.querySelector(".sn-shell")?.dataset.deviceMode === "small"
    || document.documentElement.dataset.studioDeviceMode === "small"
    || window.matchMedia("(max-width:820px)").matches
    || window.matchMedia("(display-mode:standalone)").matches;
}

function drawerWidth() {
  const width = Math.max(1, window.innerWidth || 1);
  if (width <= 320) return Math.min(Math.round(width * .82), 276);
  if (width <= 360) return Math.min(Math.round(width * .78), 300);
  if (width <= 430) return Math.min(Math.round(width * .74), 326);
  if (width <= 600) return Math.min(Math.round(width * .68), 350);
  return Math.min(Math.round(width * .58), 370);
}

function syncRoot() {
  const root = document.documentElement;
  root.dataset.studioInteractionV179 = RELEASE;
  root.style.setProperty("--sm179-drawer-width", `${drawerWidth()}px`);
  root.style.setProperty("--sm179-visual-height", `${Math.round(window.visualViewport?.height || window.innerHeight)}px`);
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
  const width = drawerWidth();

  main.inert = false;
  main.removeAttribute("inert");
  main.dataset.drawerInteractionV179 = open ? "outside-backdrop-only" : "interactive";
  sidebar.setAttribute("aria-hidden", mobile && !open ? "true" : "false");
  sidebar.dataset.drawerAuthorityV179 = RELEASE;
  toggle.setAttribute("aria-expanded", String(open));
  toggle.dataset.toggleAuthorityV179 = RELEASE;

  for (const [property, value] of [
    ["z-index", "2147482500"], ["filter", "none"], ["opacity", "1"], ["isolation", "isolate"],
  ]) sidebar.style.setProperty(property, value, "important");

  if (backdrop) {
    backdrop.dataset.drawerAuthorityV179 = open ? "outside-only" : "closed";
    backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    backdrop.style.setProperty("left", `${width}px`, "important");
    backdrop.style.setProperty("right", "0", "important");
    backdrop.style.setProperty("width", `calc(100vw - ${width}px)`, "important");
    backdrop.style.setProperty("z-index", "2147482400", "important");
    backdrop.style.setProperty("filter", "none", "important");
    backdrop.style.setProperty("backdrop-filter", "none", "important");
    backdrop.style.setProperty("-webkit-backdrop-filter", "none", "important");
  }

  document.body.classList.toggle("sm179-drawer-open", open);
  if (open) document.body.style.setProperty("overflow", "hidden", "important");
  else {
    document.body.classList.remove("sm178-drawer-open", "sm177-drawer-open", "sm176-drawer-open", "sn-mobile-sidebar-open", "sn-mobile-sidebar-open-v176");
    document.body.style.removeProperty("overflow");
  }
}

function stopNaraMedia() {
  try { window.speechSynthesis?.cancel(); } catch { /* optional */ }
  const listening = document.querySelector(".nara-composer-tools button.listening");
  if (listening instanceof HTMLButtonElement) listening.click();
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.naraLauncherV179 = RELEASE;
    launcher.setAttribute("aria-label", "Buka Nara AI");
    launcher.title = "Nara AI";
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) {
    document.body.classList.remove("sm179-nara-full");
    return;
  }

  let size = shell.dataset.naraSize;
  if (!["small", "medium", "full"].includes(size)) size = "small";
  shell.dataset.naraSize = size;
  shell.dataset.naraAuthorityV179 = RELEASE;
  const full = size === "full";
  layer.dataset.naraInteractionV179 = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", full ? "true" : "false");
  layer.style.setProperty("pointer-events", full ? "auto" : "none", "important");
  document.body.classList.toggle("sm179-nara-full", full);

  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", full ? "false" : "true");
    backdrop.style.setProperty("pointer-events", full ? "auto" : "none", "important");
  }
  if (!full) {
    document.body.classList.remove("sm178-nara-full", "sm177-nara-full", "nara-fullscreen-open-v176", "nara-fullscreen-open-v148");
    if (!document.body.classList.contains("sm179-drawer-open")) document.body.style.removeProperty("overflow");
  }

  const close = shell.querySelector(".nara-close-v177,[data-nara-close-v177],.nara-assistant-header>button:last-child");
  if (close) {
    close.dataset.naraCloseV179 = RELEASE;
    close.setAttribute("aria-label", "Tutup Nara AI");
    close.title = "Tutup Nara AI";
  }
}

function syncProfileMenu() {
  const menu = document.querySelector(".sn-profile-menu-v150");
  if (!menu) return;
  menu.dataset.profileMenuV179 = RELEASE;
  menu.querySelectorAll('[data-action="install"],[data-action="avatar"],.sm176-avatar-action').forEach((node) => node.remove());
  const allowed = new Set(["profile", "settings", "logout"]);
  menu.querySelectorAll(":scope>button[data-action]").forEach((button) => {
    if (!allowed.has(button.dataset.action)) button.remove();
  });
}

function scan() {
  frame = 0;
  syncRoot();
  syncDrawer();
  syncNara();
  syncProfileMenu();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(scan);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList:true, subtree:true, attributes:true,
  attributeFilter:["class", "data-device-mode", "data-nara-size", "aria-expanded", "inert"],
});
window.addEventListener("resize", schedule, { passive:true });
window.addEventListener("orientationchange", schedule, { passive:true });
window.addEventListener("pageshow", schedule, { passive:true });
window.visualViewport?.addEventListener("resize", schedule, { passive:true });

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest(".nara-floating-button")) {
    try { localStorage.setItem(NARA_SIZE_KEY, "small"); } catch { /* optional */ }
  }
  if (target.closest("[data-nara-close-v179],.nara-close-v177,[data-nara-close-v177]")) stopNaraMedia();
  const menuItem = target.closest("#ngeblogging-studio-sidebar.sn-side.mobile-open nav button,#ngeblogging-studio-sidebar.sn-side.mobile-open .sn-account-footer button,#ngeblogging-studio-sidebar.sn-side.mobile-open .sn-new");
  if (menuItem) setTimeout(() => document.querySelector("#ngeblogging-studio-sidebar.sn-side.mobile-open .sn-side-close")?.click(), 0);
  schedule();
}, true);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const close = document.querySelector(".nara-assistant-shell [data-nara-close-v179],.nara-assistant-shell .nara-close-v177");
  if (close) {
    stopNaraMedia();
    close.click();
    return;
  }
  document.querySelector("#ngeblogging-studio-sidebar.sn-side.mobile-open .sn-side-close")?.click();
});

schedule();
export { RELEASE, drawerWidth, mobileLike, syncDrawer, syncNara };
