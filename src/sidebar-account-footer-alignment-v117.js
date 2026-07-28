const RELEASE = "sidebar-account-footer-alignment-v117-20260729";
const GEOMETRY = [
  "position", "inset", "top", "right", "bottom", "left",
  "width", "min-width", "max-width", "height", "min-height", "max-height",
  "display", "grid-template-columns", "grid-template-rows", "place-items",
  "align-items", "align-self", "justify-items", "justify-self", "justify-content",
  "gap", "column-gap", "row-gap", "flex", "flex-basis",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "transform", "translate", "box-sizing", "text-align",
];

function clearGeometry(node) {
  if (!(node instanceof HTMLElement) && !(node instanceof SVGElement)) return;
  for (const property of GEOMETRY) node.style.removeProperty(property);
}

function labelOf(button) {
  return button?.querySelector(":scope > span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function syncAccountFooterAlignment() {
  const side = document.querySelector(".sn-shell > .sn-side");
  const footer = side?.querySelector(":scope > .sn-account-footer");
  if (!(side instanceof HTMLElement) || !(footer instanceof HTMLElement)) return;

  const buttons = [...footer.querySelectorAll(":scope > button")]
    .filter((button) => ["Pengaturan", "Keluar"].includes(labelOf(button)));
  if (buttons.length !== 2) return;

  clearGeometry(footer);
  for (const button of buttons) {
    clearGeometry(button);
    clearGeometry(button.querySelector(":scope > svg"));
    clearGeometry(button.querySelector(":scope > span"));
    button.dataset.accountFooterAlignmentV117 = "true";
  }

  footer.dataset.accountFooterAlignmentV117 = "true";
  side.dataset.accountFooterAlignmentRelease = RELEASE;
  document.documentElement.dataset.sidebarAccountFooterAlignmentV117 = RELEASE;
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(syncAccountFooterAlignment);
}

function start() {
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length
      || mutation.removedNodes.length
      || mutation.attributeName === "class"
      || mutation.attributeName === "style")) schedule();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("ngeblogging:active-site-ready", schedule);
  window.addEventListener("ngeblogging:active-site-change", schedule);
  window.setInterval(schedule, 800);
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();

export { RELEASE, syncAccountFooterAlignment };
