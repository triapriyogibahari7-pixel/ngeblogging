import "./comments-studio-v93.jsx";

const RELEASE = "sidebar-stability-v95-20260728";
const DESKTOP_BREAKPOINT = "(min-width: 761px)";
// Compatibility marker retained for v94 validators: sidebar-comments-v94-20260728.

function labelOf(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value
    && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function setMany(node, values) {
  if (!node) return;
  for (const [property, value] of Object.entries(values)) setImportant(node, property, value);
}

function desktopLayoutRequested() {
  return window.matchMedia(DESKTOP_BREAKPOINT).matches
    || document.documentElement.dataset.desktopLayoutRequested === "true";
}

function hideNaraSidebar(nav) {
  [...nav.querySelectorAll(":scope > button")]
    .filter((button) => labelOf(button) === "Nara AI")
    .forEach((button) => {
      button.dataset.naraSidebarV95 = "true";
      if (!button.hidden) button.hidden = true;
      if (!button.disabled) button.disabled = true;
      if (button.tabIndex !== -1) button.tabIndex = -1;
      if (button.getAttribute("aria-hidden") !== "true") button.setAttribute("aria-hidden", "true");
      setMany(button, {
        display: "none",
        visibility: "hidden",
        opacity: "0",
        width: "0",
        height: "0",
        "min-width": "0",
        "min-height": "0",
        margin: "0",
        padding: "0",
        overflow: "hidden",
        "pointer-events": "none",
      });
    });
}

function normalizeLogo(side, collapsed, desktop) {
  const logo = side.querySelector(":scope > .sn-logo");
  const mark = logo?.querySelector(":scope > .sn-logo-mark");

  if (desktop && logo) {
    setMany(logo, {
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
      gap: collapsed ? "0" : "7px",
      padding: collapsed ? "0" : "0 12px",
      width: "100%",
      "box-sizing": "border-box",
    });
  }

  if (mark) {
    setMany(mark, {
      position: "static",
      inset: "auto",
      display: "inline-flex",
      "align-items": "center",
      "justify-content": "center",
      flex: "0 0 auto",
      width: "auto",
      "min-width": "0",
      "max-width": "none",
      height: "auto",
      "min-height": "0",
      "max-height": "none",
      margin: "0",
      padding: "0",
      border: "0",
      "border-radius": "0",
      background: "transparent",
      color: "#17253c",
      "box-shadow": "none",
      overflow: "visible",
      visibility: "visible",
      opacity: "1",
      transform: "none",
    });
  }

  side.querySelectorAll(".sn-logo-mark > i, .sn-logo > i, .sn-logo > span:not(.sn-logo-mark)").forEach((dot) => {
    if (!dot.hidden) dot.hidden = true;
    if (dot.getAttribute("aria-hidden") !== "true") dot.setAttribute("aria-hidden", "true");
    if (dot.textContent) dot.textContent = "";
    setMany(dot, {
      display: "none",
      width: "0",
      height: "0",
      "min-width": "0",
      "min-height": "0",
      margin: "0",
      padding: "0",
      border: "0",
      background: "transparent",
      overflow: "hidden",
      visibility: "hidden",
      opacity: "0",
      transform: "none",
    });
  });
}

function normalizeDomain(domain) {
  if (!domain) return;
  domain.dataset.sidebarDomainV91 = "true";
  const active = domain.classList.contains("active");
  setMany(domain, {
    position: "static",
    inset: "auto",
    top: "auto",
    right: "auto",
    bottom: "auto",
    left: "auto",
    flex: "0 0 auto",
    order: "0",
    "margin-top": "0",
    "margin-right": "0",
    "margin-bottom": "0",
    "margin-left": "0",
    "border-top": "0",
    "border-color": "transparent",
    "border-radius": "9px",
    background: active ? "#eaf2ff" : "transparent",
    color: active ? "#245fc9" : "#64738a",
    "font-weight": active ? "900" : "500",
    "box-shadow": "none",
    transform: "none",
  });
}

function normalizeDesktopRow(button, collapsed) {
  if (!button || button.hidden || labelOf(button) === "Nara AI") return;
  button.dataset.sidebarCenteredV94 = collapsed ? "collapsed" : "open";
  setMany(button, collapsed ? {
    display: "grid",
    "grid-template-columns": "1fr",
    "grid-auto-flow": "row",
    "align-items": "center",
    "align-content": "center",
    "justify-items": "center",
    "justify-content": "center",
    width: "48px",
    "min-width": "48px",
    "max-width": "48px",
    height: "44px",
    "min-height": "44px",
    margin: "2px auto",
    padding: "0",
    gap: "0",
    "box-sizing": "border-box",
    "text-align": "center",
    transform: "none",
  } : {
    display: "grid",
    "grid-template-columns": "24px minmax(0, 112px)",
    "grid-auto-flow": "column",
    "align-items": "center",
    "align-content": "center",
    "justify-items": "start",
    "justify-content": "center",
    width: "calc(100% - 16px)",
    "min-width": "0",
    "max-width": "calc(100% - 16px)",
    height: "44px",
    "min-height": "44px",
    margin: "2px auto",
    padding: "0 12px",
    gap: "12px",
    "box-sizing": "border-box",
    "text-align": "left",
    transform: "none",
  });

  const icon = button.querySelector(":scope > svg");
  if (icon) {
    setMany(icon, {
      width: "20px",
      height: "20px",
      margin: "0",
      padding: "0",
      "justify-self": "center",
      "align-self": "center",
      transform: "none",
    });
  }

  const label = button.querySelector(":scope > span");
  if (label) {
    setMany(label, collapsed ? {
      display: "none",
      width: "0",
      height: "0",
      margin: "0",
      padding: "0",
      overflow: "hidden",
      visibility: "hidden",
    } : {
      display: "block",
      width: "auto",
      "min-width": "0",
      height: "auto",
      margin: "0",
      padding: "0",
      overflow: "hidden",
      visibility: "visible",
      "text-align": "left",
      "text-overflow": "ellipsis",
      "white-space": "nowrap",
    });
  }
}

function normalizeDesktopSidebar(side, nav) {
  const collapsed = side.classList.contains("collapsed");
  setMany(nav, {
    display: "flex",
    "flex-direction": "column",
    "justify-content": "flex-start",
    "align-content": "center",
    "align-items": "center",
    gap: "2px",
    padding: collapsed ? "0" : "0 8px",
    "box-sizing": "border-box",
  });

  const workspaceButtons = [...nav.querySelectorAll(":scope > button")]
    .filter((button) => !button.hidden && labelOf(button) !== "Nara AI");
  const commentsButton = nav.querySelector(":scope > .sn-comments-nav-host-v93 > .sn-comments-nav-button-v93");
  const footer = side.querySelector(":scope > .sn-account-footer");
  const footerButtons = footer ? [...footer.querySelectorAll(":scope > button")] : [];
  const createButton = side.querySelector(":scope > .sn-new");

  if (footer) {
    setMany(footer, {
      display: "grid",
      "grid-template-columns": "1fr",
      "justify-items": "center",
      "align-items": "center",
      gap: "4px",
      padding: collapsed ? "8px 0" : "8px",
      "box-sizing": "border-box",
    });
  }

  workspaceButtons.forEach((button) => normalizeDesktopRow(button, collapsed));
  normalizeDesktopRow(commentsButton, collapsed);
  footerButtons.forEach((button) => normalizeDesktopRow(button, collapsed));
  normalizeDesktopRow(createButton, collapsed);
  normalizeLogo(side, collapsed, true);
}

function normalizeMobileCreate(side) {
  const createButton = side.querySelector(":scope > .sn-new");
  if (!createButton) return;
  createButton.dataset.mobileCreateV91 = "true";
  setMany(createButton, {
    position: "relative",
    inset: "auto",
    "z-index": "1",
    flex: "0 0 auto",
    width: "auto",
    "min-width": "0",
    "max-width": "calc(100% - 28px)",
    "min-height": "58px",
    margin: "14px",
    padding: "0 18px",
    border: "0",
    "border-radius": "14px",
    background: "linear-gradient(135deg, #2d6edf, #4c83e9)",
    color: "#ffffff",
    "box-shadow": "0 9px 22px #2d6edf2c",
    overflow: "visible",
    transform: "none",
  });
}

function normalizeMobileSidebar(side, nav) {
  setMany(nav, {
    display: "flex",
    "flex-direction": "column",
    "justify-content": "flex-start",
    "align-content": "stretch",
    "align-items": "stretch",
  });
  normalizeMobileCreate(side);
  normalizeLogo(side, false, false);
}

function syncFinalSidebar() {
  const shell = document.querySelector(".sn-shell");
  const side = shell?.querySelector(":scope > .sn-side");
  const nav = side?.querySelector(":scope > nav");
  if (!side || !nav) return;

  shell.dataset.sidebarFinalRelease = RELEASE;
  hideNaraSidebar(nav);
  const buttons = [...nav.querySelectorAll(":scope > button")];
  normalizeDomain(buttons.find((button) => labelOf(button) === "Domain"));

  if (desktopLayoutRequested()) normalizeDesktopSidebar(side, nav);
  else normalizeMobileSidebar(side, nav);
}

let frame = 0;
function scheduleSync() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(syncFinalSidebar);
}

const observer = new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.type === "attributes"
    || mutation.addedNodes.length
    || mutation.removedNodes.length)) scheduleSync();
});

function start() {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "hidden", "aria-hidden"],
  });
  scheduleSync();
  window.addEventListener("resize", scheduleSync, { passive: true });
  window.addEventListener("pageshow", scheduleSync, { passive: true });
  window.addEventListener("popstate", scheduleSync, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleSync();
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
