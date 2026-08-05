import "./studio-native-controls-v290.css";

export const STUDIO_NATIVE_CONTROLS_RELEASE_V290 = "studio-native-controls-v290-20260805";
export const STUDIO_AUTH_SIDEBAR_COMPAT_V291 = "studio-auth-sidebar-v291-20260805";
let frame = 0;

const shell = () => document.querySelector(".sn-shell");
const sidebar = () => document.getElementById("ngeblogging-studio-sidebar");
const reactToggle = () => document.querySelector(".sn-main>.sn-top>.sn-sidebar-toggle,.sn-top>.sn-sidebar-toggle");

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("aria-hidden");
  node.removeAttribute("inert");
}

function currentFamily() {
  const htmlMode = document.documentElement.dataset.studioDeviceMode;
  if (htmlMode === "large" || htmlMode === "small") return htmlMode;
  const mode = shell()?.dataset?.deviceMode;
  return mode === "large" ? "large" : "small";
}

function syncSidebar() {
  const side = sidebar();
  if (!side) return;
  reveal(side);
  const mark = side.querySelector(".sn-logo-mark");
  reveal(mark);
  if (mark) {
    mark.dataset.v290NativeInput = STUDIO_NATIVE_CONTROLS_RELEASE_V290;
    mark.dataset.v291AuthSidebar = STUDIO_AUTH_SIDEBAR_COMPAT_V291;
    mark.style.removeProperty("pointer-events");
    const expanded = currentFamily() === "large" ? !side.classList.contains("collapsed") : side.classList.contains("mobile-open");
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
      letter.style.removeProperty("filter");
      letter.style.removeProperty("color");
    }
  }
  side.querySelectorAll(":scope>.sn-new,:scope>nav>button,:scope>.sn-account-footer>button").forEach((button) => {
    reveal(button);
    button.disabled = false;
  });
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  reveal(launcher);
  if (launcher) {
    launcher.disabled = false;
    launcher.dataset.v290Floating = "viewport-fixed";
  }
  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) return;
  const full = panel.dataset.naraSize === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.dataset.v290Interaction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  panel.querySelectorAll(".nara-size-controls-v147,.nara-auto-voice-v148,.nara-attachment-menu-wrap,.nara-select.intelligence,.nara-select.model").forEach(reveal);
  const close = panel.querySelector('button[aria-label="Tutup Nara"],button[title="Tutup"]');
  reveal(close);
  if (!full) {
    document.documentElement.style.removeProperty("overflow");
    document.body.style.removeProperty("overflow");
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
  }
}

function syncContainment() {
  document.querySelectorAll(".sn-main,.sn-main>*,.sn-view-pad,.sn-view-pad>*,.sn-content-card,.sn-content-card>*,.sn-settings-grid,.sn-settings-grid>*,.ce-app,.ce-app>*,.tn-studio,.tn-studio>*,.sv124-page,.sv124-page>*").forEach((node) => {
    node.style.setProperty("min-width", "0", "important");
    node.style.setProperty("max-width", "100%", "important");
  });
}

export function syncStudioV290() {
  frame = 0;
  if (!shell()) return;
  document.documentElement.dataset.studioNativeControlsV290 = STUDIO_NATIVE_CONTROLS_RELEASE_V290;
  document.documentElement.dataset.studioAuthSidebarV291 = STUDIO_AUTH_SIDEBAR_COMPAT_V291;
  shell().dataset.v290Family = currentFamily();
  syncSidebar();
  syncNara();
  syncContainment();
}

function schedule(delay = 0) {
  if (delay) {
    window.setTimeout(() => schedule(), delay);
    return;
  }
  if (frame) return;
  frame = requestAnimationFrame(syncStudioV290);
}

function nativeToggle(event) {
  const mark = event.target.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (!mark) return;
  const toggle = reactToggle();
  if (!toggle || toggle.disabled) return;

  event.preventDefault();
  event.stopPropagation();
  toggle.click();
  mark.dataset.v291SingleOwnerToggle = String(Date.now());
  requestAnimationFrame(() => schedule());
}

function nativeToggleKeyboard(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const mark = event.target.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (!mark) return;
  nativeToggle(event);
}

function keepMobileDrawerNonBlocking() {
  if (currentFamily() !== "small") return;
  document.body.style.removeProperty("filter");
  document.body.style.removeProperty("backdrop-filter");
  document.documentElement.style.removeProperty("filter");
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", nativeToggle, true);
  document.addEventListener("keydown", nativeToggleKeyboard, true);
  document.addEventListener("click", () => { keepMobileDrawerNonBlocking(); schedule(); schedule(80); }, false);
  window.addEventListener("resize", () => schedule(60), { passive: true });
  window.addEventListener("orientationchange", () => schedule(80), { passive: true });
  window.addEventListener("pageshow", () => schedule(60), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule());
  window.addEventListener("ngeblogging:auth-session-ready", () => { schedule(40); schedule(350); schedule(1100); });
  window.addEventListener("ngeblogging:auth-callback-complete", () => { schedule(40); schedule(350); schedule(1100); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { schedule(); schedule(400); }, { once: true });
  else { schedule(); schedule(400); }
}
