import "./studio-screenshot-fixes-v177.css";

const RELEASE = "studio-screenshot-fixes-v177-20260731";
let scheduled = false;

function isSmallStudio() {
  return document.documentElement.dataset.studioDeviceMode === "small"
    || document.querySelector(".sn-shell")?.dataset.deviceMode === "small";
}

function syncDrawer() {
  const shell = document.querySelector(".sn-shell");
  const sidebar = shell?.querySelector("#ngeblogging-studio-sidebar.sn-side");
  const backdrop = shell?.querySelector(".sn-side-backdrop");
  const main = shell?.querySelector(".sn-main");
  if (!shell || !sidebar) {
    document.body.classList.remove("sv177-drawer-open");
    return;
  }
  const open = isSmallStudio() && sidebar.classList.contains("mobile-open");
  if (open) {
    const width = Math.max(0, Math.round(sidebar.getBoundingClientRect().width));
    if (width) document.documentElement.style.setProperty("--sv177-drawer-width", `${width}px`);
    sidebar.dataset.drawerInteractiveV177 = RELEASE;
    sidebar.removeAttribute("inert");
    sidebar.setAttribute("aria-hidden", "false");
    main?.removeAttribute("inert");
    if (backdrop) {
      backdrop.dataset.drawerBackdropV177 = "outside-only";
      backdrop.setAttribute("aria-label", "Tutup menu Studio");
    }
  } else if (isSmallStudio()) {
    sidebar.setAttribute("aria-hidden", "true");
  } else {
    sidebar.setAttribute("aria-hidden", "false");
  }
  document.body.classList.toggle("sv177-drawer-open", open);
}

function syncProfileMenu() {
  document.querySelectorAll('.sn-profile-menu-v150 [data-action="install"],.sn-profile-menu-v150 [data-action="avatar"]').forEach((node) => node.remove());
  const menu = document.querySelector(".sn-profile-menu-v150");
  if (!menu) return;
  menu.dataset.profileSeparationV177 = RELEASE;
  menu.querySelector('[data-action="profile"]')?.setAttribute("aria-label", "Buka halaman Profil");
  menu.querySelector('[data-action="settings"]')?.setAttribute("aria-label", "Buka halaman Pengaturan situs");
  menu.querySelector('[data-action="logout"]')?.setAttribute("aria-label", "Keluar dari akun");
}

function syncNara() {
  const launchers = [...document.querySelectorAll(".nara-floating-button")];
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  launchers.forEach((launcher, index) => {
    launcher.hidden = index !== launchers.length - 1 || Boolean(layer);
    launcher.dataset.stableLauncherV177 = RELEASE;
    launcher.setAttribute("aria-label", "Buka Nara AI");
  });
  document.body.classList.toggle("sv177-nara-open", Boolean(layer));
  if (!layer || !shell) {
    document.body.classList.remove("sv177-nara-full");
    return;
  }
  const size = ["small", "medium", "full"].includes(shell.dataset.naraSize) ? shell.dataset.naraSize : "small";
  const full = size === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", full ? "true" : "false");
  shell.dataset.screenshotStableV177 = RELEASE;
  document.body.classList.toggle("sv177-nara-full", full);
  if (!full) {
    document.body.style.removeProperty("overflow");
    layer.querySelector(".nara-assistant-backdrop")?.setAttribute("hidden", "");
  }
  const close = shell.querySelector(".nara-assistant-header>button:last-child");
  if (close) {
    close.dataset.naraCloseV177 = RELEASE;
    close.setAttribute("aria-label", "Tutup Nara AI");
    close.title = "Tutup Nara AI";
  }
}

function normalizeNetworkErrors() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const candidates = [];
  while (walker.nextNode()) {
    const text = walker.currentNode.nodeValue?.trim();
    if (text === "TypeError: Failed to fetch" || text === "Failed to fetch") candidates.push(walker.currentNode);
  }
  for (const textNode of candidates) {
    const host = textNode.parentElement;
    if (!host || host.closest("script,style")) continue;
    textNode.nodeValue = "Koneksi ke layanan belum tersedia. Periksa internet lalu coba lagi.";
    host.classList.add("sv177-network-error");
    host.setAttribute("role", "alert");
  }
}

function scan() {
  scheduled = false;
  document.documentElement.dataset.studioScreenshotFixesV177 = RELEASE;
  syncDrawer();
  syncProfileMenu();
  syncNara();
  normalizeNetworkErrors();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(scan);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-device-mode", "data-nara-size", "aria-expanded", "hidden"],
});

window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
document.addEventListener("visibilitychange", schedule, { passive: true });

document.addEventListener("click", (event) => {
  if (event.target.closest(".sn-side-backdrop,.sn-side-close,.sn-sidebar-toggle,.nara-floating-button,.nara-assistant-header button,.sn-avatar")) schedule();
}, true);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") schedule();
});

schedule();

export { RELEASE, syncDrawer, syncNara, syncProfileMenu };
