import "./studio-production-v222.css";

const RELEASE = "studio-production-v222-20260803";
const MAX_CODE_LINES = 10000;
let raf = 0;

const GREEN_LABELS = Object.freeze({
  "top-left-1": "Header kiri · kotak 1",
  "top-right-1": "Header kanan · kotak 1",
  "top-left-2": "Header kiri · kotak 2",
  "top-right-2": "Header kanan · kotak 2",
  "top-left-3": "Kotak panjang di bawah header",
  "top-right-3": "Navigasi / area atas",
  "before-content": "Kotak di atas postingan",
  "sidebar-left-1": "Sidebar kiri · kotak 1",
  "sidebar-left-2": "Sidebar kiri · kotak 2",
  "sidebar-left-3": "Sidebar kiri · kotak 3",
  "sidebar-left-4": "Sidebar kiri · kotak 4",
  "sidebar-right-1": "Sidebar kanan · kotak 1",
  "sidebar-right-2": "Sidebar kanan · kotak 2",
  "sidebar-right-3": "Sidebar kanan · kotak 3",
  "sidebar-right-4": "Sidebar kanan · kotak 4",
  "after-content": "Kotak panjang di bawah postingan",
  "bottom-left-1": "Footer kiri · kotak 1",
  "bottom-right-1": "Footer kanan · kotak 1",
  "bottom-left-2": "Footer kiri · kotak 2",
  "bottom-right-2": "Footer kanan · kotak 2",
  "bottom-left-3": "Kotak footer panjang",
  "bottom-right-3": "Copyright / identitas situs",
});

function important(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function shortPhysicalEdge() {
  const values = [globalThis.screen?.width, globalThis.screen?.height]
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? Math.min(...values) : Math.min(innerWidth || 0, innerHeight || 0);
}

function physicalPhone() {
  const ua = navigator.userAgent || "";
  return navigator.userAgentData?.mobile === true
    || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)
    || (Number(navigator.maxTouchPoints || 0) > 0 && shortPhysicalEdge() > 0 && shortPhysicalEdge() < 768);
}

function familyV222() {
  const root = document.documentElement;
  // Explicit browser desktop-site mode is sticky and must not bounce back to a phone layout.
  if (root.dataset.studioDesktopSitePhone === "true") return "large";
  const responsive = root.dataset.studioResponsiveMode || "";
  const variant = root.dataset.studioDeviceVariant || "";
  if (["tablet", "desktop"].includes(responsive)) return "large";
  if (["laptop", "desktop", "computer"].includes(variant)) return "large";
  if (["application", "phone", "mobile", "compact"].includes(responsive)) return "small";
  if (physicalPhone()) return "small";
  return innerWidth >= 768 ? "large" : "small";
}

function normalizeRoot() {
  const root = document.documentElement;
  const family = familyV222();
  root.dataset.studioProductionV222 = RELEASE;
  root.dataset.studioV222Family = family;
  root.dataset.studioV216PhysicalFamily = family;
  root.dataset.studioV219Small = String(family === "small");
  root.dataset.studioV222PhysicalPhone = String(physicalPhone());
  root.dataset.studioV222DesktopSiteLocked = String(root.dataset.studioDesktopSitePhone === "true");
}

function formatHtml(source) {
  const input = String(source || "").trim();
  if (!input || input.split("\n").length > 8) return input;
  const tokens = input.replace(/>\s*</g, "><").replace(/></g, ">\n<").split("\n");
  let depth = 0;
  const voidTag = /^<(?:!doctype|area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i;
  return tokens.map((raw) => {
    const token = raw.trim();
    if (/^<\//.test(token)) depth = Math.max(0, depth - 1);
    const line = `${"  ".repeat(depth)}${token}`;
    if (/^<[^!/][^>]*>/.test(token) && !/^<.*<\//.test(token) && !/\/>$/.test(token) && !voidTag.test(token)) depth += 1;
    return line;
  }).slice(0, MAX_CODE_LINES).join("\n");
}

function formatBraced(source) {
  const input = String(source || "").trim();
  if (!input || input.split("\n").length > 8) return input;
  let out = "", indent = 0, quote = "", escaped = false, lineComment = false, blockComment = false;
  const newline = () => {
    out = out.replace(/[ \t]+$/g, "");
    if (!out.endsWith("\n")) out += "\n";
    out += "  ".repeat(Math.max(0, indent));
  };
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index], next = input[index + 1] || "";
    if (lineComment) { out += char; if (char === "\n") { lineComment = false; out += "  ".repeat(indent); } continue; }
    if (blockComment) { out += char; if (char === "*" && next === "/") { out += next; index += 1; blockComment = false; } continue; }
    if (quote) {
      out += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (["\"", "'", "`"].includes(char)) { quote = char; out += char; continue; }
    if (char === "/" && next === "/") { lineComment = true; out += "//"; index += 1; continue; }
    if (char === "/" && next === "*") { blockComment = true; out += "/*"; index += 1; continue; }
    if (char === "{") { out += "{"; indent += 1; newline(); continue; }
    if (char === "}") { indent = Math.max(0, indent - 1); out = out.replace(/[ \t]+$/g, ""); if (!out.endsWith("\n")) newline(); out += "}"; if (next && ![";", ",", ")"].includes(next)) newline(); continue; }
    if (char === ";") { out += ";"; newline(); continue; }
    if (char === "\n" || char === "\r") continue;
    out += char;
  }
  return out.split("\n").slice(0, MAX_CODE_LINES).join("\n").trim();
}

function codeKind(textarea) {
  const label = String(textarea?.getAttribute("aria-label") || "").toLowerCase();
  if (label.includes("javascript")) return "javascript";
  if (label.includes("css")) return "css";
  return "html";
}

function prettyCode(kind, source) {
  return kind === "html" ? formatHtml(source) : formatBraced(source);
}

function controlledTextareaValue(textarea, value) {
  if (!textarea || textarea.value === value) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (setter) setter.call(textarea, value); else textarea.value = value;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function codeLineCount(textarea) {
  return Math.max(1, Math.min(MAX_CODE_LINES, String(textarea?.value || "").split("\n").length));
}

function updateCodeGutter(textarea, gutter) {
  if (!textarea || !gutter) return;
  const count = codeLineCount(textarea);
  if (gutter.dataset.v222Count !== String(count)) {
    gutter.dataset.v222Count = String(count);
    gutter.textContent = Array.from({ length: count }, (_, index) => String(index + 1)).join("\n");
  }
  gutter.scrollTop = textarea.scrollTop;
  const metrics = textarea.closest(".tn-code-pane")?.querySelector(".v222-code-metrics>span");
  if (metrics) metrics.textContent = `${count.toLocaleString("id-ID")} / 10.000 baris · ${String(textarea.value || "").length.toLocaleString("id-ID")} karakter`;
}

function normalizeCodePane(pane) {
  const textarea = pane?.querySelector(":scope>textarea");
  if (!textarea) return;
  pane.dataset.v222CodePane = "line-numbered-light";
  const kind = codeKind(textarea);
  textarea.dataset.v222CodeKind = kind;
  textarea.dataset.v222LineLimit = String(MAX_CODE_LINES);
  textarea.setAttribute("wrap", "off");

  let gutter = pane.querySelector(":scope>.v222-code-line-gutter");
  if (!gutter) {
    gutter = document.createElement("pre");
    gutter.className = "v222-code-line-gutter";
    gutter.setAttribute("aria-hidden", "true");
    pane.insertBefore(gutter, textarea);
  }

  if (textarea.dataset.v222Bound !== "true") {
    textarea.dataset.v222Bound = "true";
    textarea.addEventListener("input", () => updateCodeGutter(textarea, gutter));
    textarea.addEventListener("scroll", () => updateCodeGutter(textarea, gutter), { passive: true });
  }

  if (textarea.dataset.v222PrettyKind !== kind) {
    textarea.dataset.v222PrettyKind = kind;
    const formatted = prettyCode(kind, textarea.value);
    if (formatted && formatted !== textarea.value) controlledTextareaValue(textarea, formatted);
  }

  const status = pane.querySelector(":scope>.tn-code-status");
  if (status && !status.querySelector(".v222-code-metrics")) {
    const box = document.createElement("span");
    box.className = "v222-code-metrics";
    const text = document.createElement("span");
    const format = document.createElement("button");
    format.type = "button";
    format.className = "v222-format-code";
    format.textContent = "Rapikan kode";
    format.addEventListener("click", () => {
      controlledTextareaValue(textarea, prettyCode(codeKind(textarea), textarea.value));
      updateCodeGutter(textarea, gutter);
      textarea.focus();
    });
    box.append(text, format);
    status.append(box);
  }
  updateCodeGutter(textarea, gutter);
}

function normalizeThemeEditor() {
  const family = familyV222();
  document.querySelectorAll(".tn-modal-layer").forEach((layer) => {
    const workspace = layer.querySelector(".tn-code-workspace");
    if (!workspace) return;
    layer.dataset.v222ThemeCode = family;
    workspace.dataset.v222Workspace = family === "small" ? "preview-above-code" : "split-50-50";
    workspace.querySelectorAll(".tn-code-pane").forEach(normalizeCodePane);
    workspace.querySelectorAll(".tn-code-preview-pane").forEach((preview) => preview.dataset.v222Preview = family);
  });
}

function normalizeThemeLayout() {
  const map = document.querySelector("#ngeblogging-layout-map.tn-layout-studio,.tn-layout-studio[data-v212-layout-areas],.tn-layout-studio");
  const canvas = map?.querySelector(".tn-layout-canvas-v170");
  if (!map || !canvas) return;
  map.dataset.v222Layout = "green-reference";
  canvas.dataset.v222LayoutCanvas = familyV222();
  map.querySelectorAll(".tn-layout-studio-header>div>h2,.tn-layout-studio-header>div>p").forEach((node) => { node.hidden = true; });
  const kicker = map.querySelector(".tn-layout-studio-header small");
  if (kicker) kicker.textContent = "PETA TATA LETAK SITUS";

  canvas.querySelectorAll(":scope>.tn-layout-slot-v170").forEach((slot) => {
    const area = Object.keys(GREEN_LABELS).find((id) => slot.classList.contains(id));
    slot.dataset.v222Slot = slot.classList.contains("content-main") ? "content-main" : "widget-area";
    slot.removeAttribute("inert");
    slot.removeAttribute("aria-hidden");
    important(slot, "pointer-events", "auto");
    slot.querySelectorAll("span,small,b").forEach((node) => {
      important(node, "writing-mode", "horizontal-tb");
      important(node, "text-orientation", "mixed");
      important(node, "word-break", "normal");
    });
    if (area) {
      slot.dataset.v222Area = area;
      const label = slot.querySelector(":scope>small");
      if (label) label.textContent = GREEN_LABELS[area];
      slot.setAttribute("aria-label", `${GREEN_LABELS[area]}. Buka pilihan widget untuk area ini.`);
    }
  });

  const main = canvas.querySelector(":scope>.content-main");
  if (main) {
    main.dataset.v222Slot = "content-main";
    const title = main.querySelector(":scope>small");
    const detail = main.querySelector(":scope>b");
    if (title) title.textContent = "Kotak postingan / Page";
    if (detail) detail.textContent = "Area utama situs";
  }
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v222Launcher = "square-icon";
    for (const property of ["animation", "transition", "filter", "transform"]) important(launcher, property, "none");
    important(launcher, "opacity", "1");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope>.nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v222Nara = full ? "modal" : "nonmodal";
  shell.dataset.v222NaraSize = size;
  shell.dataset.v222NaraFamily = familyV222();
  layer.setAttribute("aria-modal", String(full));
  if (!full) {
    important(layer, "pointer-events", "none");
    important(layer, "background", "transparent");
    important(layer, "backdrop-filter", "none");
    important(layer, "-webkit-backdrop-filter", "none");
    important(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }

  shell.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.intelligence,.nara-select.model,.nara-attachment-menu-wrap").forEach((node) => {
    node.hidden = false;
    node.removeAttribute("inert");
    node.removeAttribute("aria-hidden");
    node.dataset.v222Control = "visible";
  });

  const close = shell.querySelector('button[title="Tutup"],button[aria-label="Tutup Nara AI"],button[aria-label="Tutup Nara"]');
  if (close) {
    close.hidden = false;
    close.removeAttribute("inert");
    close.removeAttribute("aria-hidden");
    close.dataset.v222Close = "visible";
  }

  const wrap = shell.querySelector(".nara-attachment-menu-wrap");
  const plus = wrap?.querySelector(":scope>button");
  const menu = wrap?.querySelector(":scope>.nara-attachment-menu");
  if (plus) {
    plus.dataset.v222Plus = "camera-photo-file";
    plus.setAttribute("aria-label", "Tambah Kamera, Foto, atau File");
    plus.setAttribute("aria-haspopup", "menu");
    plus.setAttribute("aria-expanded", String(Boolean(menu)));
  }
  if (menu && plus) {
    menu.dataset.v222AttachmentMenu = "camera-photo-file";
    menu.setAttribute("role", "menu");
    const rect = plus.getBoundingClientRect();
    const width = Math.min(286, Math.max(220, innerWidth - 24));
    const left = Math.max(12, Math.min(innerWidth - width - 12, rect.left));
    const top = Math.max(12, rect.top - 196);
    important(menu, "position", "fixed");
    important(menu, "width", `${width}px`);
    important(menu, "left", `${left}px`);
    important(menu, "right", "auto");
    important(menu, "top", `${top}px`);
    important(menu, "bottom", "auto");
    important(menu, "display", "grid");
    important(menu, "visibility", "visible");
    important(menu, "opacity", "1");
    important(menu, "pointer-events", "auto");
    important(menu, "z-index", "2147484000");
  }
}

function normalizeSidebar() {
  document.querySelectorAll(".sn-side,.sn-sidebar-toggle,.sn-mobile-menu-mark,.sn-logo-mark").forEach((node) => {
    node.dataset.v222Stable = "true";
    for (const property of ["animation", "transition", "filter"]) important(node, property, "none");
    important(node, "opacity", "1");
  });
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  if (sidebar) sidebar.dataset.v222Family = familyV222();
}

function normalizeDomain() {
  document.querySelectorAll(".sv124-domain-page button,.sv124-domain-page a").forEach((node) => {
    const label = String(node.textContent || "").replace(/\s+/g, " ").trim();
    if (/jadikan draf|terbitkan|hubungkan|verifikasi|muat ulang|refresh|salin|hapus|jadikan utama|audit|buka/i.test(label)) node.dataset.v222DomainAction = "horizontal-full";
  });
}

function normalizeAnalytics() {
  document.querySelectorAll(".op41-line,.op41-line-v213").forEach((node) => node.dataset.v222Chart = "stock-style-real-series");
  document.querySelectorAll(".op41-donut").forEach((node) => node.dataset.v222Donut = "large-real-breakdown");
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*", ".ce-app", ".ce-app>*",
    ".tn-studio", ".tn-studio>*", ".tn-modal", ".tn-modal-body", ".tn-code-workspace",
    ".tn-code-pane", ".tn-code-preview-pane", ".tn-layout-studio", ".tn-layout-canvas-v170",
    ".sv124-domain-page", ".op41-host", ".op41-panel", ".op41-card",
  ].join(",")).forEach((node) => {
    important(node, "min-width", "0");
    important(node, "max-width", "100%");
  });
}

function sync() {
  raf = 0;
  normalizeRoot();
  normalizeSidebar();
  normalizeThemeLayout();
  normalizeThemeEditor();
  normalizeNara();
  normalizeDomain();
  normalizeAnalytics();
  normalizeContainment();
}

function schedule() {
  if (!raf) raf = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "aria-expanded", "data-nara-size", "data-preview-device", "data-studio-responsive-mode", "data-studio-device-variant", "data-studio-desktop-site-phone"],
});
for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) window.addEventListener(eventName, schedule, { passive: true });
window.visualViewport?.addEventListener?.("resize", schedule, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
schedule();

export { RELEASE, MAX_CODE_LINES, familyV222, sync };
