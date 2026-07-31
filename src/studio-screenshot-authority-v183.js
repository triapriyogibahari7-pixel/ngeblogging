import "./studio-screenshot-authority-v183.css";

const RELEASE = "studio-screenshot-authority-v183-20260731";
let frame = 0;

function isStandalone() {
  return Boolean(
    window.matchMedia?.("(display-mode: standalone)")?.matches
    || window.matchMedia?.("(display-mode: fullscreen)")?.matches
    || window.navigator.standalone === true
  );
}

function responsiveFamily() {
  if (isStandalone()) return "application";
  const width = Math.max(1, window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 1);
  if (width <= 360) return "phone";
  if (width <= 480) return "mobile";
  if (width <= 700) return "compact";
  if (width <= 1024) return "tablet";
  return "desktop";
}

function desktopVariant() {
  const width = Math.max(1, window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 1);
  if (width <= 1366) return "laptop";
  if (width <= 1720) return "desktop";
  return "computer";
}

function syncResponsiveMode() {
  const root = document.documentElement;
  const family = responsiveFamily();
  root.dataset.studioResponsiveFamilyV183 = family;
  root.dataset.studioDesktopVariantV183 = family === "desktop" ? desktopVariant() : "not-desktop";
  root.dataset.studioApplicationModeV183 = isStandalone() ? "installed" : "browser";
}

function sidebarNode() {
  return document.querySelector("#ngeblogging-studio-sidebar")
    || document.querySelector(".sn-shell > .sn-side");
}

function syncDrawer() {
  const root = document.documentElement;
  const sidebar = sidebarNode();
  const main = document.querySelector(".sn-main");
  const backdrop = document.querySelector(".sn-side-backdrop");
  if (!sidebar) {
    root.dataset.studioDrawerV183 = "missing";
    document.body.classList.remove("v183-drawer-open");
    return;
  }

  const open = sidebar.classList.contains("mobile-open");
  root.dataset.studioDrawerV183 = open ? "open" : "closed";
  sidebar.dataset.drawerAuthorityV183 = RELEASE;
  sidebar.removeAttribute("inert");
  main?.removeAttribute("inert");

  if (open) {
    sidebar.setAttribute("aria-hidden", "false");
    sidebar.querySelectorAll("button,a,input,select,textarea,[tabindex]").forEach((node) => {
      node.removeAttribute("inert");
      if (node.getAttribute("aria-hidden") === "true") node.removeAttribute("aria-hidden");
    });
    const width = Math.max(0, Math.round(sidebar.getBoundingClientRect().width));
    if (width) root.style.setProperty("--v183-drawer-width", `${width}px`);
    if (backdrop) {
      backdrop.dataset.drawerBackdropV183 = "outside-only";
      backdrop.setAttribute("aria-label", "Tutup menu Studio");
      backdrop.removeAttribute("inert");
    }
  } else {
    for (const className of [
      "sn-mobile-sidebar-open",
      "sn-mobile-sidebar-open-v176",
      "sm176-drawer-open",
      "sm177-drawer-open",
      "v179-drawer-open",
    ]) document.body.classList.remove(className);
    document.body.style.removeProperty("overflow");
  }

  document.body.classList.toggle("v183-drawer-open", open);
}

function syncProfile() {
  const menu = document.querySelector(".sn-profile-menu-v150,.sn-account-menu-v179");
  if (menu) {
    if (menu.parentElement !== document.body) document.body.append(menu);
    menu.dataset.profileAuthorityV183 = RELEASE;
    menu.setAttribute("aria-label", "Menu akun: Profil, Pengaturan, dan Keluar");
    menu.querySelector('[data-action="profile"]')?.setAttribute("aria-label", "Buka Profil");
    menu.querySelector('[data-action="settings"]')?.setAttribute("aria-label", "Buka Pengaturan");
    menu.querySelector('[data-action="logout"]')?.setAttribute("aria-label", "Keluar dari akun");
  }

  document.querySelectorAll(".sn-top .sn-avatar,.sn-top-actions > .sn-avatar").forEach((avatar) => {
    avatar.dataset.avatarBoundedV183 = RELEASE;
    avatar.removeAttribute("width");
    avatar.removeAttribute("height");
  });
}

function naraSize(shell) {
  const value = shell?.dataset.naraSize || shell?.getAttribute("data-size") || "small";
  return ["small", "medium", "full"].includes(value) ? value : "small";
}

function syncNara() {
  const launchers = [...document.querySelectorAll(".nara-floating-button")];
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell")
    || layer?.querySelector(".nara-assistant-shell");

  launchers.forEach((launcher, index) => {
    if (index > 0) {
      launcher.remove();
      return;
    }
    launcher.dataset.naraLauncherV183 = RELEASE;
    launcher.setAttribute("aria-label", "Buka Nara AI");
    launcher.hidden = Boolean(layer);
  });

  document.body.classList.toggle("v183-nara-open", Boolean(layer));
  if (!layer || !shell) {
    document.body.classList.remove("v183-nara-full");
    return;
  }

  const size = naraSize(shell);
  const full = size === "full";
  shell.dataset.naraSize = size;
  shell.dataset.naraAuthorityV183 = RELEASE;
  layer.dataset.v183NaraMode = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop")
    || layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.tabIndex = full ? 0 : -1;
    backdrop.setAttribute("aria-hidden", String(!full));
    backdrop.style.display = full ? "" : "none";
    backdrop.style.pointerEvents = full ? "auto" : "none";
  }

  const header = shell.querySelector(".nara-assistant-header");
  const close = header?.querySelector('[data-nara-close-v177],button[aria-label*="Tutup" i],button[title*="Tutup" i]')
    || header?.querySelector("button:last-child");
  if (close) {
    close.dataset.v183Close = "true";
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara AI");
    close.title = "Tutup Nara AI";
  }

  document.body.classList.toggle("v183-nara-full", full);
  if (!full) {
    for (const className of [
      "nara-scroll-lock",
      "nara-fullscreen-open-v148",
      "nara-fullscreen-open-v176",
      "nara-fullscreen-open",
      "sm177-nara-full",
      "v179-nara-full",
      "nara-full-v179",
    ]) document.body.classList.remove(className);
    document.documentElement.classList.remove("nara-scroll-lock");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }
}

function syncPageFlow() {
  const pages = document.querySelectorAll(
    ".sn-view-pad,.sv124-page,.mv176-page,.sn-api-page,.tn-studio,.ce-app"
  );
  pages.forEach((page) => {
    page.dataset.pageFlowV183 = "normal";
    page.removeAttribute("inert");
  });
}

function normalizeRawNetworkErrors() {
  const root = document.body;
  if (!root || typeof NodeFilter === "undefined") return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets = [];
  while (walker.nextNode()) {
    const value = String(walker.currentNode.nodeValue || "").trim();
    if (value === "TypeError: Failed to fetch" || value === "Failed to fetch") targets.push(walker.currentNode);
  }
  for (const textNode of targets) {
    const host = textNode.parentElement;
    if (!host || host.closest("script,style")) continue;
    textNode.nodeValue = "Koneksi data belum stabil. Sesi dan draf tetap disimpan; periksa internet lalu coba lagi.";
    host.dataset.networkErrorV183 = "contained";
    host.setAttribute("role", "alert");
  }
}

function scrollStudioToTop() {
  requestAnimationFrame(() => {
    document.querySelector(".sn-main")?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
  });
}

function sync() {
  frame = 0;
  document.documentElement.dataset.studioScreenshotAuthorityV183 = RELEASE;
  document.documentElement.dataset.studioSessionPolicyV183 = "persist-until-explicit-logout";
  syncResponsiveMode();
  syncDrawer();
  syncProfile();
  syncNara();
  syncPageFlow();
  normalizeRawNetworkErrors();
}

function schedule() {
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

const observer = new MutationObserver((mutations) => {
  const relevant = mutations.some((mutation) => (
    mutation.type === "childList"
      ? mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0
      : mutation.type === "attributes"
  ));
  if (relevant) schedule();
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    "class",
    "hidden",
    "inert",
    "aria-hidden",
    "aria-expanded",
    "data-device-mode",
    "data-nara-size",
  ],
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".sn-side button,.sn-account-footer button,.sn-account-menu-v179 button,.sn-profile-menu-v150 button")) {
    scrollStudioToTop();
  }
  schedule();
}, true);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const sidebar = sidebarNode();
  if (sidebar?.classList.contains("mobile-open")) {
    const close = sidebar.querySelector(".sn-side-close");
    close?.click();
  }
  schedule();
});

for (const type of ["resize", "orientationchange", "pageshow", "online"]) {
  window.addEventListener(type, schedule, { passive: true });
}
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
window.matchMedia?.("(display-mode: standalone)")?.addEventListener?.("change", schedule);

sync();

export {
  RELEASE,
  sync,
  syncResponsiveMode,
  syncDrawer,
  syncProfile,
  syncNara,
  syncPageFlow,
  scrollStudioToTop,
};
