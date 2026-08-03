import "./studio-production-v225.css";

const RELEASE = "studio-production-v225-20260803";
let frame = 0;

const SMALL_SLOT_LABELS = Object.freeze({
  "top-left-1":"Header kiri 1","top-right-1":"Header kanan 1","top-left-2":"Header kiri 2","top-right-2":"Header kanan 2",
  "top-left-3":"Navigasi","top-right-3":"Bawah header","before-content":"Atas postingan",
  "sidebar-left-1":"Kiri 1","sidebar-left-2":"Kiri 2","sidebar-left-3":"Kiri 3","sidebar-left-4":"Kiri 4",
  "sidebar-right-1":"Kanan 1","sidebar-right-2":"Kanan 2","sidebar-right-3":"Kanan 3","sidebar-right-4":"Kanan 4",
  "after-content":"Bawah postingan","bottom-left-1":"Footer kiri 1","bottom-right-1":"Footer kanan 1",
  "bottom-left-2":"Footer kiri 2","bottom-right-2":"Footer kanan 2","bottom-left-3":"Footer panjang","bottom-right-3":"Copyright",
});

function important(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function physicalSmall() {
  const root = document.documentElement;
  return root.dataset.v223UiFamily === "physical-small"
    || root.dataset.v223PhysicalSmall === "true"
    || ["application","phone","mobile","compact"].includes(root.dataset.studioResponsiveMode || "");
}

function ensureActionLabel(button, label) {
  if (!button) return;
  let marker = button.querySelector(":scope>.v209-button-label");
  if (!marker) {
    marker = document.createElement("span");
    marker.className = "v209-button-label";
    [...button.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).forEach((node) => node.remove());
    button.append(marker);
  }
  marker.textContent = label;
}

function normalizeThemeCodeActions() {
  document.querySelectorAll(".tn-studio .tn-hero-actions,.tn-studio .tn-command nav").forEach((group) => {
    const explicit = [...group.querySelectorAll("button[data-v222-code-tab]")];
    if (!explicit.length) return;
    const labels = { html:"Edit HTML", css:"Edit CSS", javascript:"Edit JavaScript" };
    explicit.forEach((button) => {
      const kind = button.dataset.v222CodeTab || "html";
      button.hidden = false; button.disabled = false; button.tabIndex = 0;
      button.removeAttribute("hidden"); button.removeAttribute("inert"); button.removeAttribute("aria-hidden");
      button.dataset.v225CodeAction = kind;
      button.setAttribute("aria-label", labels[kind] || "Edit Kode");
      button.setAttribute("title", labels[kind] || "Edit Kode");
      ensureActionLabel(button, labels[kind] || "Edit Kode");
      important(button,"display","inline-flex"); important(button,"visibility","visible"); important(button,"opacity","1"); important(button,"pointer-events","auto");
    });
    group.dataset.v225ThemeCodeActions = "html-css-javascript-visible";
  });
}

function normalizeLayoutMap() {
  const map = document.querySelector("#ngeblogging-layout-map.tn-layout-studio,.tn-layout-studio[data-v223-layout]");
  const canvas = map?.querySelector(".tn-layout-canvas-v170");
  if (!map || !canvas) return;
  const small = physicalSmall();
  map.dataset.v225Layout = "green-reference-four-left-four-right";
  canvas.dataset.v225LayoutCanvas = small ? "compact-green-map" : "large-green-map";
  map.querySelectorAll(".tn-layout-studio-header h2,.tn-layout-studio-header p").forEach((node) => { node.hidden = true; });
  if (small) {
    canvas.querySelectorAll(":scope>.tn-layout-slot-v170").forEach((slot) => {
      const area = Object.keys(SMALL_SLOT_LABELS).find((key) => slot.classList.contains(key));
      if (!area) return;
      slot.dataset.v225Slot = area;
      const label = slot.querySelector(":scope>small");
      if (label) label.textContent = SMALL_SLOT_LABELS[area];
      slot.setAttribute("aria-label", `${SMALL_SLOT_LABELS[area]}. Buka pilihan widget untuk area ini.`);
      slot.hidden = false; slot.removeAttribute("inert"); slot.removeAttribute("aria-hidden");
      important(slot,"pointer-events","auto");
    });
  }
  const main = canvas.querySelector(":scope>.content-main");
  if (main) {
    main.dataset.v225Slot = "content-main";
    const label = main.querySelector(":scope>small");
    const detail = main.querySelector(":scope>b");
    if (label) label.textContent = "Post / Page";
    if (detail) detail.textContent = "Konten utama";
    main.hidden = false; main.removeAttribute("inert"); important(main,"pointer-events","auto");
  }
  const side = map.querySelector(":scope>.tn-layout-side");
  if (side) side.dataset.v225WidgetList = "below-map";
}

function normalizeCodeEditor() {
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    const small = physicalSmall();
    workspace.dataset.v225Workspace = small ? "preview-above-code" : "code-left-preview-right";
    workspace.querySelectorAll(".tn-code-pane").forEach((pane) => {
      pane.dataset.v225CodePane = "actual-numbered-lines";
      const textarea = pane.querySelector(":scope>textarea");
      const gutter = pane.querySelector(":scope>.v222-code-line-gutter");
      if (textarea) {
        textarea.setAttribute("wrap","off");
        textarea.setAttribute("spellcheck","false");
        textarea.dataset.v225CodeTextarea = "readable";
        const raw = String(textarea.value || "");
        const rawLines = raw.split("\n").length;
        if (raw.length > 80 && rawLines <= 4 && textarea.dataset.v225PrettyRequested !== "true") {
          textarea.dataset.v225PrettyRequested = "true";
          pane.querySelector(":scope>.tn-code-status .v222-format-code")?.click();
        }
      }
      if (gutter) {
        gutter.hidden = false;
        gutter.dataset.v225Gutter = "1-to-10000-actual";
        important(gutter,"display","block"); important(gutter,"visibility","visible"); important(gutter,"opacity","1");
      }
    });
  });
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v225Launcher = "icon-only-stable";
    for (const property of ["animation","transition","filter","transform"]) important(launcher,property,"none");
    important(launcher,"opacity","1");
  }
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope>.nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v225NaraMode = full ? "modal" : "nonmodal";
  shell.dataset.v225NaraSize = size;
  if (!full) {
    important(layer,"pointer-events","none"); important(layer,"background","transparent"); important(layer,"backdrop-filter","none"); important(layer,"-webkit-backdrop-filter","none");
    important(shell,"pointer-events","auto"); document.body.style.removeProperty("overflow"); document.documentElement.style.removeProperty("overflow");
  }
  shell.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.intelligence,.nara-select.model,.nara-attachment-menu-wrap").forEach((node) => {
    node.hidden = false; node.removeAttribute("inert"); node.removeAttribute("aria-hidden"); node.dataset.v225Control = "visible";
  });
  const plus = shell.querySelector(".nara-attachment-menu-wrap>button");
  const menu = shell.querySelector(".nara-attachment-menu");
  if (plus) plus.dataset.v225Plus = "camera-photo-file";
  if (menu && plus) {
    menu.dataset.v225AttachmentMenu = "viewport-fixed";
    const rect = plus.getBoundingClientRect();
    const width = Math.min(280, Math.max(224, innerWidth - 24));
    const height = Math.min(190, innerHeight - 24);
    const left = Math.max(12, Math.min(innerWidth - width - 12, rect.left));
    const preferredTop = rect.top - height - 10;
    const top = preferredTop >= 12 ? preferredTop : Math.min(innerHeight - height - 12, rect.bottom + 10);
    important(menu,"position","fixed"); important(menu,"left",`${left}px`); important(menu,"right","auto"); important(menu,"top",`${Math.max(12,top)}px`); important(menu,"bottom","auto");
    important(menu,"width",`${width}px`); important(menu,"max-width","calc(100vw - 24px)"); important(menu,"visibility","visible"); important(menu,"opacity","1"); important(menu,"pointer-events","auto"); important(menu,"z-index","2147485400");
  }
}

function normalizeSidebar() {
  const sidebar = document.getElementById("ngeblogging-studio-sidebar") || document.querySelector(".sn-side");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const mark = document.querySelector(".sn-mobile-menu-mark,.sn-brand-mark,.sn-sidebar-toggle");
  if (sidebar) { sidebar.dataset.v225Sidebar = physicalSmall() ? "mobile-drawer" : "desktop-rail"; important(sidebar,"z-index","2147483000"); }
  if (backdrop) {
    backdrop.dataset.v225Backdrop = "transparent-click-close";
    important(backdrop,"background","transparent"); important(backdrop,"filter","none"); important(backdrop,"backdrop-filter","none"); important(backdrop,"-webkit-backdrop-filter","none"); important(backdrop,"z-index","2147482000");
  }
  if (mark) { mark.dataset.v225MenuMark = "centered-n"; important(mark,"display","grid"); important(mark,"place-items","center"); }
  document.querySelectorAll(".sn-main,.sn-main>*").forEach((node) => { important(node,"filter","none"); important(node,"min-width","0"); important(node,"max-width","100%"); });
}

function normalizeDomain() {
  if (!physicalSmall()) return;
  document.querySelectorAll(".sv124-domain-page button,.sv124-domain-page a").forEach((node) => { node.dataset.v225DomainAction = "full-horizontal"; });
}

function normalizeAnalytics() {
  document.querySelectorAll(".op41-panel").forEach((panel) => { panel.dataset.v225Analytics = physicalSmall() ? "compact" : "large-detail"; });
}

function normalizeRoot() {
  const root = document.documentElement;
  root.dataset.studioProductionV225 = RELEASE;
  root.dataset.v225UiFamily = physicalSmall() ? "physical-small" : "large";
}

function sync() {
  frame = 0;
  normalizeRoot(); normalizeThemeCodeActions(); normalizeLayoutMap(); normalizeCodeEditor(); normalizeNara(); normalizeSidebar(); normalizeDomain(); normalizeAnalytics();
}
function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
new MutationObserver(schedule).observe(document.documentElement,{ childList:true,subtree:true,attributes:true,attributeFilter:["class","hidden","aria-expanded","data-nara-size","data-studio-responsive-mode","data-studio-device-variant","data-v223-ui-family"] });
for (const eventName of ["pageshow","resize","orientationchange","online"]) window.addEventListener(eventName,schedule,{passive:true});
window.visualViewport?.addEventListener("resize",schedule,{passive:true});
schedule();

export { RELEASE, physicalSmall };
