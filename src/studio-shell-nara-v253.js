export const RELEASE = "studio-shell-nara-v253-20260804";
export const FAMILY_SYNC_RELEASE = "studio-family-sync-v254-hotfix-20260804";

let frame = 0;

function root() {
  return document.documentElement;
}

function responsiveFamily() {
  const html = root();
  const responsive = String(html.dataset.studioResponsiveMode || html.dataset.deviceFamily || "").toLowerCase();
  const desktopSitePhone = html.dataset.studioDesktopSitePhone === "true" || html.dataset.desktopSitePhone === "true";
  if (desktopSitePhone) return "large";
  if (["application", "phone", "mobile", "compact"].includes(responsive)) return "small";
  if (["tablet", "desktop", "laptop", "computer", "large"].includes(responsive)) return "large";
  const layout = Number(document.documentElement.clientWidth || window.innerWidth || 0);
  const visual = Number(window.visualViewport?.width || layout || 0);
  return Math.min(layout || visual || 1, visual || layout || 1) <= 760 ? "small" : "large";
}

function sidebar() {
  return document.getElementById("ngeblogging-studio-sidebar");
}

function sidebarState(side, family) {
  if (!side) return family === "small" ? "closed" : "expanded";
  if (family === "small") return side.classList.contains("mobile-open") ? "open" : "closed";
  return side.classList.contains("collapsed") ? "collapsed" : "expanded";
}

function synchronizeReactDeviceMode(html, family) {
  const expected = family === "small" ? "small" : "large";
  html.dataset.studioFamilySyncV254 = FAMILY_SYNC_RELEASE;
  if (html.dataset.studioDeviceMode === expected) return false;
  html.dataset.studioDeviceMode = expected;
  window.dispatchEvent(new CustomEvent("ngeblogging:studio-device-mode-change", {
    detail: {
      mode: expected,
      family,
      release: FAMILY_SYNC_RELEASE,
      source: "studio-shell-nara-v253",
    },
  }));
  return true;
}

function syncSidebar() {
  const html = root();
  const shell = document.querySelector(".sn-shell");
  const side = sidebar();
  if (!shell || !side) return;

  const family = responsiveFamily();
  synchronizeReactDeviceMode(html, family);
  const state = sidebarState(side, family);
  html.dataset.studioShellNaraV253 = RELEASE;
  html.dataset.studioV253Family = family;
  html.dataset.studioV253Sidebar = state;
  shell.dataset.studioShellNaraV253 = RELEASE;

  side.hidden = false;
  side.removeAttribute("hidden");
  side.removeAttribute("inert");
  side.removeAttribute("aria-hidden");

  const logo = side.querySelector(".sn-logo-mark");
  if (logo) {
    logo.hidden = false;
    logo.removeAttribute("hidden");
    logo.removeAttribute("inert");
    logo.removeAttribute("aria-hidden");
    logo.setAttribute("role", "button");
    logo.setAttribute("tabindex", "0");
    logo.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    logo.setAttribute("aria-expanded", String(family === "small" ? state === "open" : state === "expanded"));
    logo.setAttribute("aria-label", family === "small"
      ? (state === "open" ? "Tutup menu Studio" : "Buka menu Studio")
      : (state === "expanded" ? "Ciutkan menu Studio" : "Perluas menu Studio"));
    logo.setAttribute("title", logo.getAttribute("aria-label"));
    const letter = logo.querySelector("strong");
    if (letter) letter.textContent = "n";
  }

  const brand = side.querySelector(".sn-logo>b");
  if (brand) brand.textContent = "Ngeblogging";

  const avatar = shell.querySelector(".sn-avatar");
  if (avatar) {
    avatar.hidden = false;
    avatar.removeAttribute("hidden");
    avatar.removeAttribute("inert");
    avatar.removeAttribute("aria-hidden");
    avatar.setAttribute("aria-label", "Buka menu profil");
  }

  if (family === "large") {
    document.body.classList.remove("sn-mobile-sidebar-open");
    side.classList.remove("mobile-open");
  }
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  const layer = document.querySelector(".nara-assistant-layer");
  const panel = layer?.querySelector(".nara-assistant-shell");

  if (!layer || !panel) {
    if (launcher) {
      launcher.hidden = false;
      launcher.removeAttribute("hidden");
      launcher.removeAttribute("aria-hidden");
      launcher.style.removeProperty("display");
    }
    document.body.classList.remove("nara-v253-open", "nara-v253-full");
    return;
  }

  const size = ["small", "medium", "full"].includes(panel.dataset.naraSize)
    ? panel.dataset.naraSize
    : "small";
  const full = size === "full";
  layer.dataset.v253Size = size;
  layer.dataset.v253Interaction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  document.body.classList.add("nara-v253-open");
  document.body.classList.toggle("nara-v253-full", full);

  if (launcher) {
    launcher.hidden = true;
    launcher.setAttribute("aria-hidden", "true");
  }

  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
    backdrop.tabIndex = full ? 0 : -1;
  }

  if (!full) {
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
    document.documentElement.style.removeProperty("overflow");
  }
}

function cleanupDuplicateChrome() {
  document.querySelectorAll([
    "#ngeblogging-studio-chrome-v244",
    ".sn-sidebar-edge-toggle-v147",
    ".v227-sidebar-fab",
    ".studio-external-sidebar-toggle",
    "[data-v173-collapse-toggle]",
    "[data-v187-sidebar-toggle]",
    "[data-v208-sidebar-toggle]",
    "[data-v223-sidebar-toggle]",
    "[data-v229-sidebar-toggle]",
    "[data-studio-mode-badge]",
    "[data-device-mode-badge]",
    ".studio-device-mode-badge",
    ".v225-mode-badge",
    ".sn-device-mode-badge-v148",
  ].join(",")).forEach((node) => node.remove());
}

function sync() {
  frame = 0;
  cleanupDuplicateChrome();
  syncSidebar();
  syncNara();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

if (typeof document !== "undefined") {
  new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" || record.type === "attributes")) schedule();
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [
      "class",
      "hidden",
      "inert",
      "aria-hidden",
      "data-nara-size",
      "data-studio-responsive-mode",
      "data-studio-device-mode",
      "data-studio-device-variant",
      "data-studio-desktop-site-phone",
      "data-desktop-site-phone",
    ],
  });

  for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) {
    window.addEventListener(eventName, schedule, { passive: true });
  }
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  schedule();
}