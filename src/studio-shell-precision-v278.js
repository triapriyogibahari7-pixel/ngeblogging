export const RELEASE = "studio-shell-precision-v278-20260804";
export const POINTERDOWN_CAPTURE_RETIRED_BY = "studio-native-controls-v281-20260805";

const BOOT_PULSES = 12;
let frame = 0;
let bootPulse = 0;

function root() { return document.documentElement; }
function shell() { return document.querySelector(".sn-shell[data-device-mode]") || document.querySelector(".sn-shell"); }
function sidebar() { return document.getElementById("ngeblogging-studio-sidebar"); }
function reactToggle() { return document.querySelector(".sn-main>.sn-top>.sn-sidebar-toggle,.sn-top>.sn-sidebar-toggle"); }

function mode() {
  const shellMode = shell()?.dataset?.deviceMode;
  if (shellMode === "small" || shellMode === "large") return shellMode;
  const htmlMode = root().dataset.studioDeviceMode;
  if (htmlMode === "small" || htmlMode === "large") return htmlMode;
  return window.matchMedia?.("(min-width: 761px)")?.matches ? "large" : "small";
}

function logoMark(target) {
  return target?.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark") || null;
}

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("aria-hidden");
  node.removeAttribute("inert");
}

function normalizeSidebar() {
  const app = shell();
  const side = sidebar();
  if (!app || !side) return;

  const layout = mode();
  const small = layout === "small";
  const open = small && side.classList.contains("mobile-open");
  const collapsed = !small && side.classList.contains("collapsed");

  app.dataset.v278LayoutMode = layout;
  root().dataset.studioShellPrecisionV278 = RELEASE;
  root().dataset.v278LayoutMode = layout;
  document.body.classList.toggle("sn-mobile-sidebar-open", open);

  reveal(side);
  side.style.removeProperty("display");
  side.style.removeProperty("visibility");
  side.style.removeProperty("opacity");
  side.style.removeProperty("transform");
  side.style.removeProperty("filter");

  const mark = side.querySelector(".sn-logo-mark");
  reveal(mark);
  if (mark) {
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    mark.setAttribute("aria-expanded", String(small ? open : !collapsed));
    mark.setAttribute("aria-label", small
      ? (open ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging")
      : (collapsed ? "Buka sidebar Ngeblogging" : "Ciutkan sidebar Ngeblogging"));
    mark.setAttribute("title", mark.getAttribute("aria-label"));
    const letter = mark.querySelector("strong");
    if (letter) {
      letter.textContent = "n";
      letter.style.setProperty("color", "#fff", "important");
      letter.style.setProperty("-webkit-text-fill-color", "#fff", "important");
      letter.style.setProperty("opacity", "1", "important");
    }
  }

  const brand = side.querySelector(".sn-logo > b");
  if (brand) brand.textContent = "Ngeblogging";

  side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button").forEach((button) => {
    reveal(button);
    button.disabled = false;
    const label = button.querySelector("span")?.textContent?.trim() || button.textContent?.trim() || "Menu";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });

  document.querySelectorAll([
    ".sn-sidebar-edge-toggle-v147", ".v227-sidebar-fab", ".studio-external-sidebar-toggle",
    "[data-v173-collapse-toggle]", "[data-v187-sidebar-toggle]", "[data-v208-sidebar-toggle]",
    "[data-v223-sidebar-toggle]", "[data-v229-sidebar-toggle]", "#ngeblogging-studio-chrome-v244",
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
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    reveal(launcher);
    launcher.disabled = false;
    launcher.dataset.v278Floating = "true";
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
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
    for (const node of [root(), document.body, document.getElementById("root"), shell(), document.querySelector(".sn-main")]) {
      node?.removeAttribute?.("inert");
      node?.style?.removeProperty?.("pointer-events");
      node?.style?.removeProperty?.("filter");
      node?.style?.removeProperty?.("backdrop-filter");
      node?.style?.removeProperty?.("-webkit-backdrop-filter");
      node?.style?.removeProperty?.("overflow");
      node?.style?.removeProperty?.("touch-action");
    }
  }
}

function normalizeTheme() {
  document.querySelectorAll(".tn-studio,.tn-theme-grid,.tn-layout-studio,.tn-code-workspace").forEach(reveal);
  document.querySelectorAll(".tn-code-pane textarea").forEach((textarea) => {
    textarea.setAttribute("data-max-lines", "10000");
    textarea.setAttribute("aria-label", textarea.getAttribute("aria-label") || "Editor kode tema, maksimal 10.000 baris");
  });
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*", ".sn-content-card", ".sn-content-card>*",
    ".ce-app", ".ce-app>*", ".tn-studio", ".tn-studio>*", ".tn-layout-studio", ".tn-code-workspace",
    ".sv124-page", ".sv124-page>*",
  ].join(",")).forEach((node) => {
    node.style.setProperty("min-width", "0", "important");
    node.style.setProperty("max-width", "100%", "important");
  });
}

function sync() {
  frame = 0;
  normalizeSidebar();
  normalizeProfile();
  normalizeNara();
  normalizeTheme();
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

function toggleFromLogo() {
  const bridge = reactToggle();
  if (bridge) {
    bridge.click();
  } else {
    const side = sidebar();
    if (!side) return;
    if (mode() === "small") side.classList.toggle("mobile-open");
    else side.classList.toggle("collapsed");
  }
  schedule();
  schedule(40);
}

// Pointerdown capture sengaja dipensiunkan pada v281. Menahan pointerdown pada
// window membuat tap perangkat sentuh dapat kehilangan click setelah scroll.
// Window-capture click di bawah sudah cukup untuk mencegah handler document lama.
function stopLegacyPointer(event) {
  void event;
  return POINTERDOWN_CAPTURE_RETIRED_BY;
}

function activateLogo(event) {
  if (!logoMark(event.target)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  event.stopPropagation();
  toggleFromLogo();
}

function activateLogoKeyboard(event) {
  if (!logoMark(event.target) || !["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  event.stopPropagation();
  toggleFromLogo();
}

function closeDrawerFromBackdrop(event) {
  const side = sidebar();
  if (mode() !== "small" || !side?.classList.contains("mobile-open")) return;
  if (!event.target?.closest?.(".sn-side-backdrop")) return;
  event.preventDefault();
  reactToggle()?.click();
  schedule(20);
}

function start() {
  sync();
  const pulse = () => {
    sync();
    bootPulse += 1;
    if (bootPulse < BOOT_PULSES) setTimeout(pulse, 220);
  };
  setTimeout(pulse, 80);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("click", activateLogo, true);
  window.addEventListener("keydown", activateLogoKeyboard, true);
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
  document.addEventListener("click", closeDrawerFromBackdrop, false);
  document.addEventListener("click", () => schedule(0), false);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}

export { stopLegacyPointer };
