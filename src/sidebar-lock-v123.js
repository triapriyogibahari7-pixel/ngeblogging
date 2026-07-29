import {
  SIDEBAR_CONTRACT_RELEASE,
  SIDEBAR_GEOMETRY_V123,
  sidebarLabelOf,
} from "./sidebar-menu-contract-v123.js";

const RELEASE = "sidebar-lock-v123-20260729";
const COMMENTS_ID = "ngeblogging-comments-native-v106";

const GEOMETRY_PROPERTIES = new Set([
  "position", "inset", "top", "right", "bottom", "left",
  "display", "grid-template-columns", "grid-template-rows", "grid-auto-flow",
  "align-items", "align-content", "align-self", "justify-items", "justify-content", "justify-self", "place-items",
  "flex", "flex-basis", "order",
  "width", "min-width", "max-width", "height", "min-height", "max-height",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "gap", "column-gap", "row-gap", "box-sizing", "text-align", "transform",
]);

function desktopRequested() {
  return window.matchMedia(`(min-width: ${SIDEBAR_GEOMETRY_V123.breakpoint}px)`).matches
    || document.documentElement.dataset.desktopLayoutRequested === "true";
}

function importantRules(rules) {
  return Object.entries(rules).map(([property, value]) => `${property}:${value}!important`).join(";");
}

/* cssText is intentional: older v115 guards intercepted setProperty() on Domain.
   Rebuilding only the protected geometry bypasses those stale guards while keeping
   unrelated inline state such as accessibility and active colors intact. */
function applyAuthority(node, rules, removed = GEOMETRY_PROPERTIES) {
  if (!(node instanceof HTMLElement || node instanceof SVGElement)) return;
  const preserved = [];
  for (const property of Array.from(node.style)) {
    if (removed.has(property)) continue;
    const value = node.style.getPropertyValue(property);
    const priority = node.style.getPropertyPriority(property);
    preserved.push(`${property}:${value}${priority ? " !important" : ""}`);
  }
  const authority = importantRules(rules);
  node.style.cssText = `${preserved.join(";")}${preserved.length ? ";" : ""}${authority}`;
}

function canonicalButtonRules(collapsed) {
  if (collapsed) {
    return {
      position: "relative", inset: "auto", display: "grid", "place-items": "center",
      width: SIDEBAR_GEOMETRY_V123.collapsed.width,
      "min-width": SIDEBAR_GEOMETRY_V123.collapsed.width,
      "max-width": SIDEBAR_GEOMETRY_V123.collapsed.width,
      height: SIDEBAR_GEOMETRY_V123.collapsed.height,
      "min-height": SIDEBAR_GEOMETRY_V123.collapsed.height,
      "max-height": SIDEBAR_GEOMETRY_V123.collapsed.height,
      margin: SIDEBAR_GEOMETRY_V123.collapsed.margin,
      padding: SIDEBAR_GEOMETRY_V123.collapsed.padding,
      gap: "0", "box-sizing": "border-box", "text-align": "center", transform: "none",
    };
  }
  return {
    position: "relative", inset: "auto", display: "grid",
    "grid-template-columns": SIDEBAR_GEOMETRY_V123.expanded.columns,
    "grid-auto-flow": "column", "align-items": "center", "align-content": "center",
    "justify-items": "start", "justify-content": "center",
    width: SIDEBAR_GEOMETRY_V123.expanded.width, "min-width": "0",
    "max-width": SIDEBAR_GEOMETRY_V123.expanded.width,
    height: SIDEBAR_GEOMETRY_V123.expanded.height,
    "min-height": SIDEBAR_GEOMETRY_V123.expanded.height,
    "max-height": SIDEBAR_GEOMETRY_V123.expanded.height,
    margin: SIDEBAR_GEOMETRY_V123.expanded.margin,
    padding: SIDEBAR_GEOMETRY_V123.expanded.padding,
    gap: SIDEBAR_GEOMETRY_V123.expanded.gap,
    "box-sizing": "border-box", "text-align": "left", transform: "none",
  };
}

function styleIcon(icon, collapsed, fallbackOwned = false) {
  if (!(icon instanceof SVGElement)) return;
  applyAuthority(icon, {
    display: collapsed && fallbackOwned ? "none" : "block",
    width: SIDEBAR_GEOMETRY_V123.icon.width,
    "min-width": SIDEBAR_GEOMETRY_V123.icon.width,
    "max-width": SIDEBAR_GEOMETRY_V123.icon.width,
    height: SIDEBAR_GEOMETRY_V123.icon.height,
    "min-height": SIDEBAR_GEOMETRY_V123.icon.height,
    "max-height": SIDEBAR_GEOMETRY_V123.icon.height,
    margin: "0", padding: "0", "justify-self": "center", "align-self": "center", transform: "none",
  });
}

function styleLabel(label, collapsed) {
  if (!(label instanceof HTMLElement)) return;
  label.hidden = collapsed;
  if (collapsed) label.setAttribute("aria-hidden", "true");
  else label.removeAttribute("aria-hidden");
  applyAuthority(label, collapsed ? {
    display: "none", visibility: "hidden", opacity: "0", width: "0", "min-width": "0", "max-width": "0",
    height: "0", "min-height": "0", "max-height": "0", margin: "0", padding: "0", overflow: "hidden",
  } : {
    display: "block", visibility: "visible", opacity: "1", width: "auto", "min-width": "0", "max-width": "none",
    height: "auto", "min-height": "0", "max-height": "none", margin: "0", padding: "0", overflow: "hidden",
    "text-align": "left", "text-overflow": "ellipsis", "white-space": "nowrap",
  });
}

function styleButton(button, collapsed, account = false) {
  if (!(button instanceof HTMLButtonElement) || button.hidden) return;
  applyAuthority(button, canonicalButtonRules(collapsed));
  button.dataset.sidebarLockV123 = collapsed ? "collapsed" : "expanded";
  styleIcon(button.querySelector(":scope > svg"), collapsed, account);
  styleLabel(button.querySelector(":scope > span"), collapsed);
}

function styleDomain(domain) {
  if (!(domain instanceof HTMLButtonElement)) return;
  const active = domain.classList.contains("active");
  const remove = new Set([
    "border", "border-top", "border-right", "border-bottom", "border-left", "border-color", "border-radius",
    "outline", "outline-offset", "background", "background-color", "background-image",
    "box-shadow", "filter", "backdrop-filter", "-webkit-backdrop-filter",
  ]);
  applyAuthority(domain, {
    border: "0", "border-top": "0", "border-color": "transparent", "border-radius": active ? "10px" : "9px",
    outline: "0", background: active ? "#eaf2ff" : "transparent",
    "background-color": active ? "#eaf2ff" : "transparent", "background-image": "none",
    "box-shadow": "none", filter: "none", "backdrop-filter": "none", "-webkit-backdrop-filter": "none",
  }, remove);
  domain.dataset.sidebarDomainLockedV123 = "true";
}

function syncSidebarLock() {
  const shell = document.querySelector(".sn-shell");
  const side = shell?.querySelector(":scope > .sn-side");
  const nav = side?.querySelector(":scope > nav");
  if (!(shell instanceof HTMLElement) || !(side instanceof HTMLElement) || !(nav instanceof HTMLElement)) return;

  shell.dataset.sidebarContractRelease = SIDEBAR_CONTRACT_RELEASE;
  shell.dataset.sidebarLockRelease = RELEASE;
  document.documentElement.dataset.sidebarLockV123 = RELEASE;

  if (!desktopRequested()) return;
  const collapsed = side.classList.contains("collapsed");

  applyAuthority(nav, {
    display: "flex", "flex-direction": "column", "justify-content": "flex-start",
    "align-content": "center", "align-items": "center", gap: "2px",
    padding: collapsed ? "0" : "0 8px", "box-sizing": "border-box",
  });

  const directButtons = [...nav.querySelectorAll(":scope > button")]
    .filter((button) => sidebarLabelOf(button) !== "Nara AI");
  const commentsButton = nav.querySelector(`:scope > #${COMMENTS_ID}`)
    || nav.querySelector(":scope > .sn-comments-nav-host-v93 > .sn-comments-nav-button-v93");
  if (commentsButton && !directButtons.includes(commentsButton)) directButtons.push(commentsButton);

  directButtons.forEach((button) => styleButton(button, collapsed, false));
  const domain = directButtons.find((button) => sidebarLabelOf(button) === "Domain");
  styleDomain(domain);

  const comment = directButtons.find((button) => sidebarLabelOf(button) === "Komentar");
  if (comment) {
    comment.id = COMMENTS_ID;
    comment.dataset.sidebarCommentsLockedV123 = "true";
    styleLabel(comment.querySelector(":scope > span"), collapsed);
  }

  const footer = side.querySelector(":scope > .sn-account-footer");
  if (footer instanceof HTMLElement) {
    applyAuthority(footer, {
      position: "static", inset: "auto", display: "grid", "grid-template-columns": "minmax(0,1fr)",
      "justify-items": "center", "align-items": "center", gap: "4px", width: "100%", "min-width": "0",
      "max-width": "100%", margin: "0", padding: collapsed ? "8px 0" : "8px", "box-sizing": "border-box", transform: "none",
    });
    [...footer.querySelectorAll(":scope > button")].forEach((button) => styleButton(button, collapsed, true));
  }
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(syncSidebarLock);
}

function start() {
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length
      || mutation.removedNodes.length
      || ["class", "hidden", "aria-hidden", "style"].includes(mutation.attributeName))) schedule();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "hidden", "aria-hidden", "style"],
  });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
  window.addEventListener("ngeblogging:active-site-ready", schedule);
  window.addEventListener("ngeblogging:active-site-change", schedule);
  window.setInterval(schedule, 900);
  schedule();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();

export { RELEASE, syncSidebarLock };
