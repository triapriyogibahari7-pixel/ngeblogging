export const RELEASE = "studio-sidebar-recovery-v276-20260804";

let frame = 0;
let observer = null;

function shell() {
  return document.querySelector(".sn-shell[data-device-mode]") || document.querySelector(".sn-shell");
}

function sidebar() {
  return document.getElementById("ngeblogging-studio-sidebar");
}

function reactToggle() {
  return document.querySelector(".sn-main>.sn-top>.sn-sidebar-toggle,.sn-top>.sn-sidebar-toggle");
}

function resolvedLayoutMode() {
  const studioShell = shell();
  const shellMode = studioShell?.dataset?.deviceMode;
  if (shellMode === "large" || shellMode === "small") return shellMode;

  const rootMode = document.documentElement.dataset.studioDeviceMode;
  if (rootMode === "large" || rootMode === "small") return rootMode;

  return window.matchMedia?.("(min-width: 761px)")?.matches ? "large" : "small";
}

function forceVisible(node) {
  if (!node) return;
  node.hidden = false;
  node.removeAttribute("hidden");
  node.removeAttribute("aria-hidden");
  node.removeAttribute("inert");
}

function normalizeSidebar() {
  const studioShell = shell();
  const side = sidebar();
  if (!studioShell || !side) return;

  const mode = resolvedLayoutMode();
  const large = mode === "large";
  const mobileOpen = !large && side.classList.contains("mobile-open");
  const collapsed = large && side.classList.contains("collapsed");

  studioShell.dataset.v276LayoutMode = mode;
  document.documentElement.dataset.studioSidebarRecoveryV276 = RELEASE;
  document.documentElement.dataset.v276LayoutMode = mode;

  forceVisible(side);
  side.style.setProperty("display", "flex", "important");
  side.style.setProperty("visibility", "visible", "important");
  side.style.setProperty("opacity", "1", "important");
  side.style.setProperty("pointer-events", "auto", "important");
  side.style.setProperty("filter", "none", "important");
  side.style.setProperty("backdrop-filter", "none", "important");
  side.style.setProperty("-webkit-backdrop-filter", "none", "important");

  if (large) {
    side.classList.remove("mobile-open");
    document.body.classList.remove("sn-mobile-sidebar-open");
  }

  const logo = side.querySelector(".sn-logo");
  const mark = logo?.querySelector(".sn-logo-mark");
  const brand = logo?.querySelector(":scope>b");
  forceVisible(logo);
  forceVisible(mark);

  if (mark) {
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    mark.setAttribute("aria-expanded", String(large ? !collapsed : mobileOpen));
    mark.setAttribute("aria-label", large
      ? (collapsed ? "Buka sidebar Ngeblogging" : "Ciutkan sidebar Ngeblogging")
      : (mobileOpen ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging"));
    mark.setAttribute("title", mark.getAttribute("aria-label"));
    const letter = mark.querySelector("strong");
    if (letter) {
      letter.textContent = "n";
      letter.style.setProperty("color", "#fff", "important");
      letter.style.setProperty("-webkit-text-fill-color", "#fff", "important");
      letter.style.setProperty("opacity", "1", "important");
    }
  }

  if (brand) {
    brand.textContent = "Ngeblogging";
    brand.hidden = large ? collapsed : !mobileOpen;
    if (!brand.hidden) forceVisible(brand);
  }

  forceVisible(side.querySelector(".sn-new"));
  forceVisible(side.querySelector("nav"));
  forceVisible(side.querySelector(".sn-account-footer"));
  side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button").forEach((button) => {
    forceVisible(button);
    button.disabled = false;
    const label = button.querySelector("span")?.textContent?.trim() || button.textContent?.trim() || "Menu";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });

  const bridge = reactToggle();
  if (bridge) {
    bridge.dataset.v276SidebarBridge = "true";
    bridge.setAttribute("tabindex", "-1");
    bridge.setAttribute("aria-hidden", "true");
  }
}

function activateLogo(event) {
  const mark = event.target?.closest?.("#ngeblogging-studio-sidebar .sn-logo-mark");
  if (!mark) return;
  if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const bridge = reactToggle();
  if (!bridge) return;
  bridge.click();
  requestAnimationFrame(schedule);
  setTimeout(schedule, 32);
}

function closeCompactAfterNavigation(event) {
  const side = sidebar();
  if (!side || resolvedLayoutMode() !== "small" || !side.classList.contains("mobile-open")) return;
  const menuButton = event.target?.closest?.("#ngeblogging-studio-sidebar nav>button,#ngeblogging-studio-sidebar .sn-account-footer>button,#ngeblogging-studio-sidebar .sn-new");
  if (!menuButton) return;
  setTimeout(() => {
    if (side.classList.contains("mobile-open")) reactToggle()?.click();
    schedule();
  }, 0);
}

function schedule() {
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    frame = 0;
    normalizeSidebar();
  });
}

function start() {
  if (!observer) {
    observer = new MutationObserver((records) => {
      if (records.some((record) => record.type === "childList" || ["class", "data-device-mode", "data-studio-device-mode", "hidden"].includes(record.attributeName))) {
        schedule();
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-device-mode", "data-studio-device-mode", "hidden"],
    });
  }
  schedule();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", activateLogo, true);
  document.addEventListener("keydown", activateLogo, true);
  document.addEventListener("click", closeCompactAfterNavigation, false);
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
