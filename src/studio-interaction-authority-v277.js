export const RELEASE = "studio-interaction-authority-v277-20260804";

const MAX_CODE_LINES = 10000;
let frame = 0;
let observer = null;
const codeEditors = new WeakMap();

function root() { return document.documentElement; }
function shell() { return document.querySelector(".sn-shell[data-device-mode]") || document.querySelector(".sn-shell"); }
function sidebar() { return document.getElementById("ngeblogging-studio-sidebar"); }

function resolvedMode() {
  const mode = shell()?.dataset?.deviceMode;
  if (mode === "small" || mode === "large") return mode;
  const rootMode = root().dataset.studioDeviceMode;
  if (rootMode === "small" || rootMode === "large") return rootMode;
  return window.matchMedia?.("(min-width: 761px)")?.matches ? "large" : "small";
}

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("aria-hidden");
  node.removeAttribute("inert");
}

function normalizeSidebarChrome() {
  const studioShell = shell();
  const side = sidebar();
  if (!studioShell || !side) return;

  const mode = resolvedMode();
  studioShell.dataset.v277InteractionMode = mode;
  root().dataset.studioInteractionAuthorityV277 = RELEASE;

  reveal(side);
  side.style.setProperty("display", "flex", "important");
  side.style.setProperty("visibility", "visible", "important");
  side.style.setProperty("opacity", "1", "important");
  side.style.setProperty("pointer-events", "auto", "important");
  side.style.setProperty("filter", "none", "important");
  side.style.setProperty("backdrop-filter", "none", "important");
  side.style.setProperty("-webkit-backdrop-filter", "none", "important");

  if (mode === "large") {
    side.classList.remove("mobile-open");
    document.body.classList.remove("sn-mobile-sidebar-open");
  }

  const mark = side.querySelector(".sn-logo-mark");
  reveal(mark);
  if (mark) {
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    mark.setAttribute("title", mode === "large"
      ? (side.classList.contains("collapsed") ? "Buka sidebar Ngeblogging" : "Ciutkan sidebar Ngeblogging")
      : (side.classList.contains("mobile-open") ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging"));
    const letter = mark.querySelector("strong");
    if (letter) {
      letter.textContent = "n";
      letter.style.setProperty("color", "#fff", "important");
      letter.style.setProperty("-webkit-text-fill-color", "#fff", "important");
      letter.style.setProperty("opacity", "1", "important");
    }
  }

  side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button").forEach((button) => {
    reveal(button);
    button.disabled = false;
    const label = button.querySelector("span")?.textContent?.trim() || button.textContent?.trim() || "Menu";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });

  document.querySelectorAll([
    ".sn-sidebar-edge-toggle-v147",
    ".v227-sidebar-fab",
    ".studio-external-sidebar-toggle",
    "[data-v173-collapse-toggle]",
    "[data-v187-sidebar-toggle]",
    "[data-v208-sidebar-toggle]",
    "[data-v223-sidebar-toggle]",
    "[data-v229-sidebar-toggle]",
    "#ngeblogging-studio-chrome-v244",
  ].join(",")).forEach((node) => {
    node.hidden = true;
    node.setAttribute("aria-hidden", "true");
    node.setAttribute("inert", "");
  });
}

function normalizeProfile() {
  const avatar = document.querySelector(".sn-main>.sn-top .sn-avatar,.sn-top .sn-avatar");
  if (!avatar) return;
  reveal(avatar);
  avatar.disabled = false;
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-label", "Buka menu profil");
  avatar.style.setProperty("display", "grid", "important");
  avatar.style.setProperty("visibility", "visible", "important");
  avatar.style.setProperty("opacity", "1", "important");
  avatar.style.setProperty("pointer-events", "auto", "important");
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    reveal(launcher);
    launcher.disabled = false;
    launcher.dataset.v277Floating = "true";
    launcher.style.setProperty("position", "fixed", "important");
    launcher.style.setProperty("right", "max(12px, env(safe-area-inset-right, 0px))", "important");
    launcher.style.setProperty("bottom", "max(14px, calc(env(safe-area-inset-bottom, 0px) + 10px))", "important");
    launcher.style.setProperty("left", "auto", "important");
    launcher.style.setProperty("top", "auto", "important");
    launcher.style.setProperty("transform", "none", "important");
    launcher.style.setProperty("animation", "none", "important");
    launcher.style.setProperty("opacity", "1", "important");
  }

  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) return;

  const full = panel.dataset.naraSize === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  panel.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
    if (!full) backdrop.setAttribute("inert", "");
    else backdrop.removeAttribute("inert");
  }

  if (!full) {
    for (const node of [document.documentElement, document.body, document.getElementById("root"), shell(), document.querySelector(".sn-main")]) {
      node?.removeAttribute?.("inert");
      node?.style?.removeProperty?.("pointer-events");
      node?.style?.removeProperty?.("filter");
      node?.style?.removeProperty?.("backdrop-filter");
      node?.style?.removeProperty?.("-webkit-backdrop-filter");
      node?.style?.removeProperty?.("overflow");
      node?.style?.removeProperty?.("touch-action");
    }
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
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
  gutter.className = "v277-code-lines";
  gutter.setAttribute("aria-hidden", "true");
  const pre = document.createElement("pre");
  gutter.append(pre);
  pane.append(gutter);
  textarea.dataset.v277LineNumbers = "true";
  textarea.setAttribute("data-max-lines", String(MAX_CODE_LINES));
  const sync = () => updateCodeGutter(textarea, gutter, pre);
  textarea.addEventListener("input", sync, { passive: true });
  textarea.addEventListener("scroll", sync, { passive: true });
  codeEditors.set(textarea, { gutter, pre });
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
  root().dataset.studioInteractionAuthorityV277 = RELEASE;
  normalizeSidebarChrome();
  normalizeProfile();
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
      if (records.some((record) => record.type === "childList" || ["class", "data-device-mode", "data-nara-size", "hidden"].includes(record.attributeName))) schedule();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-device-mode", "data-nara-size", "hidden"],
    });
  }
  schedule();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
  document.addEventListener("click", () => setTimeout(schedule, 0), false);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
