import "./studio-production-v205.css";

const RELEASE = "studio-production-v205-20260802";
let frame = 0;

function mobileLike() {
  const root = document.documentElement;
  if (root.dataset.studioMobileV204 === "true") return true;
  if (root.dataset.studioMobileV203 === "true") return true;
  if (root.dataset.studioPhysicalMobileV193 === "true") return true;
  if (root.dataset.studioPhysicalMobileV191 === "true") return true;
  if (root.dataset.studioHandheld === "true") return true;
  if (navigator.userAgentData?.mobile === true) return true;
  if (/Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent || "")) return true;
  try {
    const sizes = [screen?.width, screen?.height, visualViewport?.width, visualViewport?.height]
      .map(Number).filter((value) => Number.isFinite(value) && value > 0);
    if (sizes.length && Math.min(...sizes) <= 760) return true;
  } catch {
    // Some browsers restrict screen metrics; viewport fallback below is enough.
  }
  return window.innerWidth <= 760;
}

function normalizeThemeActions() {
  const studio = document.querySelector(".tn-studio");
  if (!studio) return;
  studio.dataset.v205ThemeActions = "single-visible-label";

  for (const group of studio.querySelectorAll(".tn-hero-actions,.tn-command nav")) {
    const seen = new Set();
    for (const button of group.querySelectorAll(":scope > button")) {
      const text = String(button.textContent || "").replace(/\s+/g, " ").trim();
      let action = button.dataset.v202ThemeAction || "";
      if (!action && /edit\s+tata\s+letak|tata\s+letak/i.test(text)) action = "layout";
      if (!action && /edit\s+(html|css|java\s*script|javascript|kode)|html\s*\/\s*css/i.test(text)) action = "code";
      if (!action && /sesuaikan/i.test(text)) action = "customize";
      if (!action && /lihat\s+situs|buka\s+situs/i.test(text)) action = "site";
      if (!action) continue;

      if (seen.has(action)) {
        button.dataset.v205Duplicate = action;
        button.setAttribute("aria-hidden", "true");
        button.tabIndex = -1;
      } else {
        seen.add(action);
        delete button.dataset.v205Duplicate;
        button.removeAttribute("aria-hidden");
        if (button.tabIndex < 0) button.tabIndex = 0;
        button.dataset.v205ThemeAction = action;
      }
    }
  }
}

function normalizeLogoState() {
  const root = document.documentElement;
  const toggle = document.querySelector(".sn-sidebar-toggle");
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const open = Boolean(sidebar?.classList.contains("mobile-open"));
  if (toggle) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.dataset.v205LogoState = open ? "open-blue-on-white" : "closed-white-on-blue";
  }
  if (sidebar) sidebar.dataset.v205LogoState = "drawer-blue-on-white";
  root.dataset.studioDrawerV205 = open ? "open" : "closed";
}

function normalizeThemeLayout() {
  const canvas = document.querySelector(".tn-layout-canvas-v170");
  if (!canvas) return;
  canvas.dataset.v205Layout = mobileLike() ? "paired-mobile-map" : "desktop-map";
  canvas.removeAttribute("inert");
  for (const slot of canvas.querySelectorAll(":scope > button")) {
    slot.removeAttribute("inert");
    slot.removeAttribute("aria-hidden");
    slot.disabled = false;
  }
}

function normalizeNara() {
  const shell = document.querySelector(".nara-assistant-shell");
  if (!shell) return;
  shell.dataset.v205Controls = "plus-menu-compact-model-intelligence";
  const direct = shell.querySelector(".nara-direct-attachments-v202");
  if (direct) {
    direct.setAttribute("aria-hidden", "true");
    direct.inert = true;
    direct.dataset.v205CompatibilityOnly = "true";
  }
  const attachment = shell.querySelector(".nara-attachment-menu-wrap > button");
  if (attachment) {
    attachment.setAttribute("aria-haspopup", "menu");
    attachment.setAttribute("aria-label", "Tambah kamera, foto, atau file");
  }
}

function normalizeCreateActions() {
  document.querySelectorAll(".sc161-content-page > .sn-page-title > .sn-primary,.sn-view-pad > .sn-page-title > .sn-primary").forEach((button) => {
    button.hidden = false;
    button.disabled = false;
    button.removeAttribute("hidden");
    button.removeAttribute("inert");
    button.removeAttribute("aria-hidden");
    button.dataset.v205CreateAction = "visible";
  });
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  root.dataset.studioProductionV205 = RELEASE;
  root.dataset.studioMobileV205 = String(mobileLike());
  normalizeThemeActions();
  normalizeLogoState();
  normalizeThemeLayout();
  normalizeNara();
  normalizeCreateActions();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

/* Do not observe aria-hidden/inert/hidden because this authority writes them.
   This prevents the repaint loop that previously looked like blinking. */
new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: [
    "class",
    "data-nara-size",
    "data-studio-mobile-v204",
    "data-studio-mobile-v203",
    "data-studio-physical-mobile-v193",
    "data-studio-physical-mobile-v191",
    "data-studio-handheld",
  ],
});

for (const name of ["pageshow", "resize", "orientationchange"]) {
  window.addEventListener(name, schedule, { passive: true });
}
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

sync();

export {
  RELEASE,
  mobileLike,
  normalizeThemeActions,
  normalizeLogoState,
  normalizeThemeLayout,
  normalizeNara,
  normalizeCreateActions,
  sync,
};
