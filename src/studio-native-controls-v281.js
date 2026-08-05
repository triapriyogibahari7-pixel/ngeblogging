export const RELEASE = "studio-native-controls-v281-20260805";
export const MAX_CODE_LINES = 10000;
export const MAX_CONTENT_WORDS = 5000;
export const CONTENT_WARNING_WORDS = 4500;

let frame = 0;
let bootPass = 0;
const BOOT_PASSES = 4;

function root() { return document.documentElement; }
function shell() { return document.querySelector(".sn-shell[data-device-mode]") || document.querySelector(".sn-shell"); }
function sidebar() { return document.getElementById("ngeblogging-studio-sidebar"); }

function layoutMode() {
  const shellMode = shell()?.dataset?.deviceMode;
  if (shellMode === "small" || shellMode === "large") return shellMode;
  const htmlMode = root().dataset.studioDeviceMode;
  if (htmlMode === "small" || htmlMode === "large") return htmlMode;
  return window.matchMedia?.("(min-width:761px)")?.matches ? "large" : "small";
}

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("aria-hidden");
  node.removeAttribute("inert");
}

function normalizeContainingBlocks() {
  root().dataset.studioNativeControlsV281 = RELEASE;
  for (const node of [root(), document.body, document.getElementById("root"), shell()]) {
    if (!node) continue;
    node.style.setProperty("transform", "none", "important");
    node.style.setProperty("filter", "none", "important");
    node.style.setProperty("perspective", "none", "important");
    node.style.setProperty("contain", "none", "important");
    node.style.setProperty("will-change", "auto", "important");
  }
}

function normalizeSidebar() {
  const app = shell();
  const side = sidebar();
  if (!app || !side) return;
  const small = layoutMode() === "small";
  const open = small && side.classList.contains("mobile-open");
  const collapsed = !small && side.classList.contains("collapsed");

  app.dataset.v281LayoutMode = small ? "small" : "large";
  document.body.classList.toggle("sn-mobile-sidebar-open", open);
  reveal(side);
  side.style.setProperty("display", "flex", "important");
  side.style.setProperty("visibility", "visible", "important");
  side.style.setProperty("opacity", "1", "important");
  side.style.setProperty("filter", "none", "important");

  const mark = side.querySelector(".sn-logo-mark");
  if (mark) {
    reveal(mark);
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    mark.setAttribute("aria-expanded", String(small ? open : !collapsed));
    mark.setAttribute("aria-label", small
      ? (open ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging")
      : (collapsed ? "Buka sidebar Ngeblogging" : "Ciutkan sidebar Ngeblogging"));
    mark.style.setProperty("pointer-events", "auto", "important");
    mark.style.setProperty("touch-action", "manipulation", "important");
    const letter = mark.querySelector("strong");
    if (letter) {
      letter.textContent = "n";
      letter.style.setProperty("color", "#fff", "important");
      letter.style.setProperty("-webkit-text-fill-color", "#fff", "important");
      letter.style.setProperty("opacity", "1", "important");
    }
  }

  const brand = side.querySelector(".sn-logo>b");
  if (brand) {
    brand.textContent = "Ngeblogging";
    brand.style.setProperty("visibility", small && !open ? "hidden" : "visible", "important");
  }

  side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button").forEach((button) => {
    reveal(button);
    button.disabled = false;
    button.style.setProperty("touch-action", "manipulation", "important");
    const label = button.querySelector("span")?.textContent?.trim() || button.textContent?.trim() || "Menu";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });
}

function normalizeProfile() {
  const top = document.querySelector(".sn-main>.sn-top");
  const actions = top?.querySelector(".sn-top-actions");
  const avatar = actions?.querySelector(".sn-avatar") || top?.querySelector(".sn-avatar");
  if (!top || !avatar) return;
  reveal(top);
  reveal(actions);
  reveal(avatar);
  avatar.disabled = false;
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-label", "Buka menu profil");
  avatar.style.setProperty("display", "grid", "important");
  avatar.style.setProperty("visibility", "visible", "important");
  avatar.style.setProperty("opacity", "1", "important");
  avatar.style.setProperty("pointer-events", "auto", "important");
  avatar.style.setProperty("touch-action", "manipulation", "important");
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    reveal(launcher);
    launcher.disabled = false;
    launcher.dataset.v281ViewportFixed = "true";
    launcher.style.setProperty("position", "fixed", "important");
    launcher.style.setProperty("left", "auto", "important");
    launcher.style.setProperty("top", "auto", "important");
    launcher.style.setProperty("transform", "none", "important");
    launcher.style.setProperty("animation", "none", "important");
    launcher.style.setProperty("filter", "none", "important");
    launcher.style.setProperty("pointer-events", "auto", "important");
    launcher.style.setProperty("touch-action", "manipulation", "important");
  }

  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) return;

  const full = panel.dataset.naraSize === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  panel.setAttribute("aria-modal", String(full));

  panel.querySelectorAll(".nara-select,.nara-composer-tools>button,.nara-attachment-menu-wrap>button").forEach((control) => reveal(control));

  const backdrop = layer.querySelector(":scope>.nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
    if (!full) backdrop.setAttribute("inert", "");
    else backdrop.removeAttribute("inert");
  }

  if (!full) {
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
    for (const node of [root(), document.body, document.getElementById("root"), shell(), document.querySelector(".sn-main")]) {
      node?.removeAttribute?.("inert");
      node?.style?.removeProperty?.("pointer-events");
      node?.style?.removeProperty?.("overflow");
      node?.style?.removeProperty?.("touch-action");
      node?.style?.removeProperty?.("filter");
      node?.style?.removeProperty?.("backdrop-filter");
      node?.style?.removeProperty?.("-webkit-backdrop-filter");
    }
  }
}

function normalizeCodeEditor() {
  document.querySelectorAll(".tn-code-pane textarea").forEach((textarea) => {
    textarea.setAttribute("data-max-lines", String(MAX_CODE_LINES));
    textarea.setAttribute("aria-label", textarea.getAttribute("aria-label") || "Editor kode tema sampai 10.000 baris");
    const pane = textarea.closest(".tn-code-pane");
    if (!pane) return;
    const v277 = pane.querySelector(".v277-code-lines");
    const v275 = pane.querySelector(".v275-code-lines");
    if (v277 && v275) v275.remove();
    const gutters = pane.querySelectorAll(".v277-code-lines");
    gutters.forEach((gutter, index) => { if (index > 0) gutter.remove(); });
    pane.dataset.v281SingleLineGutter = "true";
  });
}

function editorWordCount() {
  const editor = document.querySelector(".ce-paper[contenteditable]");
  if (!editor) return 0;
  return String(editor.textContent || "").trim().split(/\s+/).filter(Boolean).length;
}

function normalizeWordLimit() {
  const status = document.querySelector(".ce-word-status");
  if (!status) return;
  const words = editorWordCount();
  status.dataset.wordLimitV281 = String(MAX_CONTENT_WORDS);
  status.classList.toggle("v281-warning", words >= CONTENT_WARNING_WORDS && words <= MAX_CONTENT_WORDS);
  status.classList.toggle("v281-over", words > MAX_CONTENT_WORDS);
  const first = status.querySelector(":scope>span:first-child");
  if (first) first.textContent = `${words.toLocaleString("id-ID")} / ${MAX_CONTENT_WORDS.toLocaleString("id-ID")} kata`;

  let message = status.querySelector(":scope>.v281-word-limit");
  if (words >= CONTENT_WARNING_WORDS) {
    if (!message) {
      message = document.createElement("span");
      message.className = "v281-word-limit";
      status.append(message);
    }
    if (words > MAX_CONTENT_WORDS) {
      message.className = "v281-word-limit over";
      message.textContent = `Kurangi ${(words - MAX_CONTENT_WORDS).toLocaleString("id-ID")} kata sebelum publikasi. Draf tetap disimpan.`;
    } else {
      message.className = "v281-word-limit warning";
      message.textContent = `${(MAX_CONTENT_WORDS - words).toLocaleString("id-ID")} kata tersisa sebelum batas publikasi.`;
    }
  } else {
    message?.remove();
  }
}

function showWordLimitAlert(words) {
  const titlebar = document.querySelector(".ce-titlebar");
  if (!titlebar) return;
  titlebar.querySelector(".v281-editor-alert")?.remove();
  const alert = document.createElement("div");
  alert.className = "v281-editor-alert";
  alert.setAttribute("role", "alert");
  alert.textContent = `Publikasi ditahan: ${words.toLocaleString("id-ID")} kata. Kurangi ${(words - MAX_CONTENT_WORDS).toLocaleString("id-ID")} kata. Draf dan isi tidak dihapus.`;
  titlebar.insertAdjacentElement("afterend", alert);
  setTimeout(() => alert.remove(), 7000);
}

function guardContentPublish(event) {
  const publishButton = event.target?.closest?.(".ce-titlebar .ce-primary");
  if (!publishButton || /Jadikan draf/i.test(publishButton.textContent || "")) return;
  const words = editorWordCount();
  if (words <= MAX_CONTENT_WORDS) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  event.stopPropagation();
  showWordLimitAlert(words);
  normalizeWordLimit();
}

function normalizeThemeAndAnalytics() {
  document.querySelectorAll(".tn-studio,.tn-theme-grid,.tn-layout-studio,.tn-layout-map-v264,.tn-code-workspace,.op41-host,.op41-panel").forEach(reveal);
  document.querySelectorAll(".tn-layout-slot-v264").forEach((slot) => {
    slot.disabled = false;
    slot.style.setProperty("pointer-events", "auto", "important");
    slot.style.setProperty("touch-action", "manipulation", "important");
  });
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*", ".sn-content-card", ".sn-content-card>*",
    ".ce-app", ".ce-app>*", ".tn-studio", ".tn-studio>*", ".tn-code-workspace", ".tn-code-pane", ".tn-code-preview-pane",
    ".sv124-page", ".sv124-page>*", ".op41-host", ".op41-panel", ".op41-card",
  ].join(",")).forEach((node) => {
    node.style.setProperty("min-width", "0", "important");
    node.style.setProperty("max-width", "100%", "important");
  });
}

function sync() {
  frame = 0;
  normalizeContainingBlocks();
  normalizeSidebar();
  normalizeProfile();
  normalizeNara();
  normalizeCodeEditor();
  normalizeWordLimit();
  normalizeThemeAndAnalytics();
  normalizeContainment();
}

function schedule(delay = 0) {
  if (delay) {
    setTimeout(schedule, delay);
    return;
  }
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

function start() {
  sync();
  const pulse = () => {
    sync();
    bootPass += 1;
    if (bootPass < BOOT_PASSES) setTimeout(pulse, 180);
  };
  setTimeout(pulse, 70);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
  window.addEventListener("online", schedule, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  document.addEventListener("click", guardContentPublish, true);
  document.addEventListener("click", () => { schedule(0); schedule(40); }, false);
  document.addEventListener("input", (event) => { if (event.target?.closest?.(".ce-paper")) schedule(0); }, false);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
