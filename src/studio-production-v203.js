import "./studio-production-v203.css";

const RELEASE = "studio-production-v203-20260802";
const MOBILE_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function physicalShortEdge() {
  try {
    const values = [
      Number(screen?.width || 0),
      Number(screen?.height || 0),
      Number(visualViewport?.width || 0),
      Number(visualViewport?.height || 0),
    ].filter((value) => Number.isFinite(value) && value > 0);
    return values.length ? Math.min(...values) : 0;
  } catch {
    return 0;
  }
}

function cssPhysicalWidth() {
  try {
    const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--studio-physical-width"));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function mobileLike() {
  const root = document.documentElement;
  const family = root.dataset.studioResponsiveMode
    || root.dataset.studioResponsiveFamilyV193
    || root.dataset.studioResponsiveFamily
    || "";
  const declared = root.dataset.studioPhysicalMobileV193 === "true"
    || root.dataset.studioPhysicalMobileV191 === "true"
    || root.dataset.studioHandheld === "true"
    || root.dataset.studioDesktopSitePhone === "true"
    || MOBILE_FAMILIES.has(family);
  const uaMobile = navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "");
  const shortEdge = physicalShortEdge();
  const physicalWidth = cssPhysicalWidth();
  return declared
    || uaMobile
    || (shortEdge > 0 && shortEdge <= 760)
    || (physicalWidth > 0 && physicalWidth <= 760)
    || window.innerWidth <= 760;
}

function normalizeCreateActions() {
  document.querySelectorAll(".sc161-content-page > .sn-page-title > .sn-primary").forEach((button) => {
    button.hidden = false;
    button.disabled = false;
    button.removeAttribute("hidden");
    button.removeAttribute("inert");
    button.removeAttribute("aria-hidden");
    button.style.removeProperty("display");
    button.style.removeProperty("visibility");
    button.style.removeProperty("opacity");
  });
}

function normalizeDrawer() {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const main = document.querySelector(".sn-main");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));
  document.documentElement.dataset.studioDrawerV203 = open ? "open" : "closed";

  sidebar?.removeAttribute("inert");
  sidebar?.removeAttribute("aria-hidden");
  if (open) {
    sidebar?.querySelectorAll("button,a,input,select,textarea").forEach((node) => {
      node.removeAttribute("inert");
      node.removeAttribute("aria-hidden");
      if (node.tabIndex < 0 && !node.disabled) node.tabIndex = 0;
    });
  }

  main?.removeAttribute("inert");
  main?.removeAttribute("aria-hidden");
  if (main) {
    main.style.removeProperty("filter");
    main.style.removeProperty("opacity");
    main.style.removeProperty("transform");
  }

  if (backdrop) {
    backdrop.hidden = !open;
    backdrop.setAttribute("aria-hidden", String(!open));
    setImportant(backdrop, "background", "transparent");
    setImportant(backdrop, "backdrop-filter", "none");
    setImportant(backdrop, "-webkit-backdrop-filter", "none");
    setImportant(backdrop, "filter", "none");
  }
}

function normalizeNara() {
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;

  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v203Mode = full ? "modal" : "nonmodal";
  shell.dataset.v203Nara = "stable-mobile-controls";
  layer.setAttribute("aria-modal", String(full));
  shell.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.inert = !full;
    backdrop.tabIndex = full ? 0 : -1;
    backdrop.setAttribute("aria-hidden", String(!full));
  }

  if (!full) {
    setImportant(layer, "pointer-events", "none");
    setImportant(layer, "background", "transparent");
    setImportant(layer, "backdrop-filter", "none");
    setImportant(layer, "-webkit-backdrop-filter", "none");
    setImportant(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  } else {
    layer.style.removeProperty("pointer-events");
  }

  const close = shell.querySelector('button[title="Tutup"],button[aria-label="Tutup Nara AI"],button[aria-label="Tutup Nara"]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("hidden");
    close.removeAttribute("inert");
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara AI");
  }

  shell.querySelectorAll(".nara-size-controls-v147 button,.nara-auto-voice-v148,.nara-select,.nara-composer-tools button").forEach((node) => {
    node.style.removeProperty("animation");
    node.style.removeProperty("transition");
    node.style.removeProperty("transform");
    node.style.removeProperty("filter");
  });
}

function normalizeDiagnostics() {
  const selectors = [
    [".sc161-content-page", "content"],
    [".mv176-page", "members"],
    [".sv124-page", "domain"],
    [".ce-app", "editor"],
    [".tn-studio", "theme"],
  ];
  for (const [selector, name] of selectors) {
    document.querySelectorAll(selector).forEach((node) => { node.dataset.v203Surface = name; });
  }
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*",
    ".sc161-content-page", ".sc161-content-card", ".sc161-table-wrap", ".sc161-table",
    ".mv176-page", ".mv176-card", ".mv176-list",
    ".sv124-page", ".sv124-card",
    ".ce-app", ".ce-workspace", ".ce-paper-shell", ".ce-sidebar",
    ".tn-studio", ".tn-code-workspace", ".tn-layout-studio",
  ].join(",")).forEach((node) => {
    setImportant(node, "min-width", "0");
    setImportant(node, "max-width", "100%");
  });
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  root.dataset.studioProductionV203 = RELEASE;
  root.dataset.studioMobileV203 = String(mobileLike());
  normalizeDrawer();
  normalizeCreateActions();
  normalizeNara();
  normalizeDiagnostics();
  normalizeContainment();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    "class", "data-nara-size", "aria-expanded",
    "data-studio-responsive-mode", "data-studio-handheld",
    "data-studio-physical-mobile-v193", "data-studio-physical-mobile-v191",
    "data-studio-desktop-site-phone",
  ],
});

for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) {
  window.addEventListener(eventName, schedule, { passive: true });
}
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

sync();

export {
  RELEASE,
  mobileLike,
  normalizeCreateActions,
  normalizeDrawer,
  normalizeNara,
  normalizeContainment,
  sync,
};
