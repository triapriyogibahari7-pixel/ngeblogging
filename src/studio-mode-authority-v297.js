import "./studio-mode-authority-v297.css";

export const STUDIO_MODE_AUTHORITY_RELEASE_V297 = "studio-mode-startup-authority-v297-20260805";
export const NARA_REACT_SINGLE_OWNER_V297 = "nara-react-single-owner-v297-20260805";
export const AUTH_ROUTE_HISTORY_V297 = "auth-route-history-v297-20260805";

let frame = 0;
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
  const value = root().dataset.studioDeviceMode || shell()?.dataset?.deviceMode;
  if (value === "large" || value === "small") return value;
  const responsive = root().dataset.studioResponsiveMode;
  return ["application", "phone", "mobile", "compact"].includes(responsive) ? "small" : "large";
}

function normalizeStudioPath() {
  if (!shell()) return;
  if (!["ngeblogging.com", "www.ngeblogging.com"].includes(window.location.hostname.toLowerCase())) return;
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/studio") return;
  const url = new URL(window.location.href);
  url.pathname = "/studio";
  ["auth", "auth_success", "source", "code", "error", "error_code", "error_description"].forEach((key) => url.searchParams.delete(key));
  window.history.replaceState(window.history.state, document.title, `${url.pathname}${url.search}${url.hash}`);
  root().dataset.authRouteHistoryV297 = AUTH_ROUTE_HISTORY_V297;
}

function syncSidebar() {
  const side = sidebar();
  if (!side) return;
  reveal(side);
  side.dataset.v297Family = family();
  side.style.removeProperty("filter");
  side.style.removeProperty("backdrop-filter");
  const mark = side.querySelector(".sn-logo-mark");
  reveal(mark);
  if (mark) {
    mark.dataset.v297Control = "single-n";
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
      letter.style.removeProperty("opacity");
      letter.style.removeProperty("visibility");
      letter.style.removeProperty("filter");
      letter.style.removeProperty("color");
      letter.style.removeProperty("-webkit-text-fill-color");
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
  document.querySelectorAll(".sn-side-backdrop").forEach((backdrop) => {
    backdrop.hidden = true;
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.style.setProperty("display", "none", "important");
    backdrop.style.setProperty("pointer-events", "none", "important");
  });
  document.body.style.removeProperty("filter");
  document.body.style.removeProperty("backdrop-filter");
  document.body.style.removeProperty("-webkit-backdrop-filter");
  root().style.removeProperty("filter");
  root().style.removeProperty("backdrop-filter");
}

function syncProfile() {
  const avatar = document.querySelector(".sn-main>.sn-top .sn-avatar,.sn-top .sn-avatar");
  if (!avatar) return;
  reveal(avatar);
  avatar.disabled = false;
  avatar.dataset.v297Profile = "top-right";
  avatar.setAttribute("aria-haspopup", "menu");
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    reveal(launcher);
    launcher.disabled = false;
    launcher.dataset.v297Floating = "viewport-fixed";
    launcher.style.removeProperty("animation");
    launcher.style.removeProperty("filter");
  }
  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) return;
  const full = panel.dataset.naraSize === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.dataset.naraSingleOwnerV297 = NARA_REACT_SINGLE_OWNER_V297;
  layer.setAttribute("aria-modal", String(full));
  panel.setAttribute("aria-modal", String(full));
  panel.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-attachment-menu-wrap,.nara-select.intelligence,.nara-select.model,.nara-composer-tools>button,button[aria-label='Tutup Nara']").forEach(reveal);
  const close = panel.querySelector("button[aria-label='Tutup Nara'],button[title='Tutup']");
  if (close) { reveal(close); close.disabled = false; }
  const attachment = panel.querySelector(".nara-attachment-menu-wrap>button");
  if (attachment) {
    attachment.disabled = false;
    attachment.setAttribute("aria-label", "Tambah kamera, foto, atau file");
    attachment.setAttribute("title", "Kamera, foto, atau file");
  }
  if (!full) {
    const backdrop = layer.querySelector(":scope>.nara-assistant-backdrop");
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.setAttribute("aria-hidden", "true");
      backdrop.style.setProperty("display", "none", "important");
      backdrop.style.setProperty("pointer-events", "none", "important");
    }
    root().style.removeProperty("overflow");
    root().style.removeProperty("touch-action");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
    document.body.classList.remove("nara-modal-open", "nara-fullscreen-open-v148", "nara-fullscreen-open-v151", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
  }
}

function syncThemeAndEditors() {
  document.querySelectorAll(".tn-studio,.tn-layout-studio,.tn-layout-map-v264,.tn-code-workspace,.tn-code-pane,.tn-code-preview-pane,.ce-app,.ce-paper,.ce-sidebar,.op41-host,.sv124-page").forEach((node) => {
    node.style.setProperty("min-width", "0", "important");
    node.style.setProperty("max-width", "100%", "important");
  });
  document.querySelectorAll(".tn-code-pane textarea").forEach((textarea) => {
    textarea.setAttribute("data-max-lines", "10000");
    textarea.setAttribute("spellcheck", "false");
  });
}

export function syncStudioModeAuthorityV297() {
  frame = 0;
  if (!shell() && !document.querySelector(".ce-app,.tn-studio,.nara-assistant-shell")) return;
  root().dataset.studioModeAuthorityV297 = STUDIO_MODE_AUTHORITY_RELEASE_V297;
  if (shell()) shell().dataset.deviceMode = family();
  syncSidebar();
  syncProfile();
  syncNara();
  syncThemeAndEditors();
  normalizeStudioPath();
}

function schedule(delay = 0) {
  if (delay > 0) {
    window.setTimeout(() => schedule(), delay);
    return;
  }
  if (frame) return;
  frame = requestAnimationFrame(syncStudioModeAuthorityV297);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", () => { schedule(); schedule(70); }, false);
  window.addEventListener("resize", () => schedule(40), { passive: true });
  window.addEventListener("orientationchange", () => schedule(70), { passive: true });
  window.addEventListener("pageshow", () => schedule(40), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule());
  window.addEventListener("ngeblogging:auth-session-ready", () => { schedule(20); schedule(160); });
  window.addEventListener("ngeblogging:auth-callback-complete", () => { schedule(20); schedule(160); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { schedule(); schedule(140); }, { once:true });
  else { schedule(); schedule(140); }
}
