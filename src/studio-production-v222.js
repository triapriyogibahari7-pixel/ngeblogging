import "./studio-production-v222.css";

const RELEASE = "studio-production-v222-20260803";
const MAX_CODE_LINES = 10000;
let frame = 0;

const SLOT_LABELS = Object.freeze({
  "top-left-1": "Header kiri · kotak 1",
  "top-right-1": "Header kanan · kotak 1",
  "top-left-2": "Header kiri · kotak 2",
  "top-right-2": "Header kanan · kotak 2",
  "top-left-3": "Navigasi / area atas",
  "top-right-3": "Kotak panjang di bawah header",
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

function physicalSmall() {
  const ua = navigator.userAgent || "";
  const mobileUa = navigator.userAgentData?.mobile === true || /Android.+Mobile|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua);
  const shortSide = Math.min(Number(screen?.width || innerWidth), Number(screen?.height || innerHeight));
  return mobileUa || shortSide < 768;
}

function family() {
  const root = document.documentElement;
  if (root.dataset.studioDesktopSitePhone === "true") return "large";
  if (physicalSmall()) return "small";
  const responsive = root.dataset.studioResponsiveMode || "";
  const variant = root.dataset.studioDeviceVariant || "";
  if (["tablet", "desktop"].includes(responsive) || ["laptop", "desktop", "computer"].includes(variant)) return "large";
  return innerWidth >= 768 ? "large" : "small";
}

function normalizeRoot() {
  const root = document.documentElement;
  const next = family();
  root.dataset.studioProductionV222 = RELEASE;
  root.dataset.studioV222Family = next;
  root.dataset.studioV221Family = next;
  root.dataset.studioV220Family = next;
  root.dataset.studioV216PhysicalFamily = next;
  root.dataset.studioV219Small = String(next === "small");
  root.dataset.studioV222PhysicalSmall = String(physicalSmall());
  if (root.dataset.studioDesktopSitePhone === "true") {
    root.dataset.studioResponsiveMode = "desktop";
    root.dataset.studioDeviceVariant = "desktop";
    root.dataset.studioV222ModeLock = "explicit-desktop-site";
  } else if (physicalSmall()) {
    if (["tablet", "desktop"].includes(root.dataset.studioResponsiveMode || "")) root.dataset.studioResponsiveMode = "phone";
    if (["laptop", "desktop", "computer"].includes(root.dataset.studioDeviceVariant || "")) root.dataset.studioDeviceVariant = "phone";
    root.dataset.studioV222ModeLock = "physical-small";
  } else {
    root.dataset.studioV222ModeLock = "large-device";
  }
}

function normalizeLayout() {
  const map = document.querySelector("#ngeblogging-layout-map.tn-layout-studio,.tn-layout-studio[data-v221-layout]");
  const canvas = map?.querySelector(".tn-layout-canvas-v170");
  if (!map || !canvas) return;
  map.dataset.v222Layout = "green-reference-full-width";
  canvas.dataset.v222LayoutCanvas = "semantic-four-left-four-right";
  canvas.removeAttribute("data-v212-layout-map");
  canvas.removeAttribute("data-v213-layout-map");
  map.querySelectorAll(".tn-layout-studio-header>div>h2,.tn-layout-studio-header>div>p").forEach((node) => { node.hidden = true; });
  const kicker = map.querySelector(".tn-layout-studio-header small");
  if (kicker) kicker.textContent = "PETA TATA LETAK SITUS";

  canvas.querySelectorAll(":scope>.tn-layout-slot-v170").forEach((slot) => {
    slot.removeAttribute("inert");
    slot.removeAttribute("aria-hidden");
    slot.removeAttribute("aria-disabled");
    important(slot, "pointer-events", "auto");
    const area = Object.keys(SLOT_LABELS).find((id) => slot.classList.contains(id));
    if (!area) return;
    slot.dataset.v222Area = area;
    slot.dataset.v222Slot = "widget-area";
    const label = slot.querySelector(":scope>small");
    if (label) label.textContent = SLOT_LABELS[area];
    slot.setAttribute("aria-label", `${SLOT_LABELS[area]}. Buka pilihan widget untuk area ini.`);
    slot.setAttribute("title", `${SLOT_LABELS[area]} — klik untuk memilih widget`);
  });

  const main = canvas.querySelector(":scope>.content-main");
  if (main) {
    main.dataset.v222Slot = "content-main";
    main.removeAttribute("inert");
    main.removeAttribute("aria-hidden");
    main.removeAttribute("aria-disabled");
    main.removeAttribute("data-v213-locked-content");
    important(main, "pointer-events", "auto");
    main.setAttribute("aria-label", "Kotak postingan / Page. Klik untuk mengatur widget area konten.");
    const label = main.querySelector(":scope>small");
    const detail = main.querySelector(":scope>b");
    if (label) label.textContent = "Kotak postingan / Page";
    if (detail) detail.textContent = "Area utama situs";
  }

  const side = map.querySelector(":scope>.tn-layout-side");
  if (side) side.dataset.v222WidgetList = "below-map";
}

function codeKind(textarea) {
  const label = String(textarea?.getAttribute("aria-label") || "").toLowerCase();
  if (label.includes("javascript")) return "javascript";
  if (label.includes("css")) return "css";
  return "html";
}

function formatHtml(source) {
  const input = String(source || "").trim();
  if (!input) return input;
  const tokens = input.replace(/>\s*</g, "><").replace(/></g, ">\n<").split("\n");
  let depth = 0;
  const voidTag = /^<(?:!doctype|area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i;
  return tokens.map((raw) => {
    const token = raw.trim();
    if (!token) return "";
    if (/^<\//.test(token)) depth = Math.max(0, depth - 1);
    const line = `${"  ".repeat(depth)}${token}`;
    if (/^<[^!/][^>]*>/.test(token) && !/^<.*<\//.test(token) && !/\/>$/.test(token) && !voidTag.test(token)) depth += 1;
    return line;
  }).filter(Boolean).slice(0, MAX_CODE_LINES).join("\n");
}

function formatBraced(source) {
  const input = String(source || "").trim();
  if (!input) return input;
  let out = "", indent = 0, quote = "", escaped = false, lineComment = false, blockComment = false;
  const newline = () => {
    out = out.replace(/[ \t]+$/g, "");
    if (!out.endsWith("\n")) out += "\n";
    out += "  ".repeat(Math.max(0, indent));
  };
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i], next = input[i + 1] || "";
    if (lineComment) { out += ch; if (ch === "\n") { lineComment = false; out += "  ".repeat(indent); } continue; }
    if (blockComment) { out += ch; if (ch === "*" && next === "/") { out += next; i += 1; blockComment = false; } continue; }
    if (quote) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = "";
      continue;
    }
    if (["\"", "'", "`"].includes(ch)) { quote = ch; out += ch; continue; }
    if (ch === "/" && next === "/") { lineComment = true; out += "//"; i += 1; continue; }
    if (ch === "/" && next === "*") { blockComment = true; out += "/*"; i += 1; continue; }
    if (ch === "{") { out += "{"; indent += 1; newline(); continue; }
    if (ch === "}") { indent = Math.max(0, indent - 1); out = out.replace(/[ \t]+$/g, ""); if (!out.endsWith("\n")) newline(); out += "}"; if (next && ![";", ",", ")"].includes(next)) newline(); continue; }
    if (ch === ";") { out += ";"; newline(); continue; }
    if (ch === "\n" || ch === "\r") { if (!out.endsWith("\n")) newline(); continue; }
    out += ch;
  }
  return out.split("\n").slice(0, MAX_CODE_LINES).join("\n").trim();
}

function prettyCode(kind, source) {
  return kind === "html" ? formatHtml(source) : formatBraced(source);
}

function controlledValue(textarea, value) {
  if (!textarea || textarea.value === value) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (setter) setter.call(textarea, value); else textarea.value = value;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function lineKey(kind) {
  return `v222Edited${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
}

function updateGutter(textarea, gutter) {
  const actual = Math.max(1, String(textarea.value || "").split("\n").length);
  const shown = Math.min(MAX_CODE_LINES, actual);
  if (gutter.dataset.v222Count !== String(shown)) {
    gutter.dataset.v222Count = String(shown);
    gutter.textContent = Array.from({ length: shown }, (_, index) => String(index + 1)).join("\n");
  }
  gutter.scrollTop = textarea.scrollTop;
  const status = textarea.closest(".tn-code-pane")?.querySelector(".v222-line-status");
  if (status) status.textContent = `${actual.toLocaleString("id-ID")} baris · ${String(textarea.value || "").length.toLocaleString("id-ID")} karakter${actual > MAX_CODE_LINES ? ` · kurangi ${(actual - MAX_CODE_LINES).toLocaleString("id-ID")} baris` : ""}`;
}

function normalizeCodePane(pane) {
  const textarea = pane?.querySelector(":scope>textarea");
  if (!textarea) return;
  const kind = codeKind(textarea);
  pane.dataset.v222CodePane = "actual-line-numbers";
  textarea.dataset.v222CodeKind = kind;
  textarea.setAttribute("wrap", "off");
  textarea.setAttribute("aria-description", `Editor ${kind} dengan penomoran baris aktual sampai ${MAX_CODE_LINES.toLocaleString("id-ID")} baris.`);

  let gutter = pane.querySelector(":scope>.v222-code-line-gutter");
  if (!gutter) {
    gutter = document.createElement("pre");
    gutter.className = "v222-code-line-gutter";
    gutter.setAttribute("aria-hidden", "true");
    pane.insertBefore(gutter, textarea);
  }
  pane.querySelectorAll(":scope>.v216-code-line-gutter,:scope>.v219-code-line-gutter,:scope>.v220-code-line-gutter").forEach((old) => { old.hidden = true; });

  const editKey = lineKey(kind);
  const raw = String(textarea.value || "");
  const rawLines = raw.split("\n").length;
  const signature = `${kind}:${raw.length}:${raw.slice(0, 48)}`;
  if (textarea.dataset.v222FormatSignature !== signature && textarea.dataset[editKey] !== "true" && raw.length > 80 && rawLines <= 4) {
    const pretty = prettyCode(kind, raw);
    textarea.dataset.v222FormatSignature = signature;
    if (pretty && pretty !== raw && pretty.split("\n").length > rawLines) {
      controlledValue(textarea, pretty);
    }
  }

  if (textarea.dataset.v222Bound !== "true") {
    textarea.dataset.v222Bound = "true";
    textarea.addEventListener("input", (event) => {
      if (event.isTrusted) textarea.dataset[lineKey(codeKind(textarea))] = "true";
      updateGutter(textarea, gutter);
    });
    textarea.addEventListener("scroll", () => updateGutter(textarea, gutter), { passive: true });
    textarea.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.setRangeText("  ", start, end, "end");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  const status = pane.querySelector(":scope>.tn-code-status");
  if (status && !status.querySelector(".v222-line-status")) {
    const metrics = document.createElement("span");
    metrics.className = "v222-line-status";
    const format = document.createElement("button");
    format.type = "button";
    format.className = "v222-format-code";
    format.textContent = "Rapikan kode";
    format.addEventListener("click", () => {
      const currentKind = codeKind(textarea);
      const pretty = prettyCode(currentKind, textarea.value);
      controlledValue(textarea, pretty);
      textarea.dataset[lineKey(currentKind)] = "true";
      updateGutter(textarea, gutter);
      textarea.focus();
    });
    status.append(metrics, format);
  }
  updateGutter(textarea, gutter);
}

function normalizeCode() {
  const next = family();
  document.querySelectorAll(".tn-modal-layer").forEach((layer) => {
    const workspace = layer.querySelector(".tn-code-workspace");
    if (!workspace) return;
    layer.dataset.v222ThemeCodeModal = next;
    workspace.dataset.v222Workspace = next === "small" ? "preview-above-code" : "code-left-preview-right";
    workspace.querySelectorAll(".tn-code-pane").forEach(normalizeCodePane);
    workspace.querySelectorAll(".tn-code-preview-pane").forEach((preview) => { preview.dataset.v222Preview = next; });
  });
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v222Launcher = "stable-square";
    for (const prop of ["animation", "transition", "filter", "transform"]) important(launcher, prop, "none");
    important(launcher, "opacity", "1");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope>.nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v222NaraMode = full ? "modal" : "nonmodal";
  shell.dataset.v222NaraSize = size;
  shell.dataset.v222NaraFamily = family();
  layer.setAttribute("aria-modal", String(full));
  if (!full) {
    important(layer, "pointer-events", "none");
    important(layer, "background", "transparent");
    important(layer, "backdrop-filter", "none");
    important(layer, "-webkit-backdrop-filter", "none");
    important(shell, "pointer-events", "auto");
    important(shell, "transform", "none");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }

  shell.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.intelligence,.nara-select.model,.nara-attachment-menu-wrap").forEach((node) => {
    node.hidden = false;
    node.removeAttribute("inert");
    node.removeAttribute("aria-hidden");
    node.dataset.v222Control = "visible";
  });

  const plus = shell.querySelector(".nara-attachment-menu-wrap>button");
  const menu = shell.querySelector(".nara-attachment-menu");
  if (plus) {
    plus.dataset.v222Plus = "camera-photo-file";
    plus.setAttribute("aria-expanded", String(Boolean(menu)));
    plus.setAttribute("aria-haspopup", "menu");
  }
  if (!plus || !menu) return;
  menu.dataset.v222AttachmentMenu = "fixed-visible";
  menu.setAttribute("role", "menu");
  const rect = plus.getBoundingClientRect();
  const width = Math.min(292, Math.max(220, innerWidth - 24));
  const estimatedHeight = 184;
  const left = Math.max(12, Math.min(innerWidth - width - 12, rect.left));
  const above = rect.top - estimatedHeight - 10;
  const top = above >= 12 ? above : Math.min(innerHeight - estimatedHeight - 12, rect.bottom + 10);
  important(menu, "position", "fixed");
  important(menu, "width", `${width}px`);
  important(menu, "max-width", "calc(100vw - 24px)");
  important(menu, "left", `${left}px`);
  important(menu, "right", "auto");
  important(menu, "top", `${Math.max(12, top)}px`);
  important(menu, "bottom", "auto");
  important(menu, "display", "grid");
  important(menu, "visibility", "visible");
  important(menu, "opacity", "1");
  important(menu, "pointer-events", "auto");
  important(menu, "z-index", "2147484200");
}

function normalizeChrome() {
  document.querySelectorAll(".sn-side,.sn-sidebar-toggle,.sn-mobile-menu-mark").forEach((node) => {
    node.dataset.v222Stable = "true";
    for (const prop of ["animation", "transition", "filter"]) important(node, prop, "none");
    important(node, "opacity", "1");
  });
  document.querySelectorAll(".sn-side-backdrop").forEach((node) => {
    important(node, "backdrop-filter", "none");
    important(node, "-webkit-backdrop-filter", "none");
  });
}

function normalizeDomain() {
  if (family() !== "small") return;
  document.querySelectorAll(".sv124-domain-page button,.sv124-domain-page a").forEach((node) => {
    const label = String(node.textContent || "").replace(/\s+/g, " ").trim();
    if (/jadikan draf|terbitkan|hubungkan|verifikasi|muat ulang|refresh|salin|hapus|jadikan utama/i.test(label)) node.dataset.v222DomainAction = "full-horizontal";
  });
}

function sync() {
  frame = 0;
  normalizeRoot();
  normalizeLayout();
  normalizeCode();
  normalizeNara();
  normalizeChrome();
  normalizeDomain();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "aria-expanded", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-variant", "data-studio-desktop-site-phone", "value"],
});
for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) window.addEventListener(eventName, schedule, { passive: true });
schedule();
