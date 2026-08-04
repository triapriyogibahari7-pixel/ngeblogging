import "./studio-shell-authority-v272.css";

export const RELEASE = "studio-shell-authority-v272-20260804";

let frame = 0;
let observer = null;

function viewportWidth() {
  return Math.max(
    Number(document.documentElement?.clientWidth || 0),
    Number(window.innerWidth || 0),
    Number(window.visualViewport?.width || 0),
    1,
  );
}

function isDesktopFamily() {
  const html = document.documentElement;
  const forcedDesktop = html.dataset.studioDesktopSitePhone === "true"
    || html.dataset.v232ModeLock === "desktop-site-large";
  if (forcedDesktop || html.dataset.studioDeviceMode === "large") return true;
  if (html.dataset.studioDeviceMode === "small") return false;
  return viewportWidth() >= 760;
}

function synchronizeShell() {
  frame = 0;
  const html = document.documentElement;
  const side = document.getElementById("ngeblogging-studio-sidebar");
  const large = isDesktopFamily();
  const mobileOpen = Boolean(side && !large && side.classList.contains("mobile-open"));

  html.dataset.v272DesktopFamily = String(large);
  html.dataset.v272CompactFamily = String(!large);
  html.dataset.studioShellAuthorityV272 = RELEASE;
  html.style.setProperty("--v272-live-width", `${viewportWidth()}px`);
  document.body.classList.toggle("sn-mobile-sidebar-open", mobileOpen);

  if (side) {
    side.removeAttribute("hidden");
    side.removeAttribute("aria-hidden");
    side.removeAttribute("inert");
    side.dataset.shellAuthorityV272 = large ? "desktop" : (mobileOpen ? "mobile-open" : "mobile-trigger");

    const mark = side.querySelector(".sn-logo-mark");
    if (mark) {
      mark.setAttribute("role", "button");
      mark.setAttribute("tabindex", "0");
      mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
      mark.setAttribute("aria-expanded", String(large ? !side.classList.contains("collapsed") : mobileOpen));
      mark.setAttribute("aria-label", large
        ? (side.classList.contains("collapsed") ? "Perluas menu Ngeblogging" : "Ciutkan menu Ngeblogging")
        : (mobileOpen ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging"));
      mark.setAttribute("title", mark.getAttribute("aria-label"));
      const letter = mark.querySelector("strong");
      if (letter) letter.textContent = "n";
    }

    side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button").forEach((button) => {
      button.removeAttribute("hidden");
      button.removeAttribute("aria-hidden");
      button.removeAttribute("inert");
      const label = button.querySelector("span")?.textContent?.trim() || button.textContent?.trim() || "Menu";
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
    });
  }

  const headerToggle = document.querySelector(".sn-main>.sn-top>.sn-sidebar-toggle,.sn-top>.sn-sidebar-toggle");
  if (headerToggle) {
    headerToggle.dataset.v272InternalBridge = "true";
    headerToggle.setAttribute("aria-hidden", "true");
    headerToggle.setAttribute("tabindex", "-1");
  }

  const avatar = document.querySelector(".sn-top .sn-avatar");
  if (avatar) {
    avatar.removeAttribute("hidden");
    avatar.removeAttribute("aria-hidden");
    avatar.removeAttribute("inert");
    avatar.setAttribute("aria-label", avatar.getAttribute("aria-label") || "Buka menu profil");
  }

  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.v272ViewportFixed = "true";
    launcher.removeAttribute("hidden");
    launcher.removeAttribute("aria-hidden");
    launcher.removeAttribute("inert");
  }

  if (!document.querySelector('.nara-assistant-shell[data-nara-size="full"]')) {
    document.body.classList.remove("nara-fullscreen-open-v148");
    for (const node of [document.documentElement, document.body, document.getElementById("root"), document.querySelector(".sn-shell"), document.querySelector(".sn-main")]) {
      node?.style?.removeProperty("pointer-events");
      node?.style?.removeProperty("filter");
      node?.style?.removeProperty("backdrop-filter");
    }
  }
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(synchronizeShell);
}

function start() {
  if (!observer && document.body) {
    observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["class", "hidden", "aria-hidden", "inert"],
    });
  }
  schedule();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.addEventListener("scroll", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  window.visualViewport?.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
  document.addEventListener("click", () => setTimeout(schedule, 0), true);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
