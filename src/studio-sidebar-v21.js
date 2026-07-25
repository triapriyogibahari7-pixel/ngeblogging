const RELEASE = "studio-sidebar-v21-20260725";
const MOBILE_QUERY = "(max-width: 760px)";
let frame = 0;
let layoutTicket = 0;
let lastMobile = null;

const LAYOUT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 9h18M9 9v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

function isMobileViewport() {
  const layoutWidth = Math.max(1, Number(window.innerWidth) || 1);
  const screenWidth = Math.max(1, Number(window.screen?.width) || layoutWidth);
  const screenHeight = Math.max(1, Number(window.screen?.height) || layoutWidth);
  const physicalScreenMobile = Math.min(screenWidth, screenHeight) <= 760;
  const desktopLayoutRequested = document.documentElement.dataset.desktopLayoutRequested === "true"
    || (physicalScreenMobile && (layoutWidth > 760 || layoutWidth / screenWidth >= 1.18));
  return window.matchMedia(MOBILE_QUERY).matches && !desktopLayoutRequested;
}

function textLabel(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function findNavButton(side, label) {
  return [...(side?.querySelectorAll(":scope > nav > button") || [])]
    .find((button) => textLabel(button) === label) || null;
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

function clickLayoutCustomizer(ticket, attempt = 0) {
  if (ticket !== layoutTicket) return;
  const buttons = [...document.querySelectorAll(".tn-hero-actions button, .tn-command button")];
  const customize = buttons.find((button) => /sesuaikan/i.test(textLabel(button)));
  if (customize) {
    customize.click();
    return;
  }
  if (attempt < 60) window.setTimeout(() => clickLayoutCustomizer(ticket, attempt + 1), 50);
}

function ensureLayoutRoute(side) {
  const nav = side?.querySelector(":scope > nav");
  const theme = findNavButton(side, "Tema");
  if (!nav || !theme) return;

  let layout = nav.querySelector(':scope > button[data-layout-route-v21="true"]');
  nav.querySelectorAll(':scope > button[data-layout-route-v16="true"], :scope > button[data-layout-route-v17="true"], :scope > button[data-layout-route-v18="true"], :scope > button[data-layout-route-v19="true"], :scope > button[data-layout-route-v20="true"]').forEach((node) => {
    if (!layout) {
      layout = node;
      Object.keys(node.dataset).filter((key) => /^layoutRouteV\d+$/.test(key)).forEach((key) => delete node.dataset[key]);
      layout.dataset.layoutRouteV21 = "true";
      layout.className = "sn-layout-route-v21";
    } else if (node !== layout) {
      node.remove();
    }
  });

  if (!layout) {
    layout = document.createElement("button");
    layout.type = "button";
    layout.dataset.layoutRouteV21 = "true";
    layout.className = "sn-layout-route-v21";
    layout.innerHTML = `${LAYOUT_ICON}<span>Tata Letak</span>`;
    layout.setAttribute("aria-label", "Buka pengaturan tata letak situs");
    theme.insertAdjacentElement("afterend", layout);
  }

  if (layout.dataset.layoutHandlerV21 !== "true") {
    layout.dataset.layoutHandlerV21 = "true";
    layout.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const currentSide = layout.closest(".sn-side");
      const currentTheme = findNavButton(currentSide, "Tema");
      if (!currentTheme) return;
      const ticket = ++layoutTicket;
      currentTheme.click();
      requestAnimationFrame(() => clickLayoutCustomizer(ticket));
    });
  }

  const customizerOpen = Boolean(document.querySelector(".tn-modal .tn-customizer"));
  layout.classList.toggle("active", customizerOpen);
  layout.setAttribute("aria-current", customizerOpen ? "page" : "false");
}

function ensureScrim(shell, toggle, side, mobile) {
  shell.querySelectorAll(":scope > .sn-sidebar-scrim-v15, :scope > .sn-sidebar-scrim-v16, :scope > .sn-sidebar-scrim-v17, :scope > .sn-sidebar-scrim-v18, :scope > .sn-sidebar-scrim-v19, :scope > .sn-sidebar-scrim-v20").forEach((node) => node.remove());

  let scrim = shell.querySelector(":scope > .sn-sidebar-scrim-v21");
  if (!scrim) {
    scrim = document.createElement("button");
    scrim.type = "button";
    scrim.className = "sn-sidebar-scrim-v21";
    scrim.setAttribute("aria-label", "Tutup menu Studio");
    scrim.addEventListener("click", () => {
      const currentSide = shell.querySelector(":scope > .sn-side");
      if (currentSide && !currentSide.classList.contains("collapsed")) toggle.click();
    });
    shell.append(scrim);
  }
  scrim.hidden = !mobile || side.classList.contains("collapsed");
}

function normalizeToggle(shell, side, toggle, mobile) {
  shell.querySelectorAll(":scope > .sn-sidebar-edge-v15, :scope > .sn-sidebar-edge-v16, :scope > .sn-sidebar-edge-v17, :scope > .sn-sidebar-edge-v18, :scope > .sn-sidebar-edge-v19, :scope > .sn-sidebar-edge-v20").forEach((node) => node.remove());

  [...toggle.classList]
    .filter((name) => /^sn-sidebar-edge-owner-v\d+$/.test(name))
    .forEach((name) => toggle.classList.remove(name));

  toggle.classList.add("sn-sidebar-edge-owner-v21");
  toggle.dataset.sidebarAuthority = "single-v21";
  toggle.hidden = false;
  toggle.disabled = false;
  toggle.tabIndex = 0;
  toggle.removeAttribute("aria-hidden");
  toggle.setAttribute("aria-controls", side.id || "ngeblogging-studio-sidebar");
  toggle.setAttribute("aria-expanded", String(!side.classList.contains("collapsed")));
  toggle.setAttribute("aria-label", side.classList.contains("collapsed") ? "Buka menu Studio" : "Tutup menu Studio");
  toggle.title = side.classList.contains("collapsed") ? "Buka menu" : "Tutup menu";

  if (toggle.dataset.sidebarSyncV21 !== "true") {
    toggle.dataset.sidebarSyncV21 = "true";
    toggle.addEventListener("click", () => requestAnimationFrame(schedule));
  }

  const modeChanged = lastMobile !== mobile;
  if (modeChanged || shell.dataset.v21InitialSidebarResolved !== "true") {
    shell.dataset.v21InitialSidebarResolved = "true";
    if (mobile && !side.classList.contains("collapsed")) {
      toggle.click();
      return false;
    }
    if (!mobile && side.classList.contains("collapsed") && shell.dataset.v21UserCollapsed !== "true") {
      toggle.click();
      return false;
    }
  }

  return true;
}

function syncShell(shell) {
  const mobile = isMobileViewport();
  const root = document.documentElement;
  root.dataset.studioMobileV21 = String(mobile);
  root.dataset.studioSidebarRelease = RELEASE;

  const side = shell.querySelector(":scope > .sn-side");
  const toggle = shell.querySelector(":scope > .sn-main > .sn-top .sn-icon");
  if (!side || !toggle) return;

  side.id ||= "ngeblogging-studio-sidebar";
  if (!normalizeToggle(shell, side, toggle, mobile)) return;

  shell.dataset.v21SidebarOpen = String(!side.classList.contains("collapsed"));
  ensureScrim(shell, toggle, side, mobile);

  side.querySelectorAll(":scope > nav > button").forEach((button) => {
    if (textLabel(button) !== "Nara AI") return;
    button.hidden = true;
    button.tabIndex = -1;
    button.setAttribute("aria-hidden", "true");
    button.dataset.naraWorkspaceRoute = "true";
  });

  ensureLayoutRoute(side);

  shell.querySelectorAll(".sn-mobile-nav, .sn-mobile-sheet-layer, .sn-side-close, .sn-side-bottom")
    .forEach((node) => node.remove());

  document.querySelectorAll(".nara-floating-button").forEach((button) => {
    button.type = "button";
    button.hidden = false;
    button.disabled = false;
    button.removeAttribute("aria-hidden");
    button.style.removeProperty("display");
    button.style.removeProperty("visibility");
    button.style.removeProperty("opacity");
    button.style.removeProperty("pointer-events");
  });

  document.querySelectorAll(".sn-top-actions .sn-nara-button, .ce-nara").forEach((button) => {
    button.hidden = true;
    button.tabIndex = -1;
    button.setAttribute("aria-hidden", "true");
  });
}

function sync() {
  const mobile = isMobileViewport();
  document.querySelectorAll(".sn-shell").forEach(syncShell);
  lastMobile = mobile;
}

function closeAfterMobileSelection(event) {
  if (!isMobileViewport()) return;
  const button = event.target.closest(".sn-side > nav > button");
  if (!button || button.dataset.layoutRouteV21 === "true") return;
  const shell = button.closest(".sn-shell");
  const side = shell?.querySelector(":scope > .sn-side");
  const toggle = shell?.querySelector(":scope > .sn-main > .sn-top .sn-icon");
  if (side && toggle && !side.classList.contains("collapsed")) requestAnimationFrame(() => toggle.click());
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("click", closeAfterMobileSelection, true);
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });

schedule();
