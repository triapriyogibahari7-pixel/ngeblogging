import "./studio-production-v220.css";

const RELEASE = "studio-production-v220-20260802";
const MAX_CODE_LINES = 10000;
let frame = 0;

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function finalFamily() {
  const root = document.documentElement;
  const responsive = root.dataset.studioResponsiveMode || "";
  const variant = root.dataset.studioDeviceVariant || "";
  const desktopSite = root.dataset.studioDesktopSitePhone === "true";
  if (desktopSite) return "large";
  if (["tablet", "desktop"].includes(responsive)) return "large";
  if (["laptop", "desktop", "computer"].includes(variant)) return "large";
  if (["application", "phone", "mobile", "compact"].includes(responsive)) return "small";
  return Math.min(window.screen?.width || innerWidth, window.screen?.height || innerHeight) >= 768 ? "large" : "small";
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
    if (ch === "\n" || ch === "\r") continue;
    out += ch;
  }
  return out.split("\n").slice(0, MAX_CODE_LINES).join("\n").trim();
}

function prettyCode(kind, source) {
  return kind === "html" ? formatHtml(source) : formatBraced(source);
}

function controlledTextareaValue(textarea, value) {
  if (!textarea || !value || textarea.value === value) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (setter) setter.call(textarea, value); else textarea.value = value;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function codeKind(textarea) {
  const label = String(textarea?.getAttribute("aria-label") || "").toLowerCase();
  if (label.includes("javascript")) return "javascript";
  if (label.includes("css")) return "css";
  return "html";
}

function updateGutter(textarea, gutter) {
  const count = Math.max(1, Math.min(MAX_CODE_LINES, String(textarea.value || "").split("\n").length));
  if (gutter.dataset.v220Count !== String(count)) {
    gutter.dataset.v220Count = String(count);
    gutter.textContent = Array.from({ length: count }, (_, index) => String(index + 1)).join("\n");
  }
  gutter.scrollTop = textarea.scrollTop;
  const status = textarea.closest(".tn-code-pane")?.querySelector(".v220-line-status");
  if (status) status.textContent = `${count} baris · ${String(textarea.value || "").length.toLocaleString("id-ID")} karakter`;
}

function normalizeCodePane(pane) {
  const textarea = pane?.querySelector(":scope > textarea");
  if (!textarea) return;
  const kind = codeKind(textarea);
  textarea.dataset.v220CodeKind = kind;
  textarea.dataset.v220LineLimit = String(MAX_CODE_LINES);
  textarea.setAttribute("wrap", "off");

  let gutter = pane.querySelector(":scope > .v220-code-line-gutter");
  if (!gutter) {
    gutter = document.createElement("pre");
    gutter.className = "v220-code-line-gutter";
    gutter.setAttribute("aria-hidden", "true");
    pane.insertBefore(gutter, textarea);
  }
  pane.querySelectorAll(":scope > .v216-code-line-gutter,:scope > .v219-code-line-gutter").forEach((old) => { old.hidden = true; });

  if (textarea.dataset.v220Bound !== "true") {
    textarea.dataset.v220Bound = "true";
    textarea.addEventListener("input", () => updateGutter(textarea, gutter));
    textarea.addEventListener("scroll", () => updateGutter(textarea, gutter), { passive: true });
  }

  if (textarea.dataset.v220PrettySeed !== "true") {
    textarea.dataset.v220PrettySeed = "true";
    const pretty = prettyCode(kind, textarea.value);
    if (pretty && pretty !== textarea.value) controlledTextareaValue(textarea, pretty);
  }

  const status = pane.querySelector(":scope > .tn-code-status");
  if (status && !status.querySelector(".v220-format-code")) {
    const metrics = document.createElement("span");
    metrics.className = "v220-line-status";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "v220-format-code";
    button.textContent = "Rapikan kode";
    button.addEventListener("click", () => {
      controlledTextareaValue(textarea, prettyCode(kind, textarea.value));
      updateGutter(textarea, gutter);
      textarea.focus();
    });
    status.append(metrics, button);
  }
  updateGutter(textarea, gutter);
}

function normalizeRoot() {
  const root = document.documentElement;
  const family = finalFamily();
  root.dataset.studioProductionV220 = RELEASE;
  root.dataset.studioV220Family = family;
  root.dataset.studioV220DesktopSiteLocked = String(root.dataset.studioDesktopSitePhone === "true");
  // Historical v216/v219 CSS contains !important rules. Make those layers agree
  // with the final family instead of fighting the user-selected desktop-site mode.
  root.dataset.studioV216PhysicalFamily = family;
  root.dataset.studioV219Small = String(family === "small");
}

function normalizeTheme() {
  const family = finalFamily();
  document.querySelectorAll(".tn-studio").forEach((studio) => {
    studio.dataset.v220Theme = "visible";
    studio.removeAttribute("hidden");
    studio.removeAttribute("inert");
    setImportant(studio, "opacity", "1");
    setImportant(studio, "visibility", "visible");
  });
  document.querySelectorAll(".tn-layout-studio-header > div > h2,.tn-layout-studio-header > div > p").forEach((node) => {
    node.dataset.v220LayoutProse = "hidden";
  });
  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    const mode = family === "small" ? "preview-above-code" : "split-50-50";
    workspace.dataset.v220Workspace = mode;
    workspace.dataset.v219Workspace = mode;
    workspace.dataset.v216Workspace = mode;
    workspace.querySelectorAll(".tn-code-pane").forEach((pane) => {
      pane.dataset.v220CodePane = "readable";
      normalizeCodePane(pane);
    });
    workspace.querySelectorAll(".tn-code-preview-pane").forEach((preview) => preview.dataset.v220Preview = family);
  });
  document.querySelectorAll(".tn-modal-layer").forEach((layer) => {
    if (!layer.querySelector(".tn-code-workspace")) return;
    layer.dataset.v220ThemeCodeModal = family;
    const modal = layer.querySelector(":scope > .tn-modal");
    if (modal) modal.dataset.v220ThemeCode = "visible";
  });
}

function normalizeLayout() {
  const family = finalFamily();
  const map = document.querySelector("#ngeblogging-layout-map.tn-layout-studio,.tn-layout-studio[data-v212-layout-areas]");
  const canvas = map?.querySelector(".tn-layout-canvas-v170");
  if (!map || !canvas) return;
  map.dataset.v220Layout = family === "small" ? "compact-denah-four-four" : "large-denah-four-four";
  canvas.dataset.v220LayoutCanvas = family;
  map.dataset.v216Layout = family === "small" ? "small-compact-four-plus-four" : "large-four-plus-four";
  canvas.dataset.v216LayoutCanvas = family;
  map.dataset.v219Layout = family === "small" ? "compact-four-four" : "large-four-four";
  canvas.dataset.v219LayoutCanvas = family === "small" ? "compact" : "large";
  canvas.querySelectorAll(":scope > .tn-layout-slot-v170").forEach((slot) => {
    slot.dataset.v220Slot = slot.classList.contains("content-main") ? "content-main" : "widget-area";
    slot.removeAttribute("inert");
    slot.removeAttribute("aria-hidden");
  });
}

function normalizeNara() {
  const family = finalFamily();
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v220Stable = "true";
    for (const property of ["animation", "transition", "filter", "transform"]) setImportant(launcher, property, "none");
    setImportant(launcher, "opacity", "1");
    setImportant(launcher, "display", "grid");
    setImportant(launcher, "place-items", "center");
  }
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  layer.dataset.v220NaraMode = full ? "modal" : "nonmodal";
  shell.dataset.v220NaraSize = size;
  shell.dataset.v220NaraFamily = family;
  layer.setAttribute("aria-modal", String(full));
  if (!full) {
    setImportant(layer, "pointer-events", "none");
    setImportant(layer, "background", "transparent");
    setImportant(layer, "backdrop-filter", "none");
    setImportant(layer, "-webkit-backdrop-filter", "none");
    setImportant(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }
  shell.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-select.intelligence,.nara-select.model,.nara-attachment-menu-wrap").forEach((node) => {
    node.dataset.v220Control = "visible";
    node.removeAttribute("hidden");
    node.removeAttribute("inert");
    node.removeAttribute("aria-hidden");
  });
  const plus = shell.querySelector('.nara-attachment-menu-wrap > button[aria-controls="nara-attachment-menu-v211"],.nara-attachment-menu-wrap > button');
  if (plus) plus.dataset.v220Plus = "camera-photo-file";
  const menu = shell.querySelector("#nara-attachment-menu-v211,.nara-attachment-menu");
  if (menu && plus) {
    menu.dataset.v220AttachmentMenu = "camera-photo-file";
    const rect = plus.getBoundingClientRect();
    const width = Math.min(286, Math.max(220, innerWidth - 24));
    setImportant(menu, "position", "fixed");
    setImportant(menu, "width", `${width}px`);
    setImportant(menu, "max-width", "calc(100vw - 24px)");
    setImportant(menu, "left", `${Math.max(12, Math.min(innerWidth - width - 12, rect.left))}px`);
    setImportant(menu, "right", "auto");
    setImportant(menu, "top", `${Math.max(12, rect.top - 196)}px`);
    setImportant(menu, "bottom", "auto");
    setImportant(menu, "z-index", "2147483900");
    setImportant(menu, "pointer-events", "auto");
  }
}

function normalizeChromeAndContainment() {
  for (const node of document.querySelectorAll(".sn-side,.sn-sidebar-toggle,.sn-mobile-menu-mark")) {
    node.dataset.v220Stable = "true";
    for (const property of ["animation", "transition", "filter"]) setImportant(node, property, "none");
    setImportant(node, "opacity", "1");
  }
  document.querySelectorAll(".sn-sidebar-toggle,.sn-mobile-menu-mark").forEach((node) => {
    setImportant(node, "display", "grid"); setImportant(node, "place-items", "center");
  });
  document.querySelectorAll(".sn-side-backdrop").forEach((node) => {
    setImportant(node, "backdrop-filter", "none"); setImportant(node, "-webkit-backdrop-filter", "none");
  });
  document.querySelectorAll(".sv124-domain-page button,.sv124-domain-page a").forEach((node) => {
    const label = String(node.textContent || "").replace(/\s+/g, " ").trim();
    if (/jadikan draf|terbitkan|hubungkan|verifikasi|muat ulang|refresh|salin|hapus|jadikan utama/i.test(label)) node.dataset.v220DomainAction = "horizontal-full";
  });
  document.querySelectorAll(".sn-main,.sn-view-pad,.tn-studio,.tn-modal,.tn-modal-body,.tn-code-workspace,.tn-code-pane,.tn-code-preview-pane,.tn-layout-studio,.tn-layout-canvas-v170,.sv124-domain-page,.op41-host,.op41-panel,.op41-card").forEach((node) => {
    setImportant(node, "min-width", "0"); setImportant(node, "max-width", "100%");
  });
}

function sync() {
  frame = 0;
  normalizeRoot();
  normalizeTheme();
  normalizeLayout();
  normalizeNara();
  normalizeChromeAndContainment();
}

function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
new MutationObserver(schedule).observe(document.documentElement, {
  childList: true, subtree: true, attributes: true,
  attributeFilter: ["class", "hidden", "aria-expanded", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-variant", "data-studio-desktop-site-phone"],
});
for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) window.addEventListener(eventName, schedule, { passive: true });
window.visualViewport?.addEventListener?.("resize", schedule, { passive: true });
sync();

export { RELEASE, MAX_CODE_LINES, finalFamily, prettyCode, sync };
