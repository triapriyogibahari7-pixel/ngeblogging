import "./studio-final-authority-v269.css";

export const RELEASE = "studio-final-authority-v269-20260804";

let frame = 0;
let observer = null;

function viewportWidth() {
  const docWidth = Number(document.documentElement?.clientWidth || 0);
  const innerWidth = Number(window.innerWidth || 0);
  const visualWidth = Number(window.visualViewport?.width || 0);
  return Math.max(docWidth, innerWidth, visualWidth, 1);
}

function isDesktopFamily() {
  const root = document.documentElement;
  const explicitLarge = root.dataset.studioDeviceMode === "large";
  const desktopSitePhone = root.dataset.studioDesktopSitePhone === "true"
    || root.dataset.v232ModeLock === "desktop-site-large";

  // Chrome Android "Desktop site" exposes a desktop-sized CSS viewport even on a
  // physical phone. Width is only a fallback; the six-mode detector remains the
  // primary classifier and is not replaced by this authority.
  return explicitLarge || desktopSitePhone || viewportWidth() >= 760;
}

function syncSidebarState(desktopFamily) {
  const side = document.getElementById("ngeblogging-studio-sidebar");
  if (!side) return;

  const mobileOpen = !desktopFamily && side.classList.contains("mobile-open");
  document.body.classList.toggle("sn-mobile-sidebar-open", mobileOpen);

  side.querySelectorAll("nav > button, .sn-account-footer > button, .sn-new").forEach((button) => {
    const label = button.querySelector("span")?.textContent?.trim() || button.textContent?.trim() || "Menu";
    if (!button.getAttribute("aria-label")) button.setAttribute("aria-label", label);
    if (!button.getAttribute("title")) button.setAttribute("title", label);
  });

  const mark = side.querySelector(".sn-logo-mark");
  if (mark) {
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    mark.setAttribute("aria-label", desktopFamily
      ? (side.classList.contains("collapsed") ? "Perluas menu Ngeblogging" : "Ciutkan menu Ngeblogging")
      : (mobileOpen ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging"));
    mark.setAttribute("aria-expanded", String(desktopFamily ? !side.classList.contains("collapsed") : mobileOpen));
  }
}

function sync() {
  frame = 0;
  const root = document.documentElement;
  const desktopFamily = isDesktopFamily();
  root.dataset.v269DesktopFamily = String(desktopFamily);
  root.dataset.v269CompactFamily = String(!desktopFamily);
  root.dataset.studioFinalAuthorityV269 = RELEASE;
  root.style.setProperty("--v269-live-width", `${viewportWidth()}px`);
  syncSidebarState(desktopFamily);
}

function schedule() {
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

function startObserver() {
  if (observer || !document.documentElement) return;
  observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.type === "attributes" || mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-studio-device-mode", "data-studio-desktop-site-phone", "data-v232-mode-lock"],
  });
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  else startObserver();
}
