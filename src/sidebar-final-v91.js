const RELEASE = "sidebar-final-v91-20260728";

function labelOf(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function setImportant(node, property, value) {
  if (!node) return;
  node.style.setProperty(property, value, "important");
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
  const domain = buttons.find((button) => labelOf(button) === "Domain");
  if (domain) {
    domain.dataset.sidebarDomainV91 = "true";
    for (const [property, value] of Object.entries({
      position: "static",
      inset: "auto",
      top: "auto",
      right: "auto",
      bottom: "auto",
      left: "auto",
      flex: "0 0 auto",
      "align-self": "stretch",
      order: "0",
      "margin-top": "0",
      "margin-right": "0",
      "margin-bottom": "0",
      "margin-left": "0",
      "border-top": "0",
      transform: "none",
    })) setImportant(domain, property, value);
  }

  side.querySelectorAll(".sn-logo-mark > i, .sn-logo > i").forEach((dot) => {
    dot.hidden = true;
    dot.setAttribute("aria-hidden", "true");
    setImportant(dot, "display", "none");
    setImportant(dot, "visibility", "hidden");
    setImportant(dot, "opacity", "0");
  });

  const desktopRequested = document.documentElement.dataset.desktopLayoutRequested === "true";
  const physicalMobile = window.matchMedia("(max-width: 760px)").matches;
  const createButton = side.querySelector(":scope > .sn-new");
  if (createButton && physicalMobile && !desktopRequested) {
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
      border: "1px solid #dfe6ef",
      "border-radius": "14px",
      background: "#ffffff",
      color: "#17253c",
      "box-shadow": "none",
      overflow: "visible",
      transform: "none",
    })) setImportant(createButton, property, value);
  }
}

let frame = 0;
function scheduleSync() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(syncFinalSidebar);
}

const observer = new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) scheduleSync();
});

function start() {
  observer.observe(document.body, { childList: true, subtree: true });
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
