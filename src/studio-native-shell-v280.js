export const RELEASE = "studio-native-shell-v280-20260804";

let frame = 0;
let bootPass = 0;
const BOOT_PASSES = 4;

function root() { return document.documentElement; }
function shell() { return document.querySelector(".sn-shell[data-device-mode]") || document.querySelector(".sn-shell"); }
function sidebar() { return document.getElementById("ngeblogging-studio-sidebar"); }

function layoutMode() {
  const shellMode = shell()?.dataset?.deviceMode;
  if (shellMode === "small" || shellMode === "large") return shellMode;
  const rootMode = root().dataset.studioDeviceMode;
  if (rootMode === "small" || rootMode === "large") return rootMode;
  return window.matchMedia?.("(min-width:761px)")?.matches ? "large" : "small";
}

function reveal(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("aria-hidden");
  node.removeAttribute("inert");
}

function normalizeFixedRoot() {
  root().dataset.studioNativeShellV280 = RELEASE;
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

  const mode = layoutMode();
  const small = mode === "small";
  const open = small && side.classList.contains("mobile-open");
  const collapsed = !small && side.classList.contains("collapsed");
  app.dataset.v280LayoutMode = mode;
  document.body.classList.toggle("sn-mobile-sidebar-open", open);

  reveal(side);
  side.style.setProperty("display", "flex", "important");
  side.style.setProperty("visibility", "visible", "important");
  side.style.setProperty("opacity", "1", "important");
  side.style.setProperty("pointer-events", "auto", "important");

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
}

function normalizeProfile() {
  const top = document.querySelector(".sn-main>.sn-top");
  const avatar = top?.querySelector(".sn-avatar");
  if (!top) return;
  reveal(top);
  if (avatar) {
    reveal(avatar);
    avatar.disabled = false;
    avatar.setAttribute("aria-haspopup", "menu");
    avatar.setAttribute("aria-label", "Buka menu profil");
  }
}

function normalizeNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    reveal(launcher);
    launcher.disabled = false;
    launcher.dataset.v280ViewportFixed = "true";
  }

  const panel = document.querySelector(".nara-assistant-shell[data-nara-size]");
  const layer = panel?.closest(".nara-assistant-layer");
  if (!panel || !layer) return;

  // Layar 320px pun tidak boleh menyembunyikan model atau tingkat kecerdasan.
  panel.querySelectorAll(".nara-select").forEach((control) => {
    reveal(control);
    control.style.setProperty("display", "flex", "important");
    control.style.setProperty("grid-column", "auto", "important");
    control.style.setProperty("max-width", "100%", "important");
  });

  const full = panel.dataset.naraSize === "full";
  layer.dataset.naraInteraction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));
  const backdrop = layer.querySelector(":scope > .nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
  }

  if (!full) {
    document.body.classList.remove("nara-fullscreen-open-v148", "nara-scroll-lock", "sm177-nara-full", "v179-nara-full");
    for (const node of [root(), document.body, document.getElementById("root"), shell(), document.querySelector(".sn-main")]) {
      node?.removeAttribute?.("inert");
      node?.style?.removeProperty?.("pointer-events");
      node?.style?.removeProperty?.("overflow");
      node?.style?.removeProperty?.("touch-action");
    }
  }
}

function normalizeContent() {
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
  normalizeFixedRoot();
  normalizeSidebar();
  normalizeProfile();
  normalizeNara();
  normalizeContent();
}

function schedule() {
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
  setTimeout(pulse, 80);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  // Deliberately no scroll/visualViewport-scroll listener. Fixed chrome is CSS-owned;
  // repeated DOM writes while scrolling were the source of avoidable jank on phones.
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  document.addEventListener("click", () => setTimeout(schedule, 0), false);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
