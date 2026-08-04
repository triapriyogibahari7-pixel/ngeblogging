export const RELEASE = "studio-sidebar-rescue-v251-20260804";

const SMALL = new Set(["application", "phone", "mobile", "compact", "small"]);
const LARGE = new Set(["tablet", "desktop", "laptop", "computer", "large"]);
const HIDDEN_STYLE_PROPS = [
  "display", "visibility", "opacity", "pointer-events", "left", "top", "right", "bottom",
  "width", "height", "min-width", "min-height", "max-width", "max-height", "overflow",
  "transform", "filter", "backdrop-filter", "-webkit-backdrop-filter", "z-index",
];
let frame = 0;

function root() {
  return document.documentElement;
}

function responsiveFamily() {
  const html = root();
  const responsive = String(html.dataset.studioResponsiveMode || "").toLowerCase();
  const variant = String(html.dataset.studioDeviceVariant || "").toLowerCase();
  const device = String(html.dataset.studioDeviceMode || "").toLowerCase();
  const desktopSite = html.dataset.studioDesktopSitePhone === "true" || html.dataset.desktopSitePhone === "true";
  if (desktopSite) return "large";
  if (SMALL.has(responsive)) return "small";
  if (LARGE.has(responsive) || LARGE.has(variant)) return "large";
  if (device === "small" || device === "large") return device;
  const layout = Number(document.documentElement.clientWidth || innerWidth || 0);
  const visual = Number(window.visualViewport?.width || layout || 0);
  const width = Math.min(layout || visual || 1, visual || layout || 1);
  return width <= 760 ? "small" : "large";
}

function clearHistoricalInline(node) {
  if (!node) return;
  for (const property of HIDDEN_STYLE_PROPS) node.style.removeProperty(property);
}

function restoreSidebar(shell) {
  let side = document.getElementById("ngeblogging-studio-sidebar");
  if (!side) side = shell.querySelector(":scope > aside");
  if (!side) return null;

  side.id = "ngeblogging-studio-sidebar";
  side.classList.add("sn-side");
  side.classList.remove("v244-legacy-sidebar");
  side.hidden = false;
  side.removeAttribute("inert");
  side.removeAttribute("aria-hidden");
  delete side.dataset.v244Legacy;
  clearHistoricalInline(side);

  const logo = side.querySelector(".sn-logo");
  const mark = side.querySelector(".sn-logo-mark");
  const letter = mark?.querySelector("strong");
  const brand = logo?.querySelector(":scope > b");
  if (logo) {
    logo.hidden = false;
    logo.removeAttribute("aria-hidden");
    clearHistoricalInline(logo);
  }
  if (mark) {
    mark.hidden = false;
    mark.removeAttribute("inert");
    mark.removeAttribute("aria-hidden");
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", side.id);
    clearHistoricalInline(mark);
  }
  if (letter) {
    letter.textContent = "n";
    clearHistoricalInline(letter);
  }
  if (brand) {
    brand.textContent = "Ngeblogging";
    clearHistoricalInline(brand);
  }

  const create = side.querySelector(".sn-new");
  const nav = side.querySelector(":scope > nav");
  const footer = side.querySelector(".sn-account-footer");
  for (const node of [create, nav, footer]) {
    if (!node) continue;
    node.hidden = false;
    node.removeAttribute("inert");
    node.removeAttribute("aria-hidden");
    clearHistoricalInline(node);
  }
  return side;
}

function restoreTopbar(shell) {
  const main = shell.querySelector(":scope > .sn-main") || shell.querySelector(".sn-main");
  if (!main) return { main: null, top: null };
  main.hidden = false;
  main.removeAttribute("inert");
  main.removeAttribute("aria-hidden");
  main.style.removeProperty("filter");
  main.style.removeProperty("pointer-events");

  let top = main.querySelector(":scope > .sn-top");
  if (!top) top = main.querySelector(":scope > [data-v244-legacy-top]");
  if (top) {
    top.classList.add("sn-top");
    top.hidden = false;
    top.removeAttribute("inert");
    top.removeAttribute("aria-hidden");
    delete top.dataset.v244LegacyTop;
    clearHistoricalInline(top);
  }

  const avatar = top?.querySelector(".sn-avatar") || main.querySelector(".sn-avatar");
  if (avatar) {
    avatar.hidden = false;
    avatar.removeAttribute("inert");
    avatar.removeAttribute("aria-hidden");
    avatar.setAttribute("aria-label", "Buka menu profil");
    clearHistoricalInline(avatar);
  }
  return { main, top };
}

function removeDuplicateControls() {
  document.getElementById("ngeblogging-studio-chrome-v244")?.remove();
  document.querySelectorAll([
    ".sn-sidebar-edge-toggle-v147", ".v227-sidebar-fab", ".studio-external-sidebar-toggle",
    "[data-v173-collapse-toggle]", "[data-v187-sidebar-toggle]", "[data-v208-sidebar-toggle]",
    "[data-v223-sidebar-toggle]", "[data-v229-sidebar-toggle]", "[data-studio-mode-badge]",
    "[data-device-mode-badge]", ".studio-device-mode-badge", ".v225-mode-badge",
  ].join(",")).forEach((node) => node.remove());
}

function normalizeBackdrop(mode, state) {
  document.body.classList.remove("sn-mobile-sidebar-open");
  document.querySelectorAll(".sn-side-backdrop,.sn-sidebar-backdrop,[data-legacy-sidebar-backdrop]").forEach((backdrop) => {
    backdrop.style.setProperty("background", "transparent", "important");
    backdrop.style.setProperty("filter", "none", "important");
    backdrop.style.setProperty("backdrop-filter", "none", "important");
    backdrop.style.setProperty("-webkit-backdrop-filter", "none", "important");
    if (mode === "large" || state === "closed") {
      backdrop.style.setProperty("display", "none", "important");
      backdrop.style.setProperty("pointer-events", "none", "important");
    } else {
      backdrop.style.removeProperty("display");
      backdrop.style.removeProperty("pointer-events");
    }
  });
}

function sync() {
  frame = 0;
  const shell = document.querySelector(".sn-shell");
  if (!shell) return;
  removeDuplicateControls();
  const side = restoreSidebar(shell);
  const { main, top } = restoreTopbar(shell);
  if (!side || !main) return;

  const mode = responsiveFamily();
  if (mode === "large") side.classList.remove("mobile-open");
  const state = mode === "small"
    ? (side.classList.contains("mobile-open") ? "open" : "closed")
    : (side.classList.contains("collapsed") ? "collapsed" : "expanded");

  root().dataset.studioSidebarRescueV251 = RELEASE;
  root().dataset.studioV251Family = mode;
  root().dataset.studioV251Sidebar = state;
  shell.dataset.studioSidebarRescueV251 = RELEASE;
  side.dataset.v251Family = mode;
  side.dataset.v251Sidebar = state;
  if (top) top.dataset.v251Family = mode;

  const mark = side.querySelector(".sn-logo-mark");
  if (mark) {
    mark.setAttribute("aria-expanded", String(mode === "small" ? state === "open" : state === "expanded"));
    mark.setAttribute("aria-label", mode === "small"
      ? "Tutup menu Studio"
      : state === "expanded" ? "Ciutkan menu Studio" : "Perluas menu Studio");
    mark.setAttribute("title", mark.getAttribute("aria-label"));
  }

  const topToggle = shell.querySelector(".sn-sidebar-toggle");
  if (topToggle) {
    topToggle.hidden = false;
    topToggle.removeAttribute("inert");
    topToggle.removeAttribute("aria-hidden");
    clearHistoricalInline(topToggle);
    const n = topToggle.querySelector(".sn-mobile-menu-mark strong");
    if (n) n.textContent = "n";
  }

  normalizeBackdrop(mode, state);
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
      "class", "style", "hidden", "inert", "aria-hidden", "data-studio-responsive-mode",
      "data-studio-device-mode", "data-studio-device-variant", "data-studio-desktop-site-phone",
    ],
  });
  for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) {
    window.addEventListener(eventName, schedule, { passive: true });
  }
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  schedule();
}
