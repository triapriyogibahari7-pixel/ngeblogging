const RELEASE = "studio-sidebar-v16-20260724";
let frame = 0;
let layoutTicket = 0;

function deviceProfile() {
  const layoutWidth = Math.max(1, Number(window.innerWidth) || 1);
  const layoutHeight = Math.max(1, Number(window.innerHeight) || 1);
  const screenWidth = Math.max(1, Number(window.screen?.width) || layoutWidth);
  const screenHeight = Math.max(1, Number(window.screen?.height) || layoutHeight);
  const shortSide = Math.min(screenWidth, screenHeight);
  return {
    mobile: shortSide <= 760 || window.matchMedia("(max-width: 760px)").matches,
    narrow: shortSide <= 390,
  };
}

function panelIcon(open) {
  return open
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M12 8l-4 4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M8 12h8m-3-3 3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

const LAYOUT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 9h18M9 9v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

function textLabel(button) {
  return button?.querySelector("span")?.textContent?.trim() || button?.textContent?.trim() || "";
}

function findNavButton(side, label) {
  return [...(side?.querySelectorAll(":scope > nav > button") || [])]
    .find((button) => textLabel(button) === label) || null;
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

  let layout = nav.querySelector(':scope > button[data-layout-route-v16="true"]');
  if (!layout) {
    layout = document.createElement("button");
    layout.type = "button";
    layout.dataset.layoutRouteV16 = "true";
    layout.className = "sn-layout-route-v16";
    layout.innerHTML = `${LAYOUT_ICON}<span>Tata Letak</span>`;
    layout.setAttribute("aria-label", "Buka pengaturan tata letak situs");
    layout.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const currentSide = layout.closest(".sn-side");
      const currentTheme = findNavButton(currentSide, "Tema");
      if (!currentTheme) return;
      const ticket = ++layoutTicket;
      currentTheme.click();
      window.requestAnimationFrame(() => clickLayoutCustomizer(ticket));
    });
    theme.insertAdjacentElement("afterend", layout);
  }

  const customizerOpen = Boolean(document.querySelector(".tn-modal .tn-customizer"));
  layout.classList.toggle("active", customizerOpen);
  layout.setAttribute("aria-current", customizerOpen ? "page" : "false");
}

function syncShell(shell) {
  const profile = deviceProfile();
  document.documentElement.dataset.v15Mobile = String(profile.mobile);
  document.documentElement.dataset.v15Narrow = String(profile.narrow);
  document.documentElement.dataset.studioSidebarRelease = RELEASE;

  const side = shell.querySelector(":scope > .sn-side");
  const original = shell.querySelector(":scope > .sn-main > .sn-top .sn-icon");
  if (!side || !original) return;

  original.dataset.v15OriginalToggle = "true";
  original.tabIndex = -1;
  original.setAttribute("aria-hidden", "true");

  if (profile.mobile && shell.dataset.v15InitialSidebarResolved !== "true") {
    shell.dataset.v15InitialSidebarResolved = "true";
    if (!side.classList.contains("collapsed")) {
      original.click();
      requestAnimationFrame(() => syncShell(shell));
      return;
    }
  }

  const duplicateEdges = [...shell.querySelectorAll(":scope > .sn-sidebar-edge-v15")];
  duplicateEdges.slice(1).forEach((node) => node.remove());
  let edge = duplicateEdges[0] || null;
  if (!edge) {
    edge = document.createElement("button");
    edge.type = "button";
    edge.className = "sn-sidebar-edge-v15";
    edge.dataset.sidebarAuthority = "single-v15";
    shell.append(edge);
    edge.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const current = shell.querySelector(":scope > .sn-main > .sn-top .sn-icon");
      current?.click();
      requestAnimationFrame(() => syncShell(shell));
    });
  }

  const duplicateScrims = [...shell.querySelectorAll(":scope > .sn-sidebar-scrim-v15")];
  duplicateScrims.slice(1).forEach((node) => node.remove());
  let scrim = duplicateScrims[0] || null;
  if (!scrim) {
    scrim = document.createElement("button");
    scrim.type = "button";
    scrim.className = "sn-sidebar-scrim-v15";
    scrim.setAttribute("aria-label", "Tutup menu Studio");
    shell.append(scrim);
    scrim.addEventListener("click", () => {
      const currentSide = shell.querySelector(":scope > .sn-side");
      const current = shell.querySelector(":scope > .sn-main > .sn-top .sn-icon");
      if (currentSide && current && !currentSide.classList.contains("collapsed")) current.click();
      requestAnimationFrame(() => syncShell(shell));
    });
  }

  const open = !side.classList.contains("collapsed");
  shell.dataset.v15SidebarOpen = String(open);
  edge.innerHTML = panelIcon(open);
  edge.setAttribute("aria-controls", side.id || "ngeblogging-studio-sidebar");
  edge.setAttribute("aria-expanded", String(open));
  edge.setAttribute("aria-label", open ? "Tutup menu Studio" : "Buka menu Studio");
  edge.title = open ? "Tutup menu" : "Buka menu";
  scrim.hidden = !open || !profile.mobile;

  side.id ||= "ngeblogging-studio-sidebar";
  side.querySelectorAll(":scope > nav > button").forEach((button) => {
    if (textLabel(button) !== "Nara AI") return;
    button.hidden = true;
    button.disabled = false;
    button.tabIndex = -1;
    button.setAttribute("aria-hidden", "true");
    button.dataset.naraWorkspaceRoute = "true";
  });
  ensureLayoutRoute(side);

  shell.querySelectorAll(".sn-mobile-nav, .sn-mobile-sheet-layer, .sn-side-close, .sn-side-bottom")
    .forEach((node) => node.remove());

  shell.querySelectorAll(".sn-top-actions .sn-nara-button, .nara-floating-button").forEach((button) => {
    button.type = "button";
    button.hidden = false;
    button.disabled = false;
    button.removeAttribute("aria-hidden");
    button.style.removeProperty("display");
    button.style.removeProperty("visibility");
    button.style.removeProperty("opacity");
    button.style.removeProperty("pointer-events");
  });
}

function sync() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    document.querySelectorAll(".sn-shell").forEach(syncShell);
  });
}

const observer = new MutationObserver(sync);
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("resize", sync, { passive: true });
window.addEventListener("orientationchange", sync, { passive: true });
window.addEventListener("pageshow", sync, { passive: true });

sync();
