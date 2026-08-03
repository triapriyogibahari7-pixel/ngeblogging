import "./studio-production-v237.css";

export const RELEASE = "studio-production-v237-layout-stability-20260803";
const SMALL_MODES = new Set(["application", "phone", "mobile", "compact"]);
const LARGE_MODES = new Set(["tablet", "laptop", "desktop", "computer"]);
const SITE_LIMIT = 25;
const LARGE_LAYOUT = {
  "top-left-1": ["1 / 7", "1"],
  "top-right-1": ["7 / 13", "1"],
  "top-left-3": ["1 / 13", "2"],
  "top-left-2": ["1 / 7", "3"],
  "top-right-2": ["7 / 13", "3"],
  "top-right-3": ["1 / 13", "4"],
  "before-content": ["1 / 13", "5"],
  "sidebar-left-1": ["1 / 4", "6"],
  "sidebar-left-2": ["1 / 4", "7"],
  "sidebar-left-3": ["1 / 4", "8"],
  "sidebar-left-4": ["1 / 4", "9"],
  "content-main": ["4 / 10", "6 / 10"],
  "sidebar-right-1": ["10 / 13", "6"],
  "sidebar-right-2": ["10 / 13", "7"],
  "sidebar-right-3": ["10 / 13", "8"],
  "sidebar-right-4": ["10 / 13", "9"],
  "after-content": ["1 / 13", "10"],
  "bottom-left-1": ["1 / 7", "11"],
  "bottom-right-1": ["7 / 13", "11"],
  "bottom-left-2": ["1 / 7", "12"],
  "bottom-right-2": ["7 / 13", "12"],
  "bottom-left-3": ["1 / 13", "13"],
  "bottom-right-3": ["1 / 13", "14"],
};
const SMALL_LAYOUT = {
  "top-left-1": ["1 / 3", "1"],
  "top-right-1": ["3 / 4", "1"],
  "top-left-3": ["1 / 4", "2"],
  "top-left-2": ["1 / 2", "3"],
  "top-right-2": ["2 / 4", "3"],
  "top-right-3": ["1 / 4", "4"],
  "before-content": ["1 / 4", "5"],
  "sidebar-left-1": ["1", "6"],
  "sidebar-left-2": ["1", "7"],
  "sidebar-left-3": ["1", "8"],
  "sidebar-left-4": ["1", "9"],
  "content-main": ["2", "6 / 10"],
  "sidebar-right-1": ["3", "6"],
  "sidebar-right-2": ["3", "7"],
  "sidebar-right-3": ["3", "8"],
  "sidebar-right-4": ["3", "9"],
  "after-content": ["1 / 4", "10"],
  "bottom-left-1": ["1 / 2", "11"],
  "bottom-right-1": ["2 / 4", "11"],
  "bottom-left-2": ["1 / 2", "12"],
  "bottom-right-2": ["2 / 4", "12"],
  "bottom-left-3": ["1 / 4", "13"],
  "bottom-right-3": ["1 / 4", "14"],
};
let frame = 0;
const loadingSince = new WeakMap();

function viewportWidth() {
  return Math.max(1, Math.round(window.visualViewport?.width || document.documentElement.clientWidth || window.innerWidth || 1));
}

function currentFamily() {
  const width = viewportWidth();
  if (width <= 767) return "small";
  const root = document.documentElement;
  const explicit = root.dataset.studioResponsiveMode || root.dataset.studioDeviceVariant || "";
  if (SMALL_MODES.has(explicit) && width < 900) return "small";
  if (LARGE_MODES.has(explicit)) return "large";
  if (root.dataset.v232ModeLock === "desktop-site-large" && width >= 900) return "large";
  return width >= 768 ? "large" : "small";
}

function important(node, property, value) {
  node?.style?.setProperty(property, value, "important");
}

function syncFamily() {
  const root = document.documentElement;
  const family = currentFamily();
  root.dataset.studioProductionV237 = RELEASE;
  root.dataset.v237Family = family;
  // Keep older CSS authorities aligned instead of letting their observers fight v237.
  root.dataset.v235Family = family;
  root.dataset.v236Family = family;
  return family;
}

function syncSidebar(family) {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const main = document.querySelector(".sn-main");
  if (!sidebar || !main) return;
  sidebar.dataset.v237Sidebar = family === "small" ? (sidebar.classList.contains("mobile-open") ? "drawer-open" : "drawer-closed") : (sidebar.classList.contains("collapsed") ? "icons" : "open");
  const nav = sidebar.querySelector(":scope>nav");
  if (nav) {
    important(nav, "justify-content", "flex-start");
    important(nav, "gap", "2px");
    important(nav, "padding-top", "4px");
  }
  sidebar.querySelectorAll(".sn-side-close,.sn-desktop-sidebar-icon,.v227-sidebar-fab,.studio-external-sidebar-toggle,[data-v173-collapse-toggle],[data-v187-sidebar-toggle],[data-v208-sidebar-toggle],[data-v223-sidebar-toggle],[data-v229-sidebar-toggle]").forEach((node) => {
    node.hidden = true;
    important(node, "display", "none");
    important(node, "pointer-events", "none");
  });
  main.removeAttribute("inert");
  main.style.removeProperty("filter");
  const mark = sidebar.querySelector(".sn-logo-mark");
  if (mark) {
    mark.dataset.v237InternalN = "single-control";
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
  }
}

function syncSettings() {
  document.querySelectorAll(".sn-settings-grid").forEach((grid) => {
    const page = grid.closest(".sn-view-pad") || grid.parentElement;
    if (!page) return;
    page.dataset.v237Settings = "true";
    const title = page.querySelector(".sn-page-title h1");
    const description = page.querySelector(".sn-page-title p");
    if (title && /profil.*pengaturan|pengaturan.*profil/i.test(title.textContent || "")) title.textContent = "Pengaturan";
    if (description) description.textContent = "Kelola konfigurasi situs aktif tanpa mencampurkannya dengan profil akun.";
    [...grid.querySelectorAll(":scope>section")].forEach((section) => {
      const heading = String(section.querySelector("h2")?.textContent || "").trim();
      if (/^profil$/i.test(heading)) section.dataset.v237ProfileSection = "hidden";
    });
    page.querySelectorAll("section,article,div").forEach((node) => {
      const text = String(node.textContent || "").replace(/\s+/g, " ").trim();
      if (!text || text.length > 1200) return;
      if (/cadangan|backup|media-manifest|manifest/i.test(text) && node.querySelector(":scope>h2,:scope>h3,:scope>b,:scope>p")) {
        node.dataset.v237BackupCard = "true";
      }
    });
  });
}

function syncDomain() {
  document.querySelectorAll(".sv124-domain-page").forEach((page) => {
    page.dataset.v237Domain = "stable";
    page.querySelectorAll(".sv124-free-domain>aside>i,.sv124-free-domain>aside>a,.sv124-free-domain>aside>button").forEach((node) => {
      node.dataset.v237DomainAction = "true";
      for (const property of ["writing-mode", "width", "min-width", "max-width", "height", "transform"]) node.style.removeProperty(property);
    });
    const siteStripCount = page.querySelector(".sv124-site-strip>i");
    if (siteStripCount && /12\s+situs|\/12/i.test(siteStripCount.textContent || "")) siteStripCount.textContent = "Akun multisitus";
    page.querySelectorAll(".sv124-metric").forEach((metric) => {
      const label = metric.querySelector("span");
      const value = metric.querySelector("b");
      if (/kapasitas akun/i.test(label?.textContent || "")) {
        label.textContent = "Situs akun";
        if (value) value.textContent = String(value.textContent || "").split("/")[0].trim() || "0";
      }
    });
  });
}

function syncWidgetStudio() {
  document.querySelectorAll(".tn-widget-studio").forEach((studio) => {
    studio.dataset.v237WidgetStudio = "readable-26";
    studio.querySelectorAll("h1,h2,h3,h4,b,p,small,span").forEach((node) => {
      for (const property of ["position", "top", "right", "bottom", "left", "transform", "float", "font-size", "line-height"]) node.style.removeProperty(property);
    });
  });
}

function slotKey(node) {
  if (!node) return "";
  if (node.classList.contains("content-main")) return "content-main";
  return [...new Set([...Object.keys(LARGE_LAYOUT), ...Object.keys(SMALL_LAYOUT)])].find((key) => node.classList.contains(key)) || "";
}

function syncLayout(family) {
  const map = document.querySelector("#ngeblogging-layout-map,.tn-layout-studio[data-v226-layout-source]");
  const canvas = map?.querySelector(".tn-layout-canvas-v170");
  if (!map || !canvas) return;
  map.dataset.v237Layout = "interactive-reference";
  canvas.dataset.v237Canvas = family;
  const placementMap = family === "small" ? SMALL_LAYOUT : LARGE_LAYOUT;
  [...canvas.children].forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const key = slotKey(node);
    if (!key || !placementMap[key]) return;
    node.dataset.v237Slot = key;
    node.hidden = false;
    node.removeAttribute("inert");
    node.removeAttribute("aria-hidden");
    important(node, "grid-column", placementMap[key][0]);
    important(node, "grid-row", placementMap[key][1]);
    important(node, "position", "relative");
    important(node, "transform", "none");
    important(node, "pointer-events", "auto");
  });
}

function syncCodeEditor(family) {
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    workspace.dataset.v237CodeWorkspace = family === "small" ? "preview-top-code-bottom" : "code-left-preview-right";
    workspace.querySelectorAll(".tn-code-pane>textarea").forEach((textarea) => {
      textarea.dataset.v237CodeEditor = "real-lines";
      textarea.setAttribute("wrap", "off");
      textarea.setAttribute("spellcheck", "false");
    });
    workspace.querySelectorAll(".tn-code-preview-pane").forEach((preview) => preview.dataset.v237Preview = "centered");
  });
}

function ensureSummaryAddSite() {
  document.querySelectorAll(".sn-welcome").forEach((welcome) => {
    const actions = welcome.querySelector(":scope>div:last-child");
    if (!actions || actions.querySelector("[data-v237-create-site]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.v237CreateSite = "true";
    button.textContent = "+ Tambahkan situs";
    button.addEventListener("click", () => {
      const workspace = document.querySelector(".sn-workspace");
      if (workspace) workspace.click();
      else window.dispatchEvent(new CustomEvent("ngeblogging:toast", { detail: { type: "info", message: "Pengelola situs belum siap. Coba lagi setelah Studio selesai tersambung." } }));
    });
    actions.prepend(button);
  });

  document.querySelectorAll(".sn-site-manager").forEach((manager) => {
    const count = manager.querySelectorAll(".sn-sites-list>article").length;
    const createButton = manager.querySelector(".sn-create-site .sn-primary");
    if (createButton) {
      createButton.disabled = createButton.disabled || count >= SITE_LIMIT;
      if (count >= SITE_LIMIT) createButton.title = "Batas situs akun telah tercapai";
    }
  });
}

function ensureCustomThemeEntry() {
  document.querySelectorAll(".tn-theme-grid").forEach((grid) => {
    if (grid.querySelector("[data-v237-custom-theme]")) return;
    const card = document.createElement("article");
    card.dataset.v237CustomTheme = "true";
    card.innerHTML = `<div style="min-height:170px;display:grid;place-content:center;text-align:center;padding:18px"><small>TEMA CUSTOM</small><h3 style="margin:7px 0">Bangun dari kode sendiri</h3><p style="margin:0">Gunakan editor HTML, CSS, JavaScript atau impor paket tema.</p></div><div><small>Custom · kode</small><h3>Tema Custom</h3><p>Ruang kerja khusus untuk tema buatan sendiri tanpa mengganti 100 tema bawaan.</p><footer><button type="button" data-v237-custom-code>Edit kode</button><button type="button" data-v237-custom-upload>Upload tema</button></footer></div>`;
    card.addEventListener("click", (event) => {
      if (event.target.closest("[data-v237-custom-code]")) {
        const code = [...document.querySelectorAll(".tn-command button,.tn-hero-actions button")].find((node) => /edit html/i.test(node.textContent || ""));
        code?.click();
      }
      if (event.target.closest("[data-v237-custom-upload]")) {
        const upload = [...document.querySelectorAll(".tn-command button")].find((node) => /upload tema/i.test(node.textContent || ""));
        upload?.click();
      }
    });
    grid.append(card);
  });
}

function syncNara() {
  document.querySelectorAll(".nara-assistant-shell").forEach((shell) => {
    shell.dataset.v237Nara = "stable-controls";
    shell.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.intelligence,.nara-select.model,.nara-attachment-menu-wrap").forEach((node) => {
      important(node, "visibility", "visible");
      important(node, "opacity", "1");
    });
  });
  document.querySelectorAll(".v235-nara-attachment-portal").forEach((portal) => {
    portal.dataset.v237AttachmentPortal = "camera-photo-file";
    portal.removeAttribute("inert");
  });
}

function syncLoading() {
  const now = Date.now();
  document.querySelectorAll(".sn-loading,.sv124-panel-loading,.sn-api-loading").forEach((node) => {
    if (!loadingSince.has(node)) loadingSince.set(node, now);
    if (now - loadingSince.get(node) < 18000 || node.dataset.v237Timeout === "true") return;
    node.dataset.v237Timeout = "true";
    const message = document.createElement("p");
    message.textContent = "Proses lebih lama dari biasanya. Data lokal dan sesi tidak dihapus.";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.dataset.v237Retry = "true";
    retry.textContent = "Coba lagi";
    retry.addEventListener("click", () => window.location.reload());
    node.append(message, retry);
  });
}

function sync() {
  frame = 0;
  const family = syncFamily();
  syncSidebar(family);
  syncSettings();
  syncDomain();
  syncWidgetStudio();
  syncLayout(family);
  syncCodeEditor(family);
  ensureSummaryAddSite();
  ensureCustomThemeEntry();
  syncNara();
  syncLoading();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "data-studio-responsive-mode", "data-studio-device-variant", "data-v235-family", "data-v236-family", "data-nara-size"],
});
for (const event of ["resize", "orientationchange", "pageshow"]) window.addEventListener(event, schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", schedule, { passive: true });
setInterval(() => { if (!document.hidden) schedule(); }, 5000);

sync();

export { SITE_LIMIT, currentFamily, LARGE_LAYOUT, SMALL_LAYOUT };
