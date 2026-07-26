const RELEASE = "studio-layout-route-v29-20260725";
const LAYOUT_BUILDER_EVENT = "ngeblogging:open-layout-builder-v36";
const ROOT = document.getElementById("root") || document.documentElement;
const SIDEBAR_ROUTE_ENABLED = false;
let frame = 0;
let ticket = 0;

const LAYOUT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/></svg>';

function label(button) {
  return button?.querySelector("span")?.textContent?.trim() || button?.textContent?.trim() || "";
}

function findButton(side, name) {
  return [...(side?.querySelectorAll(":scope > nav > button") || [])].find((button) => label(button) === name) || null;
}

function openLayoutBuilder(currentTicket, attempt = 0) {
  if (ticket !== currentTicket) return;
  const layoutButton = document.querySelector('[data-layout-builder-v36="true"]');
  if (layoutButton) {
    layoutButton.click();
    return;
  }
  if (attempt < 60) {
    window.setTimeout(() => openLayoutBuilder(currentTicket, attempt + 1), 50);
    return;
  }
  window.dispatchEvent(new CustomEvent(LAYOUT_BUILDER_EVENT));
}

// Kept as a compatibility authority for existing Studio route validators.
function openCustomizer(currentTicket, attempt = 0) {
  return openLayoutBuilder(currentTicket, attempt);
}

function removeRetiredRoute(nav) {
  nav?.querySelectorAll([
    ':scope > button[data-layout-route-v29="true"]',
    ':scope > button[data-layout-route-v23="true"]',
    ':scope > button[class*="sn-layout-route"]',
  ].join(",")).forEach((node) => node.remove());
}

function ensure(side) {
  const nav = side?.querySelector(":scope > nav");
  if (!nav) return;

  if (!SIDEBAR_ROUTE_ENABLED) {
    removeRetiredRoute(nav);
    return;
  }

  const theme = findButton(side, "Tema");
  if (!theme) return;

  let layout = nav.querySelector(':scope > button[data-layout-route-v29="true"]');
  nav.querySelectorAll(':scope > button[data-layout-route-v23="true"], :scope > button[class*="sn-layout-route"]')
    .forEach((node) => {
      if (!layout) {
        layout = node;
        layout.dataset.layoutRouteV29 = "true";
        layout.className = "sn-layout-route-v29";
      } else if (node !== layout) node.remove();
    });

  if (!layout) {
    layout = document.createElement("button");
    layout.type = "button";
    layout.className = "sn-layout-route-v29";
    layout.dataset.layoutRouteV29 = "true";
    layout.innerHTML = `${LAYOUT_ICON}<span>Tata Letak</span>`;
    theme.insertAdjacentElement("afterend", layout);
  }

  if (layout.dataset.layoutHandlerV29 !== "true") {
    layout.dataset.layoutHandlerV29 = "true";
    layout.setAttribute("aria-label", "Buka pembuat tata letak visual situs");
    layout.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const currentTheme = findButton(layout.closest(".sn-side"), "Tema");
      if (!currentTheme) {
        window.dispatchEvent(new CustomEvent(LAYOUT_BUILDER_EVENT));
        return;
      }
      const currentTicket = ++ticket;
      currentTheme.click();
      requestAnimationFrame(() => openCustomizer(currentTicket));
    });
  }
}

function scan() {
  document.documentElement.dataset.studioLayoutRouteV29 = RELEASE;
  document.documentElement.dataset.studioLayoutSidebarRetired = "v48";
  document.querySelectorAll(".sn-shell > .sn-side").forEach(ensure);
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(ROOT, { childList: true, subtree: true });

scan();
