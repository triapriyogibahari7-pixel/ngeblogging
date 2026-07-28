const RELEASE = "sidebar-center-v93-20260728";

function important(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value
    && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function styleEntries(node, entries) {
  for (const [property, value] of Object.entries(entries)) important(node, property, value);
}

function centerButton(button, collapsed) {
  if (!button) return;
  button.dataset.sidebarCenterV93 = collapsed ? "collapsed" : "open";
  styleEntries(button, collapsed ? {
    display: "grid",
    "place-items": "center",
    "grid-template-columns": "1fr",
    width: "48px",
    "min-width": "48px",
    "max-width": "48px",
    height: "44px",
    "min-height": "44px",
    margin: "2px auto",
    padding: "0",
    "column-gap": "0",
    "text-align": "center",
    "justify-content": "center",
    "align-items": "center",
    "align-self": "center",
  } : {
    display: "grid",
    "grid-template-columns": "24px minmax(0, 112px)",
    width: "calc(100% - 16px)",
    "min-width": "0",
    "max-width": "none",
    height: "auto",
    "min-height": "44px",
    margin: "2px auto",
    padding: "0 12px",
    "column-gap": "12px",
    "text-align": "left",
    "justify-content": "center",
    "align-items": "center",
    "align-self": "center",
  });

  const icon = button.querySelector(":scope > svg");
  if (icon) styleEntries(icon, {
    width: "20px",
    height: "20px",
    margin: "0",
    "justify-self": "center",
    "align-self": "center",
    transform: "none",
  });

  const label = button.querySelector(":scope > span");
  if (label) styleEntries(label, collapsed ? {
    display: "none",
    width: "0",
    margin: "0",
    overflow: "hidden",
  } : {
    display: "block",
    width: "auto",
    "min-width": "0",
    margin: "0",
    overflow: "hidden",
    "text-align": "left",
    "text-overflow": "ellipsis",
    "white-space": "nowrap",
  });
}

function centerCreateButton(button, collapsed) {
  if (!button) return;
  styleEntries(button, collapsed ? {
    display: "grid",
    "place-items": "center",
    width: "48px",
    "min-width": "48px",
    "max-width": "48px",
    height: "44px",
    "min-height": "44px",
    margin: "12px auto 8px",
    padding: "0",
    "justify-content": "center",
    "align-items": "center",
  } : {
    display: "flex",
    width: "calc(100% - 16px)",
    "min-width": "0",
    "max-width": "none",
    "min-height": "44px",
    margin: "12px auto 8px",
    padding: "0 12px",
    "justify-content": "center",
    "align-items": "center",
  });
  const label = button.querySelector(":scope > span");
  if (label) important(label, "display", collapsed ? "none" : "inline");
}

function sync() {
  if (!window.matchMedia("(min-width: 761px)").matches) return;
  const shell = document.querySelector(".sn-shell");
  const side = shell?.querySelector(":scope > .sn-side");
  const nav = side?.querySelector(":scope > nav");
  const footer = side?.querySelector(":scope > .sn-account-footer");
  if (!shell || !side || !nav) return;

  shell.dataset.sidebarCenterRelease = RELEASE;
  const collapsed = side.classList.contains("collapsed");
  styleEntries(nav, {
    display: "flex",
    "flex-direction": "column",
    "align-items": "center",
    "align-content": "center",
    "justify-content": "flex-start",
    width: "100%",
    padding: collapsed ? "0" : "0 8px",
  });

  const buttons = nav.querySelectorAll(":scope > button, :scope > .sn-comments-nav-host-v93 > button");
  buttons.forEach((button) => centerButton(button, collapsed));

  if (footer) {
    styleEntries(footer, {
      display: "grid",
      "justify-items": "center",
      "align-items": "center",
      width: "100%",
      padding: collapsed ? "0" : "0 8px",
    });
    footer.querySelectorAll(":scope > button").forEach((button) => centerButton(button, collapsed));
  }

  centerCreateButton(side.querySelector(":scope > .sn-new"), collapsed);
}

let frame = 0;
function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

function start() {
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"],
  });
  schedule();
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("pageshow", schedule, { passive: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
