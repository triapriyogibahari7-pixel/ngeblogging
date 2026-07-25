const RELEASE = "studio-layout-route-v29-20260725";
const ROOT = document.getElementById("root") || document.documentElement;
let frame = 0;
let ticket = 0;

const LAYOUT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/></svg>';

function label(button) {
  return button?.querySelector("span")?.textContent?.trim() || button?.textContent?.trim() || "";
}

function findButton(side, name) {
  return [...(side?.querySelectorAll(":scope > nav > button") || [])].find((button) => label(button) === name) || null;
}

function openCustomizer(currentTicket, attempt = 0) {
  if (ticket !== currentTicket) return;
  const customize = [...document.querySelectorAll(".tn-hero-actions button, .tn-command button")]
    .find((button) => /sesuaikan/i.test(label(button)));
  if (customize) {
    customize.click();
    return;
  }
  if (attempt < 60) window.setTimeout(() => openCustomizer(currentTicket, attempt + 1), 50);
}

function ensure(side) {
  const nav = side?.querySelector(":scope > nav");
  const theme = findButton(side, "Tema");
  if (!nav || !theme) return;

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
    layout.setAttribute("aria-label", "Buka pengaturan tata letak situs");
    layout.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const currentTheme = findButton(layout.closest(".sn-side"), "Tema");
      if (!currentTheme) return;
      const currentTicket = ++ticket;
      currentTheme.click();
      requestAnimationFrame(() => openCustomizer(currentTicket));
    });
  }
}

function scan() {
  document.documentElement.dataset.studioLayoutRouteV29 = RELEASE;
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
