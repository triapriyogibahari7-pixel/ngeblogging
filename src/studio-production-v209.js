import "./studio-production-v209.css";

const RELEASE = "studio-production-v209-20260802";
const MOBILE_FAMILIES = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;

// v208 used this session marker before issuing location.replace(). v209 owns
// retained-session recovery in-place, so the historical hard reload must never fire.
try { sessionStorage.setItem("ngeblogging-v208-resume-once", "done"); } catch { /* private storage */ }

function physicalShortEdge() {
  try {
    const values = [screen?.width, screen?.height, visualViewport?.width, visualViewport?.height]
      .map(Number).filter((value) => Number.isFinite(value) && value > 0);
    return values.length ? Math.min(...values) : 0;
  } catch { return 0; }
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

function text(node) {
  return String(node?.getAttribute?.("aria-label") || node?.title || node?.textContent || "")
    .replace(/\s+/g, " ").trim();
}

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function canonicalButton(button, label, action) {
  if (!button) return;
  button.dataset.v209ThemeAction = action;
  button.hidden = false;
  button.disabled = false;
  button.removeAttribute("hidden");
  button.removeAttribute("inert");
  button.removeAttribute("aria-hidden");
  button.setAttribute("aria-label", label);
  button.title = label;
  [...button.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) node.remove();
    else if (node.nodeType === Node.ELEMENT_NODE && !node.matches("svg")) node.remove();
  });
  let labelNode = button.querySelector(":scope > .v209-button-label");
  if (!labelNode) {
    labelNode = document.createElement("span");
    labelNode.className = "v209-button-label";
    button.append(labelNode);
  }
  labelNode.textContent = label;
}

function ensureLayoutAction(hero, customize) {
  let button = hero.querySelector(':scope > button[data-v209-theme-action="layout"],:scope > button[data-v208-theme-action="layout"],:scope > button[data-v207-theme-action="layout"],:scope > .v208-theme-layout-button');
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "v209-theme-layout-button";
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/></svg>';
    if (customize?.nextSibling) hero.insertBefore(button, customize.nextSibling);
    else hero.append(button);
  }
  if (button.dataset.v209Bound !== "true") {
    button.dataset.v209Bound = "true";
    button.addEventListener("click", () => {
      const target = document.getElementById("ngeblogging-layout-map") || document.querySelector(".tn-layout-studio");
      if (!target) return;
      target.setAttribute("tabindex", "-1");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => target.focus({ preventScroll: true }), 260);
    });
  }
  return button;
}

function normalizeThemeActions() {
  const hero = document.querySelector(".tn-studio .tn-hero-actions");
  if (!hero) return;
  const buttons = [...hero.querySelectorAll(":scope > button")];
  const customize = buttons.find((node) => /sesuaikan/i.test(text(node))) || hero.querySelector('[data-v208-theme-action="customize"]');
  const layout = ensureLayoutAction(hero, customize);
  const code = buttons.find((node) => node !== layout && (/edit\s*(kode|html|css|javascript)/i.test(text(node)) || ["code"].includes(node.dataset.v208ThemeAction))) || null;
  const site = buttons.find((node) => /lihat situs|buka situs/i.test(text(node))) || null;
  const canonical = new Set([customize, layout, code, site].filter(Boolean));
  [...hero.querySelectorAll(":scope > button")].forEach((button) => {
    const keep = canonical.has(button);
    button.hidden = !keep;
    button.tabIndex = keep ? 0 : -1;
    if (keep) {
      button.removeAttribute("hidden");
      button.removeAttribute("aria-hidden");
      button.removeAttribute("inert");
    } else {
      button.dataset.v209HiddenDuplicate = "true";
      button.setAttribute("aria-hidden", "true");
    }
  });
  canonicalButton(customize, "Sesuaikan", "customize");
  canonicalButton(layout, "Edit Tata Letak", "layout");
  canonicalButton(code, "Edit Kode", "code");
  canonicalButton(site, "Lihat situs", "site");
  hero.dataset.v209Actions = "exactly-four";
}

function normalizeLayoutMap() {
  const studio = document.querySelector(".tn-layout-studio");
  const canvas = studio?.querySelector(".tn-layout-canvas-v170,.tn-layout-canvas");
  if (!studio || !canvas) return;
  studio.id = "ngeblogging-layout-map";
  studio.dataset.v209Layout = "site-map";
  canvas.dataset.v209LayoutMap = "site-map";
  canvas.querySelectorAll(".tn-layout-slot-v170,.tn-layout-area").forEach((slot) => {
    slot.dataset.v209MapSlot = "true";
    slot.removeAttribute("inert");
    slot.removeAttribute("aria-hidden");
    slot.querySelectorAll("small,b,span").forEach((label) => {
      setImportant(label, "writing-mode", "horizontal-tb");
      setImportant(label, "text-orientation", "mixed");
      setImportant(label, "word-break", "normal");
    });
  });
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v209Launcher = "stable";
    ["animation", "transition", "filter", "transform"].forEach((property) => setImportant(launcher, property, "none"));
    setImportant(launcher, "opacity", "1");
  }
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;
  const full = shell.dataset.naraSize === "full";
  layer.dataset.v209Mode = full ? "modal" : "nonmodal";
  shell.dataset.v209Nara = "contained";
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
  const close = shell.querySelector('button[title="Tutup"],button[aria-label="Tutup Nara AI"]');
  if (close) {
    close.hidden = false;
    close.disabled = false;
    close.removeAttribute("hidden");
    close.removeAttribute("inert");
    close.removeAttribute("aria-hidden");
    close.setAttribute("aria-label", "Tutup Nara AI");
  }
  const menu = shell.querySelector(".nara-attachment-menu");
  const wrap = shell.querySelector(".nara-attachment-menu-wrap");
  if (wrap) wrap.dataset.v209Attachment = menu ? "open" : "closed";
  if (menu) {
    menu.dataset.v209AttachmentMenu = "camera-photo-file";
    menu.hidden = false;
    menu.removeAttribute("hidden");
    menu.removeAttribute("aria-hidden");
    menu.querySelectorAll("button").forEach((button) => {
      button.hidden = false;
      button.disabled = false;
      button.removeAttribute("inert");
      button.removeAttribute("aria-hidden");
    });
  }
}

function normalizeDrawer() {
  const root = document.documentElement;
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const main = document.querySelector(".sn-main");
  const backdrop = document.querySelector(".sn-side-backdrop");
  if (!sidebar) return;
  const mobile = mobileLike();
  const open = sidebar.classList.contains("mobile-open");
  root.dataset.studioMobileV209 = String(mobile);
  root.dataset.studioSidebarV209 = mobile ? (open ? "drawer-open" : "drawer-closed") : (sidebar.classList.contains("collapsed") ? "rail" : "expanded");
  sidebar.removeAttribute("inert");
  main?.removeAttribute("inert");
  sidebar.querySelectorAll("button,a").forEach((node) => node.removeAttribute("inert"));
  if (backdrop) {
    backdrop.hidden = !open;
    backdrop.setAttribute("aria-hidden", String(!open));
    setImportant(backdrop, "background", "transparent");
    setImportant(backdrop, "opacity", "1");
    setImportant(backdrop, "filter", "none");
    setImportant(backdrop, "backdrop-filter", "none");
    setImportant(backdrop, "-webkit-backdrop-filter", "none");
  }
  if (main) {
    setImportant(main, "filter", "none");
    setImportant(main, "opacity", "1");
  }
}

function knownActiveSite() {
  try {
    if (window.__ngebloggingActiveSite?.id || document.documentElement.dataset.activeSiteId) return true;
    if (localStorage.getItem("ngeblogging-active-site-id")) return true;
    return ["ngeblogging-active-site-snapshot-v195", "ngeblogging-active-site-snapshot-v192", "ngeblogging-active-site-snapshot-v190"]
      .some((key) => Boolean(JSON.parse(localStorage.getItem(key) || "null")?.id));
  } catch { return Boolean(window.__ngebloggingActiveSite?.id); }
}

function normalizeStartup() {
  const startup = document.querySelector(".so75-startup");
  if (!startup) return;
  startup.dataset.v209Startup = "in-place-recovery";
  // A successful login/session must never be followed by a hard reload merely to
  // recover membership. Retry React's own gate once in-place if a site is known.
  const errorHeading = startup.querySelector("h1")?.textContent || "";
  const retry = startup.querySelector("button.so75-primary");
  if (knownActiveSite() && retry && /koneksi data belum selesai/i.test(errorHeading)) {
    try {
      const key = "ngeblogging-v209-membership-retry";
      if (sessionStorage.getItem(key) !== "done") {
        sessionStorage.setItem(key, "done");
        window.setTimeout(() => retry.click(), 120);
      }
    } catch { /* manual retry remains available */ }
  }
}

function normalizeDomain() {
  const page = document.querySelector(".sv124-domain-page");
  if (!page) return;
  page.dataset.v209Domain = "contained";
  page.querySelectorAll("h1,h2,h3,p,b,small,label,span,code").forEach((node) => {
    setImportant(node, "writing-mode", "horizontal-tb");
    setImportant(node, "text-orientation", "mixed");
    setImportant(node, "word-break", "normal");
    setImportant(node, "overflow-wrap", "anywhere");
    setImportant(node, "max-width", "100%");
  });
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*", ".tn-studio", ".tn-studio>*",
    ".tn-code-workspace", ".tn-code-pane", ".tn-code-preview-pane", ".ce-app", ".ce-app>*",
    ".mv176-page", ".sv124-page", ".sn-api-page", ".op41-host",
  ].join(",")).forEach((node) => {
    setImportant(node, "min-width", "0");
    setImportant(node, "max-width", "100%");
  });
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  root.dataset.studioProductionV209 = RELEASE;
  root.dataset.studioMobileV209 = String(mobileLike());
  normalizeThemeActions();
  normalizeLayoutMap();
  normalizeNara();
  normalizeDrawer();
  normalizeStartup();
  normalizeDomain();
  normalizeContainment();
}

function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
new MutationObserver(schedule).observe(document.documentElement, {
  childList: true, subtree: true, attributes: true,
  attributeFilter: ["class", "hidden", "data-nara-size", "data-studio-responsive-mode", "data-studio-desktop-site-phone"],
});
for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) window.addEventListener(eventName, schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
sync();

export { RELEASE, mobileLike, normalizeThemeActions, normalizeLayoutMap, normalizeNara, normalizeDrawer, normalizeStartup, normalizeDomain, sync };
