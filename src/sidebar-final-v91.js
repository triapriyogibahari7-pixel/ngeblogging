import "./comments-studio-v93.jsx";

const RELEASE = "sidebar-comments-v93-20260728";

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

function normalizeLogo(side) {
  const mark = side.querySelector(":scope .sn-logo > .sn-logo-mark");
  if (mark) {
    for (const [property, value] of Object.entries({
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
    })) setImportant(mark, property, value);
  }

  side.querySelectorAll(".sn-logo-mark > i, .sn-logo > i, .sn-logo > span:not(.sn-logo-mark)").forEach((dot) => {
    dot.hidden = true;
    dot.setAttribute("aria-hidden", "true");
    dot.textContent = "";
    for (const [property, value] of Object.entries({
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
    })) setImportant(dot, property, value);
  });
}

function normalizeDomain(domain) {
  if (!domain) return;
  domain.dataset.sidebarDomainV91 = "true";
  const active = domain.classList.contains("active");
  for (const [property, value] of Object.entries({
    position: "static",
    inset: "auto",
    top: "auto",
    right: "auto",
    bottom: "auto",
    left: "auto",
    display: "flex",
    flex: "0 0 auto",
    "align-self": "stretch",
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
  })) setImportant(domain, property, value);
}

function normalizeMobileCreate(side) {
  const desktopRequested = document.documentElement.dataset.desktopLayoutRequested === "true";
  const physicalMobile = window.matchMedia("(max-width: 760px)").matches;
  const createButton = side.querySelector(":scope > .sn-new");
  if (!createButton || !physicalMobile || desktopRequested) return;

  createButton.dataset.mobileCreateV91 = "true";
  for (const [property, value] of Object.entries({
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
  })) setImportant(createButton, property, value);
}

function syncFinalSidebar() {
  const shell = document.querySelector(".sn-shell");
  const side = shell?.querySelector(":scope > .sn-side");
  const nav = side?.querySelector(":scope > nav");
  if (!side || !nav) return;

  shell.dataset.sidebarFinalRelease = RELEASE;
  setImportant(nav, "display", "flex");
  setImportant(nav, "flex-direction", "column");
  setImportant(nav, "justify-content", "flex-start");
  setImportant(nav, "align-content", "flex-start");
  setImportant(nav, "align-items", "stretch");

  const buttons = [...nav.querySelectorAll(":scope > button")];
  normalizeDomain(buttons.find((button) => labelOf(button) === "Domain"));
  normalizeLogo(side);
  normalizeMobileCreate(side);
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
    attributeFilter: ["class", "style", "hidden", "aria-hidden"],
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
