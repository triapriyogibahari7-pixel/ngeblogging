import "./studio-production-v208.css";
import { recoverMembership } from "./studio-production-v206.js";

const RELEASE = "studio-production-v208-20260802";
const MOBILE_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;
let startupRecovery = null;

function physicalShortEdge() {
  try {
    const values = [screen?.width, screen?.height, visualViewport?.width, visualViewport?.height]
      .map(Number)
      .filter((value) => Number.isFinite(value) && value > 0);
    return values.length ? Math.min(...values) : 0;
  } catch {
    return 0;
  }
}

function mobileLike() {
  const root = document.documentElement;
  const family = root.dataset.studioResponsiveMode || root.dataset.studioResponsiveFamilyV193 || "";
  return root.dataset.studioPhysicalMobileV193 === "true"
    || root.dataset.studioDesktopSitePhone === "true"
    || MOBILE_FAMILIES.has(family)
    || navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")
    || (physicalShortEdge() > 0 && physicalShortEdge() <= 760)
    || window.innerWidth <= 760;
}

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function buttonText(button) {
  return String(button?.getAttribute("aria-label") || button?.title || button?.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureVisibleLabel(button, label, action) {
  if (!button) return;
  button.dataset.v208ThemeAction = action;
  button.hidden = false;
  button.disabled = false;
  button.removeAttribute("hidden");
  button.removeAttribute("inert");
  button.removeAttribute("aria-hidden");
  button.setAttribute("aria-label", label);
  button.title = label;
  let visible = button.querySelector(":scope > .v208-button-label");
  if (!visible) {
    visible = document.createElement("span");
    visible.className = "v208-button-label";
    button.append(visible);
  }
  if (visible.textContent !== label) visible.textContent = label;
}

function ensureLayoutButton(hero, customize) {
  let layout = hero.querySelector(':scope > button[data-v208-theme-action="layout"],:scope > button[data-v207-theme-action="layout"],:scope > button[data-v206-theme-action="layout"],:scope > button[data-v202-theme-action="layout"],:scope > .v202-theme-layout-button');
  if (layout) return layout;
  layout = document.createElement("button");
  layout.type = "button";
  layout.className = "v208-theme-layout-button";
  layout.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/></svg><span class="v208-button-label">Edit Tata Letak</span>';
  layout.addEventListener("click", () => {
    const target = document.querySelector(".tn-layout-studio");
    if (!target) return;
    target.setAttribute("tabindex", "-1");
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => target.focus({ preventScroll: true }), 260);
  });
  if (customize?.nextSibling) hero.insertBefore(layout, customize.nextSibling);
  else hero.append(layout);
  return layout;
}

function normalizeThemeActions() {
  const hero = document.querySelector(".tn-studio .tn-hero-actions");
  if (!hero) return;
  hero.dataset.v208Actions = "exactly-four";

  let buttons = [...hero.querySelectorAll(":scope > button")];
  const customize = buttons.find((node) => /sesuaikan/i.test(buttonText(node))) || null;
  const layout = ensureLayoutButton(hero, customize);
  buttons = [...hero.querySelectorAll(":scope > button")];
  const code = buttons.find((node) => node !== layout && (
    node.dataset.v207ThemeAction === "code"
    || node.dataset.v206ThemeAction === "code"
    || node.dataset.v205ThemeAction === "code"
    || /edit\s*(kode|html|css|javascript|java\s*script)/i.test(buttonText(node))
  )) || null;
  const site = buttons.find((node) => /lihat situs|buka situs/i.test(buttonText(node))) || null;

  const canonical = new Set([customize, layout, code, site].filter(Boolean));
  buttons.forEach((button) => {
    if (canonical.has(button)) {
      button.hidden = false;
      button.removeAttribute("hidden");
      button.removeAttribute("inert");
      button.removeAttribute("aria-hidden");
      button.tabIndex = 0;
      return;
    }
    button.dataset.v208HiddenDuplicate = "true";
    button.hidden = true;
    button.setAttribute("aria-hidden", "true");
    button.tabIndex = -1;
  });

  ensureVisibleLabel(customize, "Sesuaikan", "customize");
  ensureVisibleLabel(layout, "Edit Tata Letak", "layout");
  ensureVisibleLabel(code, "Edit Kode", "code");
  ensureVisibleLabel(site, "Lihat situs", "site");
}

function normalizeLayoutMap() {
  const studio = document.querySelector(".tn-layout-studio");
  const canvas = studio?.querySelector(".tn-layout-canvas-v170,.tn-layout-canvas");
  if (!studio || !canvas) return;
  studio.dataset.v208Layout = "spatial-map";
  canvas.dataset.v208LayoutMap = "spatial-map";
  canvas.querySelectorAll(".tn-layout-slot-v170,.tn-layout-area").forEach((slot) => {
    slot.dataset.v208MapSlot = "true";
    slot.removeAttribute("inert");
    slot.removeAttribute("aria-hidden");
    slot.querySelectorAll("small,b,span").forEach((label) => {
      setImportant(label, "writing-mode", "horizontal-tb");
      setImportant(label, "text-orientation", "mixed");
    });
  });
}

function normalizeDrawerAndSidebar() {
  const root = document.documentElement;
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const main = document.querySelector(".sn-main");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const toggle = document.querySelector(".sn-sidebar-toggle");
  if (!sidebar) return;
  const mobile = mobileLike();
  const open = sidebar.classList.contains("mobile-open");
  root.dataset.studioMobileV208 = String(mobile);
  root.dataset.studioSidebarV208 = mobile ? (open ? "drawer-open" : "drawer-closed") : (sidebar.classList.contains("collapsed") ? "rail" : "expanded");
  toggle?.setAttribute("aria-expanded", String(mobile ? open : !sidebar.classList.contains("collapsed")));
  sidebar.removeAttribute("inert");
  main?.removeAttribute("inert");
  sidebar.querySelectorAll("button,a").forEach((node) => node.removeAttribute("inert"));
  if (backdrop) {
    backdrop.hidden = !open;
    backdrop.setAttribute("aria-hidden", String(!open));
    setImportant(backdrop, "background", "transparent");
    setImportant(backdrop, "filter", "none");
    setImportant(backdrop, "backdrop-filter", "none");
    setImportant(backdrop, "-webkit-backdrop-filter", "none");
  }
  if (main) {
    setImportant(main, "filter", "none");
    setImportant(main, "opacity", "1");
  }
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v208Launcher = "stable-centered";
    ["animation", "transition", "filter", "transform"].forEach((property) => setImportant(launcher, property, "none"));
    setImportant(launcher, "opacity", "1");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;
  const full = shell.dataset.naraSize === "full";
  layer.dataset.v208Mode = full ? "modal" : "nonmodal";
  shell.dataset.v208Nara = "native-plus-menu";
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
  }

  const close = shell.querySelector('button[title="Tutup"],button[title="Tutup Nara AI"],button[aria-label="Tutup Nara AI"]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("hidden");
    close.removeAttribute("inert");
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara AI");
  }

  const attachmentWrap = shell.querySelector(".nara-attachment-menu-wrap");
  const attachmentMenu = attachmentWrap?.querySelector(".nara-attachment-menu");
  if (attachmentWrap) attachmentWrap.dataset.v208Attachment = attachmentMenu ? "open" : "closed";
  if (attachmentMenu) {
    attachmentMenu.dataset.v208AttachmentMenu = "camera-photo-file";
    attachmentMenu.hidden = false;
    attachmentMenu.removeAttribute("aria-hidden");
    attachmentMenu.querySelectorAll("button").forEach((button) => {
      button.hidden = false;
      button.disabled = false;
      button.removeAttribute("inert");
      button.removeAttribute("aria-hidden");
    });
  }
}

function knownActiveSite() {
  try {
    if (window.__ngebloggingActiveSite?.id) return true;
    if (document.documentElement.dataset.activeSiteId) return true;
    if (localStorage.getItem("ngeblogging-active-site-id")) return true;
    return ["ngeblogging-active-site-snapshot-v195", "ngeblogging-active-site-snapshot-v192", "ngeblogging-active-site-snapshot-v190"]
      .some((key) => Boolean(JSON.parse(localStorage.getItem(key) || "null")?.id));
  } catch {
    return Boolean(window.__ngebloggingActiveSite?.id);
  }
}

function resumeStudioOnce() {
  try {
    const key = "ngeblogging-v208-resume-once";
    if (sessionStorage.getItem(key) === "done") return;
    sessionStorage.setItem(key, "done");
    window.location.replace("/studio?resume=v208");
  } catch {
    window.location.replace("/studio?resume=v208");
  }
}

function normalizeStartup() {
  const startup = document.querySelector(".so75-startup");
  if (!startup) return;
  startup.dataset.v208Startup = "bounded-membership-recovery";
  const retry = startup.querySelector("section > button.so75-primary,section > button");

  if (knownActiveSite()) {
    window.setTimeout(() => { if (document.querySelector(".so75-startup")) resumeStudioOnce(); }, 80);
    return;
  }
  if (startupRecovery || navigator.onLine === false) return;

  startupRecovery = recoverMembership()
    .then((result) => {
      if (result?.site?.id || knownActiveSite()) {
        resumeStudioOnce();
        return;
      }
      if (retry) retry.disabled = false;
    })
    .catch(() => {
      if (retry) retry.disabled = false;
    })
    .finally(() => { startupRecovery = null; });
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*",
    ".tn-studio", ".tn-studio>*", ".tn-layout-studio", ".tn-layout-canvas-v170",
    ".tn-code-workspace", ".tn-code-pane", ".tn-code-preview-pane", ".ce-app", ".ce-app>*",
    ".mv176-page", ".sv124-page", ".sn-api-page", ".op41-host",
  ].join(",")).forEach((node) => {
    setImportant(node, "min-width", "0");
    setImportant(node, "max-width", node.classList?.contains("tn-layout-canvas-v170") ? (mobileLike() ? "none" : "100%") : "100%");
  });
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  if (root.dataset.studioProductionV208 !== RELEASE) root.dataset.studioProductionV208 = RELEASE;
  root.dataset.studioMobileV208 = String(mobileLike());
  normalizeThemeActions();
  normalizeLayoutMap();
  normalizeDrawerAndSidebar();
  normalizeNara();
  normalizeStartup();
  normalizeContainment();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "data-nara-size", "data-studio-responsive-mode", "data-studio-desktop-site-phone"],
});
for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) window.addEventListener(eventName, schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
sync();

export {
  RELEASE,
  mobileLike,
  normalizeThemeActions,
  normalizeLayoutMap,
  normalizeDrawerAndSidebar,
  normalizeNara,
  normalizeStartup,
  normalizeContainment,
  sync,
};