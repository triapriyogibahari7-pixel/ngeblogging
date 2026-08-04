export const RELEASE = "studio-scroll-chrome-v270-20260804";

let frame = 0;

function root() {
  return document.documentElement;
}

function desktopFamily() {
  const html = root();
  if (html.dataset.v269DesktopFamily === "true") return true;
  if (html.dataset.studioDeviceMode === "large") return true;
  if (html.dataset.studioDesktopSitePhone === "true") return true;
  if (html.dataset.v232ModeLock === "desktop-site-large") return true;
  return Math.max(
    Number(document.documentElement?.clientWidth || 0),
    Number(window.innerWidth || 0),
    Number(window.visualViewport?.width || 0),
  ) >= 760;
}

function sidebar() {
  return document.getElementById("ngeblogging-studio-sidebar");
}

function syncSidebar() {
  const html = root();
  const side = sidebar();
  const large = desktopFamily();
  html.dataset.v270DesktopFamily = String(large);
  if (!side) return;

  side.removeAttribute("hidden");
  side.removeAttribute("aria-hidden");
  side.removeAttribute("inert");
  side.dataset.scrollChromeV270 = RELEASE;

  const mobileOpen = !large && side.classList.contains("mobile-open");
  document.body.classList.toggle("sn-mobile-sidebar-open", mobileOpen);

  side.querySelectorAll(".sn-new,nav>button,.sn-account-footer>button").forEach((button) => {
    button.removeAttribute("hidden");
    button.removeAttribute("aria-hidden");
    button.removeAttribute("inert");
    const label = button.querySelector("span")?.textContent?.trim() || button.textContent?.trim() || "Menu";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.dataset.v270Visible = "true";
  });

  const mark = side.querySelector(".sn-logo-mark");
  if (mark) {
    const expanded = large ? !side.classList.contains("collapsed") : mobileOpen;
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
    mark.setAttribute("aria-expanded", String(expanded));
    mark.setAttribute("aria-label", large
      ? (expanded ? "Ciutkan menu Ngeblogging" : "Perluas menu Ngeblogging")
      : (expanded ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging"));
    mark.setAttribute("title", mark.getAttribute("aria-label"));
    const letter = mark.querySelector("strong");
    if (letter) letter.textContent = "n";
  }

  const topToggle = document.querySelector(".sn-main>.sn-top>.sn-sidebar-toggle,.sn-top>.sn-sidebar-toggle");
  if (topToggle) {
    topToggle.dataset.scrollChromeV270 = RELEASE;
    topToggle.setAttribute("aria-expanded", String(mobileOpen));
    topToggle.setAttribute("aria-label", mobileOpen ? "Tutup menu Ngeblogging" : "Buka menu Ngeblogging");
    topToggle.setAttribute("title", topToggle.getAttribute("aria-label"));
  }
}

function syncNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) {
    launcher.dataset.scrollChromeV270 = "viewport-fixed";
    launcher.removeAttribute("inert");
    launcher.removeAttribute("aria-hidden");
  }

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) return;

  const size = ["small", "medium", "full"].includes(shell.dataset.naraSize)
    ? shell.dataset.naraSize
    : "small";
  const full = size === "full";
  layer.dataset.v270Interaction = full ? "modal" : "nonmodal";
  layer.setAttribute("aria-modal", String(full));

  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !full;
    backdrop.setAttribute("aria-hidden", String(!full));
    backdrop.tabIndex = full ? 0 : -1;
  }

  if (!full) {
    document.body.classList.remove("nara-fullscreen-open-v148");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
    document.body.style.removeProperty("pointer-events");
    document.documentElement.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("touch-action");
    document.documentElement.style.removeProperty("pointer-events");
  }

  const attachment = shell.querySelector(".nara-attachment-menu");
  if (attachment) attachment.dataset.v270Placement = "above-composer";
}

function clearLegacyFreeze() {
  if (document.querySelector('.nara-assistant-shell[data-nara-size="full"]')) return;
  for (const selector of [".sn-main", ".sn-shell", "#root", "body", "html"]) {
    const node = document.querySelector(selector);
    if (!node) continue;
    node.style.removeProperty("filter");
    node.style.removeProperty("backdrop-filter");
    node.style.removeProperty("pointer-events");
  }
}

function sync() {
  frame = 0;
  root().dataset.studioScrollChromeV270 = RELEASE;
  syncSidebar();
  syncNara();
  clearLegacyFreeze();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", () => setTimeout(schedule, 0), true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setTimeout(schedule, 0);
  }, true);

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.addEventListener("online", schedule, { passive: true });
  window.visualViewport?.addEventListener("scroll", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, { once: true });
  else schedule();
}
