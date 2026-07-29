const RELEASE = "sidebar-account-desktop-visibility-v118-20260729";
const VISUAL_PROPERTIES = [
  "display", "visibility", "opacity", "color", "stroke", "fill", "filter",
  "clip", "clip-path", "overflow", "z-index",
];

function desktopLayoutActive() {
  const root = document.documentElement;
  return root.classList.contains("studio-v30-desktop")
    || root.classList.contains("studio-v30-laptop")
    || root.classList.contains("studio-v30-desktop-phone")
    || root.dataset.desktopLayoutRequested === "true";
}

function labelOf(button) {
  return button?.querySelector(":scope > span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function clearVisualOverrides(node) {
  if (!(node instanceof HTMLElement) && !(node instanceof SVGElement)) return;
  node.hidden = false;
  node.removeAttribute("aria-hidden");
  for (const property of VISUAL_PROPERTIES) node.style.removeProperty(property);
}

function syncDesktopAccountVisibility() {
  if (!desktopLayoutActive()) return;
  const side = document.querySelector(".sn-shell > .sn-side");
  const footer = side?.querySelector(":scope > .sn-account-footer");
  if (!(side instanceof HTMLElement) || !(footer instanceof HTMLElement)) return;

  clearVisualOverrides(footer);
  for (const button of footer.querySelectorAll(":scope > button")) {
    if (!["Pengaturan", "Keluar"].includes(labelOf(button))) continue;
    clearVisualOverrides(button);
    const icon = button.querySelector(":scope > svg");
    clearVisualOverrides(icon);
    const label = button.querySelector(":scope > span");
    if (!side.classList.contains("collapsed")) clearVisualOverrides(label);
    button.dataset.accountDesktopVisibilityV118 = "true";
  }

  footer.dataset.accountDesktopVisibilityV118 = "true";
  side.dataset.accountDesktopVisibilityRelease = RELEASE;
  document.documentElement.dataset.sidebarAccountDesktopVisibilityV118 = RELEASE;
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(syncDesktopAccountVisibility);
}

function start() {
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length
      || mutation.removedNodes.length
      || ["class", "style", "hidden", "aria-hidden", "data-desktop-layout-requested"].includes(mutation.attributeName))) {
      schedule();
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "hidden", "aria-hidden", "data-desktop-layout-requested"],
  });

  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("ngeblogging:active-site-ready", schedule);
  window.addEventListener("ngeblogging:active-site-change", schedule);
  window.setInterval(schedule, 900);
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();

export { RELEASE, syncDesktopAccountVisibility };
