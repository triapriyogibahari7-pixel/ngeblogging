import { SIDEBAR_GEOMETRY_V123, sidebarLabelOf } from "./sidebar-menu-contract-v123.js";

const RELEASE = "sidebar-mobile-lock-v123-20260729";
const COMMENTS_ID = "ngeblogging-comments-native-v106";
const MOBILE_PROPERTIES = new Set([
  "position", "inset", "top", "right", "bottom", "left", "display",
  "align-items", "align-content", "align-self", "justify-items", "justify-content", "justify-self", "place-items",
  "grid-template-columns", "grid-auto-flow", "flex", "flex-basis", "order",
  "width", "min-width", "max-width", "height", "min-height", "max-height",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "gap", "column-gap", "row-gap", "box-sizing", "text-align", "transform",
  "visibility", "opacity", "overflow", "text-overflow", "white-space",
]);

function compactMobile() {
  return !window.matchMedia(`(min-width: ${SIDEBAR_GEOMETRY_V123.breakpoint}px)`).matches
    && document.documentElement.dataset.desktopLayoutRequested !== "true";
}

function apply(node, rules, removed = MOBILE_PROPERTIES) {
  if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;
  const preserved = [];
  for (const property of Array.from(node.style)) {
    if (removed.has(property)) continue;
    const value = node.style.getPropertyValue(property);
    const priority = node.style.getPropertyPriority(property);
    preserved.push(`${property}:${value}${priority ? " !important" : ""}`);
  }
  const authority = Object.entries(rules).map(([property, value]) => `${property}:${value}!important`).join(";");
  const next = `${preserved.join(";")}${preserved.length ? ";" : ""}${authority}`;
  if (node.style.cssText !== next) node.style.cssText = next;
}

function mobileButton(button, account = false) {
  if (!(button instanceof HTMLButtonElement) || button.hidden) return;
  apply(button, {
    position: "relative", inset: "auto", display: "flex", "align-items": "center",
    "justify-content": "flex-start", width: account ? "calc(100% - 28px)" : "100%",
    "min-width": "0", "max-width": account ? "calc(100% - 28px)" : "none",
    height: "auto", "min-height": "58px", "max-height": "none",
    margin: account ? "7px 14px" : "0", padding: "0 26px", gap: "18px",
    "box-sizing": "border-box", "text-align": "left", transform: "none",
  });
  const icon = button.querySelector(":scope > svg");
  if (icon instanceof SVGElement) apply(icon, {
    display: "block", width: "25px", "min-width": "25px", "max-width": "25px",
    height: "25px", "min-height": "25px", "max-height": "25px",
    margin: "0", padding: "0", transform: "none",
  });
  const label = button.querySelector(":scope > span");
  if (label instanceof HTMLElement) {
    if (label.hidden) label.hidden = false;
    label.removeAttribute("aria-hidden");
    apply(label, {
      display: "block", visibility: "visible", opacity: "1", width: "auto", "min-width": "0", "max-width": "none",
      height: "auto", "min-height": "0", "max-height": "none", margin: "0", padding: "0",
      overflow: "hidden", "text-align": "left", "text-overflow": "ellipsis", "white-space": "nowrap",
    });
  }
}

function cleanDomain(domain) {
  if (!(domain instanceof HTMLButtonElement) || domain.classList.contains("active")) return;
  const removed = new Set([
    "border", "border-top", "border-right", "border-bottom", "border-left", "border-color",
    "outline", "background", "background-color", "background-image", "box-shadow", "filter",
  ]);
  apply(domain, {
    border: "0", "border-top": "0", "border-color": "transparent", outline: "0",
    background: "transparent", "background-color": "transparent", "background-image": "none",
    "box-shadow": "none", filter: "none",
  }, removed);
}

function syncMobileSidebar() {
  if (!compactMobile()) return;
  const shell = document.querySelector(".sn-shell");
  const side = shell?.querySelector(":scope > .sn-side");
  const nav = side?.querySelector(":scope > nav");
  if (!(shell instanceof HTMLElement) || !(side instanceof HTMLElement) || !(nav instanceof HTMLElement)) return;
  shell.dataset.sidebarMobileLockRelease = RELEASE;
  document.documentElement.dataset.sidebarMobileLockV123 = RELEASE;

  apply(nav, {
    display: "flex", "flex-direction": "column", "justify-content": "flex-start",
    "align-content": "stretch", "align-items": "stretch", width: "100%", padding: "0", gap: "0",
    "box-sizing": "border-box",
  });

  const buttons = [...nav.querySelectorAll(":scope > button")]
    .filter((button) => sidebarLabelOf(button) !== "Nara AI");
  const comments = nav.querySelector(`:scope > #${COMMENTS_ID}`)
    || nav.querySelector(":scope > .sn-comments-nav-host-v93 > .sn-comments-nav-button-v93");
  if (comments && !buttons.includes(comments)) buttons.push(comments);
  buttons.forEach((button) => mobileButton(button, false));
  cleanDomain(buttons.find((button) => sidebarLabelOf(button) === "Domain"));

  const footer = side.querySelector(":scope > .sn-account-footer");
  if (footer instanceof HTMLElement) {
    apply(footer, {
      position: "static", inset: "auto", display: "grid", "grid-template-columns": "minmax(0,1fr)",
      "justify-items": "stretch", "align-items": "stretch", width: "100%", margin: "0", padding: "0 0 8px",
      gap: "0", "box-sizing": "border-box", transform: "none",
    });
    [...footer.querySelectorAll(":scope > button")].forEach((button) => mobileButton(button, true));
  }
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(syncMobileSidebar);
}

function start() {
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length
      || ["class", "hidden", "aria-hidden"].includes(mutation.attributeName))) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden", "aria-hidden"] });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.setInterval(schedule, 900);
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();

export { RELEASE, syncMobileSidebar };
