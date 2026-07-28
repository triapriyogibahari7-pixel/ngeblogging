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

function visibleWorkspaceButton(nav) {
  const buttons = [...nav.querySelectorAll(":scope > button")];
  return buttons.find((button) => labelOf(button) === "Ringkasan" && button.getClientRects().length)
    || buttons.find((button) => !button.hidden && button.getClientRects().length)
    || null;
}

function finite(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function px(value) {
  return `${Math.max(0, finite(value, 0)).toFixed(3)}px`;
}

function publishWorkspaceAxis(side, footer, source) {
  const sideRect = side.getBoundingClientRect();
  const rowRect = source.getBoundingClientRect();
  const icon = source.querySelector(":scope > svg");
  const label = source.querySelector(":scope > span");
  const iconRect = icon?.getBoundingClientRect();
  const labelRect = label?.getBoundingClientRect();
  if (!sideRect.width || !rowRect.width || !iconRect?.width) return false;

  const rowLeft = finite(rowRect.left - sideRect.left, 8);
  const rowWidth = Math.min(finite(rowRect.width, sideRect.width - rowLeft), sideRect.width - rowLeft);
  const iconCenter = finite(iconRect.left + (iconRect.width / 2) - rowRect.left, 20);
  const labelLeft = labelRect?.width
    ? finite(labelRect.left - rowRect.left, iconCenter + (iconRect.width / 2) + 10)
    : iconCenter + (iconRect.width / 2) + 10;

  footer.style.setProperty("--af117-row-left", px(rowLeft));
  footer.style.setProperty("--af117-row-width", px(rowWidth));
  footer.style.setProperty("--af117-icon-center", px(iconCenter));
  footer.style.setProperty("--af117-label-left", px(labelLeft));
  footer.dataset.accountFooterMeasuredFrom = labelOf(source) || "workspace";
  return true;
}

function syncAccountFooterAlignment() {
  const side = document.querySelector(".sn-shell > .sn-side");
  const nav = side?.querySelector(":scope > nav");
  const footer = side?.querySelector(":scope > .sn-account-footer");
  if (!(side instanceof HTMLElement) || !(nav instanceof HTMLElement) || !(footer instanceof HTMLElement)) return;

  const buttons = [...footer.querySelectorAll(":scope > button")]
    .filter((button) => ["Pengaturan", "Keluar"].includes(labelOf(button)));
  const source = visibleWorkspaceButton(nav);
  if (buttons.length !== 2 || !(source instanceof HTMLButtonElement)) return;

  clearGeometry(footer);
  for (const button of buttons) {
    clearGeometry(button);
    clearGeometry(button.querySelector(":scope > svg"));
    clearGeometry(button.querySelector(":scope > span"));
    button.dataset.accountFooterAlignmentV117 = "true";
  }

  publishWorkspaceAxis(side, footer, source);
  footer.dataset.accountFooterAlignmentV117 = "true";
  footer.dataset.accountFooterCollapsed = String(side.classList.contains("collapsed"));
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
      || mutation.attributeName === "class")) schedule();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
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
