const RELEASE = "sidebar-domain-alignment-v115-20260729";
const DOMAIN_LABEL = "Domain";
const REGISTRY_KEY = Symbol.for("ngeblogging.sidebarDomainAlignmentV115");
const PATCH_KEY = Symbol.for("ngeblogging.sidebarDomainAlignmentV115.setPropertyPatch");

/* Properties written inline by sidebar-domain-order-v113. Those declarations
   overrode the shared desktop nav grid—especially margin-left/right:0—and made
   Domain drift left in both expanded and collapsed states. */
const BLOCKED_LEGACY_GEOMETRY = new Set([
  "position", "inset", "top", "right", "bottom", "left",
  "flex", "flex-basis", "order",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "border-top", "transform", "box-shadow",
]);

/* Also remove geometry copied by an earlier v115 draft, so the final authority
   is the same CSS grid used by every direct workspace navigation sibling. */
const CLEANUP_GEOMETRY = new Set([
  ...BLOCKED_LEGACY_GEOMETRY,
  "display", "align-self", "justify-self", "align-items", "justify-content",
  "place-items", "grid-template-columns", "grid-template-rows",
  "gap", "column-gap", "row-gap",
  "width", "min-width", "max-width", "height", "min-height", "max-height",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border-radius", "box-sizing", "text-align",
]);

const registry = globalThis[REGISTRY_KEY] || {
  protectedStyles: new WeakSet(),
  originalSetProperty: null,
};
globalThis[REGISTRY_KEY] = registry;

function installSetPropertyGuard() {
  const prototype = globalThis.CSSStyleDeclaration?.prototype;
  if (!prototype || prototype[PATCH_KEY]) return;
  const original = prototype.setProperty;
  registry.originalSetProperty = original;

  Object.defineProperty(prototype, "setProperty", {
    configurable: true,
    writable: true,
    value(property, value, priority = "") {
      const normalizedProperty = String(property || "").trim().toLowerCase();
      const important = String(priority || "").trim().toLowerCase() === "important";
      if (important
        && registry.protectedStyles.has(this)
        && BLOCKED_LEGACY_GEOMETRY.has(normalizedProperty)) {
        return undefined;
      }
      return original.call(this, property, value, priority);
    },
  });
  Object.defineProperty(prototype, PATCH_KEY, { value: RELEASE, configurable: false });
}

function labelOf(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function cleanLegacyInlineGeometry(domain) {
  registry.protectedStyles.add(domain.style);
  for (const property of CLEANUP_GEOMETRY) domain.style.removeProperty(property);
}

function syncDomainAlignment() {
  const side = document.querySelector(".sn-shell > .sn-side");
  const nav = side?.querySelector(":scope > nav");
  if (!(side instanceof HTMLElement) || !(nav instanceof HTMLElement)) return;

  const domain = [...nav.querySelectorAll(":scope > button")]
    .find((button) => labelOf(button) === DOMAIN_LABEL);
  if (!(domain instanceof HTMLButtonElement)) return;

  domain.dataset.sidebarDomainAlignmentV115 = "true";
  cleanLegacyInlineGeometry(domain);

  side.dataset.sidebarDomainAlignmentRelease = RELEASE;
  document.documentElement.dataset.sidebarDomainAlignmentV115 = RELEASE;
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(syncDomainAlignment);
}

function start() {
  installSetPropertyGuard();
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
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();

export { RELEASE, syncDomainAlignment };
