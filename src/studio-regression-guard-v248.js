import "./studio-regression-guard-v248.css";

export const RELEASE = "studio-regression-guard-v248-20260803";

const SMALL = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;
let observer = null;

function important(node, property, value) {
  node?.style?.setProperty(property, value, "important");
}

function family() {
  const root = document.documentElement;
  const responsive = String(root.dataset.studioResponsiveMode || "").toLowerCase();
  const device = String(root.dataset.studioDeviceMode || "").toLowerCase();
  const desktopSite = root.dataset.studioDesktopSitePhone === "true" || root.dataset.desktopSitePhone === "true";
  if (desktopSite) return "large";
  if (SMALL.has(responsive)) return "small";
  if (["tablet", "desktop"].includes(responsive)) return "large";
  if (device === "small" || device === "large") return device;
  return Math.min(window.visualViewport?.width || innerWidth, document.documentElement.clientWidth || innerWidth) <= 760 ? "small" : "large";
}

function removeConflictingChrome() {
  // v244-v247 created a second navigation shell. v248 returns ownership to the
  // React sidebar + v234/v241/v242 authorities that already contain Theme/Nara
  // interactions requested by the product contract.
  document.getElementById("ngeblogging-studio-chrome-v244")?.remove();
  document.querySelectorAll(".sn-sidebar-edge-toggle-v147,.sn-side-close,.v227-sidebar-fab,.studio-external-sidebar-toggle,[data-v173-collapse-toggle],[data-v187-sidebar-toggle],[data-v208-sidebar-toggle],[data-v223-sidebar-toggle],[data-v229-sidebar-toggle]").forEach((node) => {
    node.hidden = true;
    important(node, "display", "none");
    important(node, "pointer-events", "none");
  });
}

function unlockNonModalSurfaces() {
  const naraShell = document.querySelector(".nara-assistant-layer > .nara-assistant-shell");
  const naraSize = naraShell?.dataset.naraSize || "";
  if (naraShell && naraSize !== "full") {
    document.body.classList.remove("nara-modal-open");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
    document.querySelectorAll(".sn-shell,.sn-main").forEach((node) => {
      node.removeAttribute("inert");
      node.removeAttribute("aria-hidden");
      important(node, "filter", "none");
      important(node, "pointer-events", "auto");
    });
    document.querySelectorAll(".nara-assistant-backdrop").forEach((backdrop) => {
      important(backdrop, "display", "none");
      important(backdrop, "pointer-events", "none");
      important(backdrop, "background", "transparent");
      important(backdrop, "backdrop-filter", "none");
      important(backdrop, "-webkit-backdrop-filter", "none");
    });
  }
}

function normalizeSidebar() {
  const root = document.documentElement;
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const topToggle = document.querySelector(".sn-top .sn-sidebar-toggle");
  const logo = sidebar?.querySelector(".sn-logo-mark");
  if (!sidebar || !topToggle || !logo) return;

  const mode = family();
  const open = sidebar.classList.contains("mobile-open");
  const collapsed = sidebar.classList.contains("collapsed");
  root.dataset.studioRegressionGuardV248 = RELEASE;
  root.dataset.v248Family = mode;
  root.dataset.v248Sidebar = mode === "small" ? (open ? "drawer-open" : "drawer-closed") : (collapsed ? "icons" : "open");

  logo.setAttribute("role", "button");
  logo.setAttribute("tabindex", "0");
  logo.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
  logo.setAttribute("aria-label", mode === "small" ? "Tutup menu Studio" : collapsed ? "Perluas menu Studio" : "Ciutkan menu Studio");
  const letter = logo.querySelector("strong");
  if (letter) {
    letter.textContent = "n";
    important(letter, "display", "grid");
    important(letter, "place-items", "center");
    important(letter, "color", "#ffffff");
    important(letter, "opacity", "1");
  }
  logo.querySelector("i")?.style.setProperty("display", "none", "important");

  const brand = sidebar.querySelector(".sn-logo > b");
  if (brand) {
    brand.textContent = "Ngeblogging";
    important(brand, "writing-mode", "horizontal-tb");
    important(brand, "text-orientation", "mixed");
  }

  if (mode === "small") {
    topToggle.hidden = open;
    important(topToggle, "display", open ? "none" : "grid");
    document.body.classList.toggle("sn-mobile-sidebar-open", open);
  } else {
    topToggle.hidden = true;
    important(topToggle, "display", "none");
    document.body.classList.remove("sn-mobile-sidebar-open");
  }

  const nav = sidebar.querySelector(":scope > nav");
  if (nav) {
    important(nav, "justify-content", "flex-start");
    important(nav, "gap", "2px");
    important(nav, "padding-top", "4px");
    important(nav, "overflow-y", "auto");
  }
  sidebar.querySelector(":scope > .sn-account-footer")?.style.setProperty("margin-top", "auto", "important");
}

function normalizeTopbar() {
  const top = document.querySelector(".sn-main > .sn-top");
  if (!top) return;
  top.querySelectorAll("[data-studio-mode-badge],[data-device-mode-badge],.studio-device-mode-badge,.v225-mode-badge").forEach((node) => {
    node.hidden = true;
    important(node, "display", "none");
  });
  const workspace = top.querySelector(".sn-workspace");
  if (workspace) {
    workspace.hidden = true;
    important(workspace, "display", "none");
  }
  const actions = top.querySelector(".sn-top-actions");
  if (actions) important(actions, "margin-left", "auto");
  const avatar = top.querySelector(".sn-avatar");
  if (avatar) {
    avatar.hidden = false;
    avatar.removeAttribute("aria-hidden");
    avatar.setAttribute("aria-haspopup", "menu");
    avatar.setAttribute("aria-label", "Buka menu profil");
    important(avatar, "display", "grid");
    important(avatar, "place-items", "center");
    important(avatar, "visibility", "visible");
    important(avatar, "opacity", "1");
  }
}

function normalizeGeometry() {
  document.querySelectorAll(".sn-main,.sn-main>*,.sn-view-pad,.sn-view-pad>*,.sv124-page,.sv124-page>*,.tn-studio,.tn-studio>*,.ce-app,.ce-app>*,.sn-settings-grid,.sn-settings-grid>*").forEach((node) => {
    important(node, "min-width", "0");
    important(node, "max-width", "100%");
  });
}

function sync() {
  frame = 0;
  if (!document.querySelector(".sn-shell")) return;
  removeConflictingChrome();
  normalizeSidebar();
  normalizeTopbar();
  normalizeGeometry();
  unlockNonModalSurfaces();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

if (typeof document !== "undefined") {
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  observer = new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" || ["class", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-mode"].includes(record.attributeName))) schedule();
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-mode"],
  });
  schedule();
}
