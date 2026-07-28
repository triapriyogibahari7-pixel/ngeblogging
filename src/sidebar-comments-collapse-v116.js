const RELEASE = "sidebar-comments-collapse-v116-20260729";
const COMMENTS_ID = "ngeblogging-comments-native-v106";
const PATCH_KEY = Symbol.for("ngeblogging.sidebarCommentsCollapseV116.setPropertyPatch");
const BLOCKED_WHEN_COLLAPSED = new Set([
  "display", "visibility", "opacity",
  "width", "min-width", "max-width",
  "height", "min-height", "max-height",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
]);

function desktopSidebarMode(side) {
  return side.classList.contains("collapsed") && (
    window.matchMedia("(min-width: 761px)").matches
    || document.documentElement.dataset.desktopLayoutRequested === "true"
  );
}

function currentCommentsLabel() {
  return document.querySelector(`.sn-shell > .sn-side > nav > #${COMMENTS_ID} > span`);
}

function installSetPropertyGuard() {
  const prototype = globalThis.CSSStyleDeclaration?.prototype;
  if (!prototype || prototype[PATCH_KEY]) return;
  const original = prototype.setProperty;

  Object.defineProperty(prototype, "setProperty", {
    configurable: true,
    writable: true,
    value(property, value, priority = "") {
      const normalized = String(property || "").trim().toLowerCase();
      const important = String(priority || "").trim().toLowerCase() === "important";
      if (important && BLOCKED_WHEN_COLLAPSED.has(normalized)) {
        const label = currentCommentsLabel();
        const side = label?.closest?.(".sn-side");
        if (label instanceof HTMLElement
          && label.style === this
          && side instanceof HTMLElement
          && desktopSidebarMode(side)) {
          return undefined;
        }
      }
      return original.call(this, property, value, priority);
    },
  });
  Object.defineProperty(prototype, PATCH_KEY, { value: RELEASE, configurable: false });
}

function clearInlineLabelGeometry(label) {
  for (const property of BLOCKED_WHEN_COLLAPSED) label.style.removeProperty(property);
}

function syncCommentsCollapse() {
  const side = document.querySelector(".sn-shell > .sn-side");
  const button = side?.querySelector(`:scope > nav > #${COMMENTS_ID}`);
  const label = button?.querySelector(":scope > span");
  if (!(side instanceof HTMLElement) || !(button instanceof HTMLButtonElement) || !(label instanceof HTMLElement)) return;

  const collapsed = desktopSidebarMode(side);
  button.dataset.commentsCollapseV116 = collapsed ? "collapsed" : "expanded";
  side.dataset.sidebarCommentsCollapseRelease = RELEASE;
  document.documentElement.dataset.sidebarCommentsCollapseV116 = RELEASE;

  clearInlineLabelGeometry(label);
  label.hidden = collapsed;
  if (collapsed) label.setAttribute("aria-hidden", "true");
  else label.removeAttribute("aria-hidden");
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(syncCommentsCollapse);
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
  window.setInterval(schedule, 500);
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();

export { RELEASE, syncCommentsCollapse };
