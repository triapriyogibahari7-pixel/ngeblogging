export const RELEASE = "studio-shell-interaction-v255-20260804";

const SMALL_FAMILIES = new Set(["application", "phone", "mobile", "compact", "small"]);
const LARGE_FAMILIES = new Set(["tablet", "desktop", "laptop", "computer", "large"]);
let frame = 0;

function root() {
  return document.documentElement;
}

function family() {
  const html = root();
  const finalFamily = String(html.dataset.studioV253Family || "").toLowerCase();
  if (finalFamily === "small" || finalFamily === "large") return finalFamily;
  const responsive = String(html.dataset.studioResponsiveMode || html.dataset.studioDeviceVariant || "").toLowerCase();
  if (SMALL_FAMILIES.has(responsive)) return "small";
  if (LARGE_FAMILIES.has(responsive)) return "large";
  return Math.min(document.documentElement.clientWidth || innerWidth || 1, visualViewport?.width || innerWidth || 1) <= 760 ? "small" : "large";
}

function sidebar() {
  return document.getElementById("ngeblogging-studio-sidebar");
}

function reactToggle() {
  return document.querySelector(".sn-shell .sn-sidebar-toggle");
}

function closeProfileMenu() {
  document.querySelector(".sn-profile-menu-v150")?.remove();
  document.querySelector(".sn-avatar")?.setAttribute("aria-expanded", "false");
}

function toggleThroughReact() {
  const toggle = reactToggle();
  if (!toggle) return false;
  toggle.click();
  requestAnimationFrame(schedule);
  return true;
}

function normalizeLogo() {
  const side = sidebar();
  const logo = side?.querySelector(".sn-logo-mark");
  if (!side || !logo) return;
  const currentFamily = family();
  const open = side.classList.contains("mobile-open");
  const collapsed = side.classList.contains("collapsed");
  logo.dataset.v255Toggle = "react-owner";
  logo.setAttribute("role", "button");
  logo.setAttribute("tabindex", "0");
  logo.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
  logo.setAttribute("aria-expanded", String(currentFamily === "small" ? open : !collapsed));
  logo.setAttribute("aria-label", currentFamily === "small"
    ? (open ? "Tutup menu Studio" : "Buka menu Studio")
    : (collapsed ? "Perluas menu Studio" : "Ciutkan menu Studio"));
  logo.setAttribute("title", logo.getAttribute("aria-label"));
  const letter = logo.querySelector("strong");
  if (letter && letter.textContent !== "n") letter.textContent = "n";
  const brand = side.querySelector(".sn-logo > b");
  if (brand && brand.textContent !== "Ngeblogging") brand.textContent = "Ngeblogging";
}

function normalizeProfileMenu() {
  const menu = document.querySelector(".sn-profile-menu-v150");
  if (!menu) return;
  menu.dataset.v255ProfileMenu = "six-actions-bounded";

  if (!menu.querySelector('[data-action="add-site"]')) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.dataset.action = "add-site";
    button.innerHTML = "<span>Tambahkan situs</span><small>Buat atau pilih situs lain</small>";
    const settings = menu.querySelector('[data-action="settings"]');
    settings?.after(button);
  }

  if (!menu.querySelector('[data-action="view-site"]')) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.dataset.action = "view-site";
    button.innerHTML = "<span>Lihat situs</span><small>Buka situs aktif</small>";
    const addSite = menu.querySelector('[data-action="add-site"]');
    addSite?.after(button);
  }

  const desired = ["profile", "settings", "add-site", "view-site", "install", "logout"];
  const buttons = new Map([...menu.querySelectorAll("button[data-action]")].map((button) => [button.dataset.action, button]));
  desired.forEach((action) => {
    const button = buttons.get(action);
    if (button) menu.append(button);
  });
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v255Launcher = "fixed-corner";
    launcher.hidden = false;
    launcher.removeAttribute("aria-hidden");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const panel = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !panel) return;
  const size = ["small", "medium", "full"].includes(panel.dataset.naraSize) ? panel.dataset.naraSize : "small";
  const full = size === "full";
  layer.dataset.v255Size = size;
  layer.dataset.v255Interaction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  panel.dataset.v255Panel = "stable";

  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.tabIndex = full ? 0 : -1;
    backdrop.setAttribute("aria-hidden", String(!full));
  }

  if (!full) {
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
    document.documentElement.style.removeProperty("overflow");
  }

  const attachmentMenu = panel.querySelector(".nara-attachment-menu");
  if (attachmentMenu) attachmentMenu.dataset.v255AttachmentMenu = "viewport-safe";
}

function normalizeGeometry() {
  const html = root();
  const side = sidebar();
  const shell = document.querySelector(".sn-shell");
  if (!side || !shell) return;
  const currentFamily = family();
  const state = currentFamily === "small"
    ? (side.classList.contains("mobile-open") ? "open" : "closed")
    : (side.classList.contains("collapsed") ? "collapsed" : "expanded");
  html.dataset.studioV255Family = currentFamily;
  html.dataset.studioV255Sidebar = state;
  html.dataset.studioShellInteractionV255 = RELEASE;
  shell.dataset.studioShellInteractionV255 = RELEASE;

  side.hidden = false;
  side.removeAttribute("hidden");
  side.removeAttribute("inert");
  side.removeAttribute("aria-hidden");

  const avatar = shell.querySelector(".sn-avatar");
  if (avatar) {
    avatar.hidden = false;
    avatar.removeAttribute("hidden");
    avatar.removeAttribute("inert");
    avatar.removeAttribute("aria-hidden");
    avatar.setAttribute("aria-label", "Buka menu profil");
  }

  document.querySelectorAll([
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
    ".sn-side-close",
  ].join(",")).forEach((node) => node.remove());
}

function sync() {
  frame = 0;
  normalizeGeometry();
  normalizeLogo();
  normalizeProfileMenu();
  normalizeNara();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

function handleLogoActivation(event) {
  const logo = event.target.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (!logo) return false;
  if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return false;
  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
  toggleThroughReact();
  return true;
}

function handleProfileAction(event) {
  const actionButton = event.target.closest?.(".sn-profile-menu-v150 button[data-action]");
  if (!actionButton) return false;
  const action = actionButton.dataset.action;
  if (!["profile", "settings", "add-site", "view-site"].includes(action)) return false;
  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();

  if (action === "profile" || action === "settings") {
    root().dataset.studioAccountViewV189 = action;
    document.querySelector(".sn-account-settings-v135")?.click();
  } else if (action === "add-site") {
    document.querySelector(".sn-workspace")?.click();
  } else if (action === "view-site") {
    document.querySelector(".sn-view-site")?.click();
  }
  closeProfileMenu();
  requestAnimationFrame(schedule);
  return true;
}

function handleNavigationAutoClose(event) {
  const button = event.target.closest?.("#ngeblogging-studio-sidebar nav > button,#ngeblogging-studio-sidebar .sn-account-settings-v135");
  if (!button) return;
  const side = sidebar();
  if (!side) return;
  const currentFamily = family();
  requestAnimationFrame(() => {
    if (currentFamily === "small") {
      if (side.classList.contains("mobile-open")) toggleThroughReact();
      return;
    }
    if (!side.classList.contains("collapsed")) toggleThroughReact();
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    if (handleLogoActivation(event)) return;
    if (handleProfileAction(event)) return;
    handleNavigationAutoClose(event);
  }, true);
  document.addEventListener("keydown", handleLogoActivation, true);

  new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" || record.attributeName === "class" || record.attributeName?.startsWith("data-"))) schedule();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "class",
      "hidden",
      "inert",
      "data-nara-size",
      "data-studio-v253-family",
      "data-studio-device-mode",
      "data-studio-responsive-mode",
      "data-studio-device-variant",
    ],
  });

  for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) {
    window.addEventListener(eventName, schedule, { passive: true });
  }
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  schedule();
}

export { family, sync, toggleThroughReact };
