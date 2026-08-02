import "./studio-production-v214.css";

const RELEASE = "studio-production-v214-20260802";
const RESPONSIVE_MODES = new Set(["application", "phone", "mobile", "compact", "tablet", "desktop"]);
const SMALL_MODES = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;

function mode() {
  const root = document.documentElement;
  const candidate = root.dataset.studioResponsiveMode || "";
  if (RESPONSIVE_MODES.has(candidate)) return candidate;
  if (root.dataset.studioDeviceMode === "small") return window.innerWidth <= 430 ? "phone" : "mobile";
  if (window.innerWidth <= 760) return "compact";
  if (window.innerWidth <= 1180) return "tablet";
  return "desktop";
}

function variant(currentMode) {
  const root = document.documentElement;
  if (currentMode !== "desktop") return currentMode;
  const candidate = root.dataset.studioDeviceVariant || "";
  if (candidate === "laptop" || candidate === "computer") return candidate;
  return window.innerWidth <= 1536 ? "laptop" : "computer";
}

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function normalizeRoot() {
  const root = document.documentElement;
  const currentMode = mode();
  root.dataset.studioProductionV214 = RELEASE;
  root.dataset.studioV214Mode = currentMode;
  root.dataset.studioV214Variant = variant(currentMode);
  root.dataset.studioV214Layout = SMALL_MODES.has(currentMode) ? "small" : "large";
}

function normalizeSidebar() {
  const root = document.documentElement;
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const main = document.querySelector(".sn-main");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const toggle = document.querySelector(".sn-sidebar-toggle");
  if (!sidebar) return;

  sidebar.dataset.v214Mode = root.dataset.studioV214Mode || mode();
  sidebar.dataset.v214Layout = root.dataset.studioV214Layout || "large";
  sidebar.removeAttribute("inert");
  sidebar.removeAttribute("aria-hidden");
  sidebar.querySelectorAll("button,a").forEach((control) => control.removeAttribute("inert"));

  for (const node of [sidebar, toggle]) {
    if (!node) continue;
    setImportant(node, "animation", "none");
    setImportant(node, "filter", "none");
  }

  if (root.dataset.studioV214Layout === "small") {
    if (main) {
      setImportant(main, "transform", "none");
      setImportant(main, "filter", "none");
      setImportant(main, "opacity", "1");
      main.removeAttribute("inert");
      main.removeAttribute("aria-hidden");
    }
    if (backdrop) {
      setImportant(backdrop, "background", "transparent");
      setImportant(backdrop, "backdrop-filter", "none");
      setImportant(backdrop, "-webkit-backdrop-filter", "none");
      setImportant(backdrop, "filter", "none");
    }
  }
}

function normalizeLayoutMap() {
  const currentMode = mode();
  document.querySelectorAll(".tn-layout-canvas-v170[data-v212-layout-map]").forEach((map) => {
    map.dataset.v214Mode = currentMode;
    map.dataset.v214Adaptive = currentMode === "phone" || currentMode === "application"
      ? "single-column"
      : currentMode === "mobile" || currentMode === "compact"
        ? "paired-small"
        : "large-map";

    const content = map.querySelector(":scope > .content-main");
    if (content) {
      content.dataset.v214LockedContent = "true";
      content.setAttribute("aria-disabled", "true");
      content.setAttribute("tabindex", "-1");
      content.setAttribute("title", "Konten utama Post/Page — bukan slot widget");
      const badge = content.querySelector(":scope > span");
      const title = content.querySelector(":scope > small");
      const description = content.querySelector(":scope > b");
      if (badge) badge.textContent = "POST / PAGE";
      if (title) title.textContent = "Konten utama";
      if (description) description.textContent = "Area tulisan utama tetap penuh; widget aktif berada di area sekeliling sesuai perangkat.";
    }
  });
}

function normalizeProfileMenu() {
  document.querySelectorAll(".sn-profile-menu-wrap").forEach((wrap) => {
    wrap.dataset.v214Profile = "separated";
    const trigger = wrap.querySelector(":scope > .sn-avatar");
    const menu = wrap.querySelector(":scope > .sn-profile-menu");
    if (trigger) {
      trigger.setAttribute("aria-haspopup", "menu");
      trigger.setAttribute("aria-controls", "ngeblogging-profile-menu-v214");
      trigger.setAttribute("aria-expanded", String(Boolean(menu)));
    }
    if (menu) {
      menu.id = "ngeblogging-profile-menu-v214";
      menu.setAttribute("role", "menu");
      menu.querySelectorAll("button").forEach((button) => {
        button.setAttribute("role", "menuitem");
        button.removeAttribute("inert");
      });
    }
  });
}

function normalizeNara() {
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  shell.dataset.v214Mode = mode();
  shell.dataset.v214Size = size;
  if (!full) {
    setImportant(layer, "pointer-events", "none");
    setImportant(layer, "background", "transparent");
    setImportant(layer, "backdrop-filter", "none");
    setImportant(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*",
    ".sc161-content-page", ".sc161-content-card", ".sc161-table-wrap",
    ".ce-app", ".ce-workspace", ".ce-paper-shell", ".ce-sidebar",
    ".tn-studio", ".tn-layout-studio", ".tn-layout-canvas-v170", ".tn-code-workspace",
    ".mv176-page", ".sv124-page", ".sn-api-page", ".op41-panel", ".op41-card",
  ].join(",")).forEach((node) => {
    setImportant(node, "min-width", "0");
    setImportant(node, "max-width", "100%");
  });
}

function sync() {
  frame = 0;
  normalizeRoot();
  normalizeSidebar();
  normalizeLayoutMap();
  normalizeProfileMenu();
  normalizeNara();
  normalizeContainment();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList:true,
  subtree:true,
  attributes:true,
  attributeFilter:[
    "class", "hidden", "aria-expanded", "data-nara-size",
    "data-studio-responsive-mode", "data-studio-device-mode", "data-studio-device-variant",
  ],
});
for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) {
  window.addEventListener(eventName, schedule, { passive:true });
}
window.visualViewport?.addEventListener?.("resize", schedule, { passive:true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
document.addEventListener("click", (event) => {
  if (!event.target.closest('.tn-layout-canvas-v170[data-v212-layout-map] > .content-main')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

sync();

export {
  RELEASE,
  RESPONSIVE_MODES,
  SMALL_MODES,
  mode,
  variant,
  normalizeSidebar,
  normalizeLayoutMap,
  normalizeProfileMenu,
  normalizeNara,
  normalizeContainment,
  sync,
};
