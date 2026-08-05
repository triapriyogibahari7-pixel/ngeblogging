import "./studio-final-authority-v292.css";
import "./studio-theme-layout-v264.css";
import "./studio-theme-layout-v264.js";

export const RELEASE = "studio-final-authority-v292-20260805";
export const CODE_LINE_LIMIT = 10_000;
export const CONTENT_WORD_LIMIT = 5_000;
export const CONTENT_WORD_WARNING = 4_500;

let frame = 0;
let settleTimer = 0;

const root = () => document.documentElement;
const shell = () => document.querySelector(".sn-shell");
const sidebar = () => document.getElementById("ngeblogging-studio-sidebar");

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("aria-hidden");
  node.removeAttribute("inert");
}

function family() {
  const mode = root().dataset.studioDeviceMode || shell()?.dataset?.deviceMode;
  if (mode === "large" || mode === "small") return mode;
  return Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) >= 761 ? "large" : "small";
}

function responsiveMode() {
  const mode = root().dataset.studioResponsiveMode;
  return ["application", "phone", "mobile", "compact", "tablet", "desktop"].includes(mode) ? mode : family() === "large" ? "desktop" : "mobile";
}

function variant() {
  const value = root().dataset.studioDeviceVariant;
  if (["application", "phone", "mobile", "compact", "tablet", "laptop", "desktop", "computer"].includes(value)) return value;
  if (responsiveMode() !== "desktop") return responsiveMode();
  const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  return width <= 1366 ? "laptop" : width <= 1680 ? "desktop" : "computer";
}

function syncShellContract() {
  const app = shell();
  if (!app) return;
  app.dataset.v292Family = family();
  app.dataset.v292ResponsiveMode = responsiveMode();
  app.dataset.v292DeviceVariant = variant();
  root().dataset.studioFinalAuthorityV292 = RELEASE;
}

function syncSidebar() {
  const side = sidebar();
  if (!side) return;
  reveal(side);
  side.style.removeProperty("display");
  side.style.removeProperty("visibility");
  side.style.removeProperty("opacity");
  side.style.removeProperty("filter");

  const mark = side.querySelector(".sn-logo-mark");
  reveal(mark);
  if (mark) {
    const expanded = family() === "large" ? !side.classList.contains("collapsed") : side.classList.contains("mobile-open");
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    mark.setAttribute("aria-expanded", String(expanded));
    mark.setAttribute("aria-label", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
    mark.setAttribute("title", expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
    const letter = mark.querySelector("strong");
    if (letter) {
      letter.textContent = "n";
      letter.style.removeProperty("color");
      letter.style.removeProperty("opacity");
      letter.style.removeProperty("filter");
    }
  }

  const brand = side.querySelector(":scope>.sn-logo>b");
  if (brand) brand.textContent = "Ngeblogging";

  side.querySelectorAll(":scope>.sn-new,:scope>nav>button,:scope>.sn-account-footer>button").forEach((button) => {
    reveal(button);
    button.disabled = false;
    const label = button.querySelector("span")?.textContent?.trim() || button.textContent?.trim() || "Menu";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });

  const oldClose = side.querySelector(":scope>.sn-logo>.sn-side-close");
  if (oldClose) {
    oldClose.hidden = true;
    oldClose.tabIndex = -1;
    oldClose.setAttribute("aria-hidden", "true");
  }

  if (family() === "large") {
    side.classList.remove("mobile-open");
    document.body.classList.remove("sn-mobile-sidebar-open");
  }
}

function syncProfile() {
  const avatar = document.querySelector(".sn-main>.sn-top .sn-avatar,.sn-top .sn-avatar");
  if (avatar) {
    reveal(avatar);
    avatar.disabled = false;
    avatar.setAttribute("aria-haspopup", "menu");
    avatar.setAttribute("aria-label", "Buka menu profil");
  }
  const menu = document.querySelector(".sn-profile-menu-v287");
  if (menu) {
    reveal(menu);
    menu.dataset.v292ViewportSafe = "true";
  }
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    reveal(launcher);
    launcher.disabled = false;
    launcher.dataset.v292Floating = "viewport-fixed";
  }

  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) return;
  const full = panel.dataset.naraSize === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.dataset.v292Interaction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  panel.dataset.v292Family = family();

  panel.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-attachment-menu-wrap,.nara-select.intelligence,.nara-select.model,.nara-composer-tools>button,button[aria-label='Tutup Nara'],button[title='Tutup']").forEach(reveal);

  const backdrop = layer.querySelector(":scope>.nara-assistant-backdrop");
  if (backdrop && !full) {
    backdrop.hidden = true;
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.style.pointerEvents = "none";
  } else if (backdrop) {
    backdrop.hidden = false;
    backdrop.removeAttribute("aria-hidden");
    backdrop.style.removeProperty("pointer-events");
  }

  if (!full) {
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
    root().style.removeProperty("overflow");
    root().style.removeProperty("touch-action");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
  }
}

function lineNumbers(value) {
  const total = Math.min(CODE_LINE_LIMIT, Math.max(1, String(value || "").split("\n").length));
  return Array.from({ length: total }, (_, index) => index + 1).join("\n");
}

function syncCodeEditor() {
  document.querySelectorAll(".tn-code-pane textarea").forEach((textarea) => {
    textarea.setAttribute("data-max-lines", String(CODE_LINE_LIMIT));
    textarea.setAttribute("spellcheck", "false");
    let gutter = textarea.parentElement?.querySelector(":scope>.tn-code-gutter-v292");
    if (!gutter) {
      gutter = document.createElement("pre");
      gutter.className = "tn-code-gutter-v292";
      gutter.setAttribute("aria-hidden", "true");
      textarea.insertAdjacentElement("beforebegin", gutter);
      const syncScroll = () => { gutter.scrollTop = textarea.scrollTop; };
      textarea.addEventListener("scroll", syncScroll, { passive: true });
      textarea.addEventListener("input", () => { gutter.textContent = lineNumbers(textarea.value); }, { passive: true });
    }
    const numbers = lineNumbers(textarea.value);
    if (gutter.textContent !== numbers) gutter.textContent = numbers;
  });

  document.querySelectorAll(".tn-code-workspace").forEach((workspace) => {
    workspace.dataset.v292CodeLayout = family() === "large" ? "code-left-preview-right" : "preview-top-code-bottom";
  });
}

function wordCount() {
  const editor = document.querySelector(".ce-paper[contenteditable='true']");
  return String(editor?.innerText || "").trim().split(/\s+/).filter(Boolean).length;
}

function syncWordLimit() {
  const status = document.querySelector(".ce-word-status");
  if (!status) return;
  const words = wordCount();
  status.dataset.wordLimitV292 = String(words);
  const first = status.querySelector("span");
  if (first) first.textContent = `${words.toLocaleString("id-ID")} / ${CONTENT_WORD_LIMIT.toLocaleString("id-ID")} kata`;
  let warning = status.querySelector(".ce-word-warning-v292");
  if (!warning) {
    warning = document.createElement("strong");
    warning.className = "ce-word-warning-v292";
    status.append(warning);
  }
  if (words > CONTENT_WORD_LIMIT) warning.textContent = `Kurangi ${(words - CONTENT_WORD_LIMIT).toLocaleString("id-ID")} kata sebelum diterbitkan.`;
  else if (words >= CONTENT_WORD_WARNING) warning.textContent = `${(CONTENT_WORD_LIMIT - words).toLocaleString("id-ID")} kata tersisa sebelum batas publikasi.`;
  else warning.textContent = "";
}

function guardPublish(event) {
  const button = event.target.closest?.(".ce-actions .ce-primary");
  if (!button || /Jadikan draf/i.test(button.textContent || "")) return;
  const words = wordCount();
  if (words <= CONTENT_WORD_LIMIT) return;
  event.preventDefault();
  event.stopPropagation();
  window.alert(`Konten berisi ${words.toLocaleString("id-ID")} kata. Simpan draf tetap aman, tetapi publikasi ditahan sampai maksimal ${CONTENT_WORD_LIMIT.toLocaleString("id-ID")} kata.`);
}

function syncContainment() {
  document.querySelectorAll(".sn-main,.sn-main>*,.sn-view-pad,.sn-view-pad>*,.sn-content-card,.sn-content-card>*,.sn-settings-grid,.sn-settings-grid>*,.ce-app,.ce-app>*,.tn-studio,.tn-studio>*,.tn-layout-studio,.tn-layout-map-v264,.tn-code-workspace,.tn-code-pane,.tn-code-preview-pane,.sv124-page,.sv124-page>*,.op41-host,.op41-panel,.op41-card").forEach((node) => {
    node.style.setProperty("min-width", "0", "important");
    node.style.setProperty("max-width", "100%", "important");
  });
}

export function syncStudioV292() {
  frame = 0;
  if (!shell() && !document.querySelector(".ce-app")) return;
  syncShellContract();
  syncSidebar();
  syncProfile();
  syncNara();
  syncCodeEditor();
  syncWordLimit();
  syncContainment();
}

function schedule(delay = 0) {
  if (delay > 0) {
    window.setTimeout(() => schedule(), delay);
    return;
  }
  if (frame) return;
  frame = requestAnimationFrame(syncStudioV292);
}

function settle() {
  schedule();
  clearTimeout(settleTimer);
  settleTimer = window.setTimeout(() => schedule(), 100);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", guardPublish, true);
  document.addEventListener("click", () => { schedule(); schedule(70); }, false);
  document.addEventListener("input", (event) => { if (event.target.closest?.(".ce-app,.tn-code-pane")) schedule(); }, { passive: true });
  window.addEventListener("resize", settle, { passive: true });
  window.addEventListener("orientationchange", settle, { passive: true });
  window.addEventListener("pageshow", settle, { passive: true });
  window.visualViewport?.addEventListener("resize", settle, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", settle);
  window.addEventListener("ngeblogging:auth-session-ready", () => { schedule(40); schedule(260); });
  window.addEventListener("ngeblogging:auth-callback-complete", () => { schedule(40); schedule(260); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) settle(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { schedule(); schedule(180); }, { once: true });
  else { schedule(); schedule(180); }
}
