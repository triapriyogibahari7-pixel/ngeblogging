const RELEASE = "sidebar-domain-alignment-v115-20260729";
const DOMAIN_LABEL = "Domain";
const REFERENCE_LABELS = ["Anggota", "Analitik", "Media", "Tema", "Pages", "Posts", "Ringkasan"];
const BUTTON_GEOMETRY = [
  "position", "inset", "top", "right", "bottom", "left",
  "display", "flex", "flex-basis", "align-self", "justify-self",
  "align-items", "justify-content", "place-items",
  "grid-template-columns", "grid-template-rows",
  "gap", "column-gap", "row-gap",
  "width", "min-width", "max-width",
  "height", "min-height", "max-height",
  "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border-radius", "box-sizing", "text-align",
];
const ICON_GEOMETRY = [
  "display", "width", "min-width", "max-width",
  "height", "min-height", "max-height", "flex", "flex-basis",
  "margin-top", "margin-right", "margin-bottom", "margin-left",
  "justify-self", "align-self",
];
const LABEL_GEOMETRY = [
  "display", "visibility", "opacity",
  "width", "min-width", "max-width",
  "margin-top", "margin-right", "margin-bottom", "margin-left",
  "justify-self", "align-self", "text-align", "white-space",
];

function labelOf(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function setImportant(node, property, value) {
  if (!(node instanceof HTMLElement) && !(node instanceof SVGElement)) return;
  const normalized = String(value || "").trim();
  if (!normalized) return;
  if (node.style.getPropertyValue(property) === normalized
    && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, normalized, "important");
}

function copyGeometry(source, target, properties) {
  if (!(source instanceof Element) || !(target instanceof Element)) return;
  const computed = getComputedStyle(source);
  for (const property of properties) setImportant(target, property, computed.getPropertyValue(property));
}

function directButtons(nav) {
  return [...nav.querySelectorAll(":scope > button")];
}

function syncDomainAlignment() {
  const side = document.querySelector(".sn-shell > .sn-side");
  const nav = side?.querySelector(":scope > nav");
  if (!(side instanceof HTMLElement) || !(nav instanceof HTMLElement)) return;

  const buttons = directButtons(nav);
  const domain = buttons.find((button) => labelOf(button) === DOMAIN_LABEL);
  if (!(domain instanceof HTMLButtonElement)) return;

  const reference = REFERENCE_LABELS
    .map((label) => buttons.find((button) => labelOf(button) === label))
    .find((button) => button instanceof HTMLButtonElement && !button.hidden);
  if (!(reference instanceof HTMLButtonElement)) return;

  copyGeometry(reference, domain, BUTTON_GEOMETRY);
  copyGeometry(reference.querySelector("svg"), domain.querySelector("svg"), ICON_GEOMETRY);
  copyGeometry(reference.querySelector("span"), domain.querySelector("span"), LABEL_GEOMETRY);

  domain.dataset.sidebarDomainAlignmentV115 = "true";
  domain.dataset.sidebarDomainAlignmentReference = labelOf(reference);
  side.dataset.sidebarDomainAlignmentRelease = RELEASE;
  document.documentElement.dataset.sidebarDomainAlignmentV115 = RELEASE;
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(syncDomainAlignment);
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
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();

export { RELEASE, syncDomainAlignment };
