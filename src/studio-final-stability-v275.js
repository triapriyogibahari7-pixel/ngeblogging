export const RELEASE = "studio-final-stability-v275-20260804";

const MAX_CODE_LINES = 10000;
let frame = 0;
let observer = null;
const codeEditors = new WeakMap();

function root() { return document.documentElement; }
function sidebar() { return document.getElementById("ngeblogging-studio-sidebar"); }
function reactToggle() { return document.querySelector(".sn-main>.sn-top>.sn-sidebar-toggle,.sn-top>.sn-sidebar-toggle"); }

function compactFamily() {
  const html = root();
  if (html.dataset.studioDeviceMode === "small") return true;
  if (html.dataset.studioDeviceMode === "large") return false;
  return ["application", "phone", "mobile", "compact"].includes(html.dataset.studioResponsiveMode || "");
}

function internalMark(target) {
  return target?.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark") || null;
}

function activateSingleToggle(event) {
  const mark = internalMark(event.target);
  if (!mark) return;
  if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;

  event.preventDefault();
  event.stopImmediatePropagation();
  const toggle = reactToggle();
  if (!toggle) return;
  toggle.click();
  requestAnimationFrame(schedule);
}

function normalizeSidebar() {
  const side = sidebar();
  if (!side) return;
  const compact = compactFamily();
  const mobileOpen = compact && side.classList.contains("mobile-open");
  const collapsed = !compact && side.classList.contains("collapsed");

  side.hidden = false;
  side.removeAttribute("aria-hidden");
  side.removeAttribute("inert");
  side.dataset.v275State = compact ? (mobileOpen ? "drawer-open" : "mobile-trigger") : (collapsed ? "rail" : "expanded");
  document.body.classList.toggle("sn-mobile-sidebar-open", mobileOpen);

  const mark = side.querySelector(".sn-logo-mark");
  if (mark) {
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    mark.setAttribute("aria-expanded", String(compact ? mobileOpen : !collapsed));
    mark.setAttribute("aria-label", compact
      ? (mobileOpen ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging")
      : (collapsed ? "Buka menu Ngeblogging" : "Ciutkan menu Ngeblogging"));
    mark.setAttribute("title", mark.getAttribute("aria-label"));
    const letter = mark.querySelector("strong");
    if (letter) letter.textContent = "n";
  }

  side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button").forEach((button) => {
    button.hidden = false;
    button.removeAttribute("aria-hidden");
    button.removeAttribute("inert");
    const label = button.querySelector("span")?.textContent?.trim() || button.textContent?.trim() || "Menu";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });

  const bridge = reactToggle();
  if (bridge) {
    bridge.dataset.v275InternalBridge = "true";
    bridge.setAttribute("aria-hidden", "true");
    bridge.setAttribute("tabindex", "-1");
  }
}

function normalizeTopbar() {
  const top = document.querySelector(".sn-main>.sn-top");
  const avatar = top?.querySelector(".sn-avatar");
  if (!top || !avatar) return;
  top.dataset.v275Profile = "ready";
  avatar.hidden = false;
  avatar.disabled = false;
  avatar.removeAttribute("aria-hidden");
  avatar.removeAttribute("inert");
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-label", "Buka menu profil");
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.hidden = false;
    launcher.disabled = false;
    launcher.removeAttribute("aria-hidden");
    launcher.removeAttribute("inert");
    launcher.dataset.v275Floating = "true";
  }

  const shell = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = shell?.closest(".nara-assistant-layer");
  if (!shell || !layer) return;
  const full = shell.dataset.naraSize === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  shell.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(":scope>.nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
    if (!full) backdrop.setAttribute("inert", "");
    else backdrop.removeAttribute("inert");
  }

  if (!full) {
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
    for (const node of [document.documentElement, document.body, document.getElementById("root"), document.querySelector(".sn-shell"), document.querySelector(".sn-main")]) {
      node?.removeAttribute?.("inert");
      node?.style?.removeProperty("pointer-events");
      node?.style?.removeProperty("filter");
      node?.style?.removeProperty("backdrop-filter");
      node?.style?.removeProperty("overflow");
    }
  }
}

function lineNumbers(count) {
  const safeCount = Math.max(1, Math.min(MAX_CODE_LINES, count));
  let output = "";
  for (let index = 1; index <= safeCount; index += 1) output += `${index}\n`;
  return output;
}

function updateCodeGutter(textarea, gutter, pre) {
  if (!textarea.isConnected || !gutter.isConnected) return;
  const count = Math.min(MAX_CODE_LINES, String(textarea.value || "").split("\n").length);
  if (gutter.dataset.lineCount !== String(count)) {
    gutter.dataset.lineCount = String(count);
    pre.textContent = lineNumbers(count);
  }
  gutter.style.top = `${textarea.offsetTop}px`;
  gutter.style.left = `${textarea.offsetLeft}px`;
  gutter.style.height = `${textarea.clientHeight}px`;
  pre.style.transform = `translateY(${-textarea.scrollTop}px)`;
}

function enhanceCodeEditor(textarea) {
  if (codeEditors.has(textarea)) {
    const record = codeEditors.get(textarea);
    updateCodeGutter(textarea, record.gutter, record.pre);
    return;
  }
  const pane = textarea.closest(".tn-code-pane");
  if (!pane) return;
  const gutter = document.createElement("div");
  gutter.className = "v275-code-lines";
  gutter.setAttribute("aria-hidden", "true");
  const pre = document.createElement("pre");
  gutter.append(pre);
  pane.append(gutter);
  textarea.dataset.v275LineNumbers = "true";
  textarea.setAttribute("data-max-lines", String(MAX_CODE_LINES));

  const sync = () => updateCodeGutter(textarea, gutter, pre);
  textarea.addEventListener("input", sync, { passive: true });
  textarea.addEventListener("scroll", sync, { passive: true });
  codeEditors.set(textarea, { gutter, pre, sync });
  sync();
}

function normalizeCodeEditors() {
  document.querySelectorAll(".tn-code-pane textarea").forEach(enhanceCodeEditor);
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*", ".sn-content-card", ".sn-content-card>*",
    ".tn-studio", ".tn-studio>*", ".tn-code-workspace", ".tn-code-pane", ".tn-code-preview-pane",
    ".tn-layout-studio", ".sv124-page", ".sv124-page>*", ".ce-app", ".ce-app>*",
  ].join(",")).forEach((node) => {
    node.style.setProperty("min-width", "0", "important");
    node.style.setProperty("max-width", "100%", "important");
  });
}

function sync() {
  frame = 0;
  root().dataset.studioFinalStabilityV275 = RELEASE;
  root().dataset.v275CompactFamily = String(compactFamily());
  normalizeSidebar();
  normalizeTopbar();
  normalizeNara();
  normalizeCodeEditors();
  normalizeContainment();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

function start() {
  if (!observer && document.body) {
    observer = new MutationObserver((records) => {
      if (records.some((record) => record.type === "childList" || record.attributeName === "class" || record.attributeName === "data-nara-size")) schedule();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-nara-size"],
    });
  }
  schedule();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", activateSingleToggle, true);
  document.addEventListener("keydown", activateSingleToggle, true);
  document.addEventListener("click", () => setTimeout(schedule, 0), false);
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
