const RELEASE = "studio-sidebar-v21-20260725";
let frame = 0;
let layoutTicket = 0;

const LAYOUT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 9h18M9 9v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

function deviceProfile() {
  const layoutWidth = Math.max(1, Number(window.innerWidth) || 1);
  const screenWidth = Math.max(1, Number(window.screen?.width) || layoutWidth);
  const screenHeight = Math.max(1, Number(window.screen?.height) || Number(window.innerHeight) || 1);
  const shortSide = Math.min(screenWidth, screenHeight);
  const physicalPhone = shortSide <= 760;
  const browserScale = physicalPhone ? Math.max(1, Math.min(3, layoutWidth / screenWidth)) : 1;
  const desktopSitePhone = document.documentElement.dataset.desktopSitePhone === "true"
    || (physicalPhone && browserScale > 1.2);
  return {
    compactPhone: physicalPhone,
    mobileViewport: window.matchMedia("(max-width: 760px)").matches,
    narrow: physicalPhone && shortSide <= 390,
    desktopSitePhone,
  };
}

function textLabel(button) {
  return button?.querySelector("span")?.textContent?.trim() || button?.textContent?.trim() || "";
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
  nav.querySelectorAll(':scope > button[data-layout-route-v16="true"], :scope > button[data-layout-route-v17="true"], :scope > button[data-layout-route-v18="true"], :scope > button[data-layout-route-v19="true"]')
    .forEach((node) => {
      if (!layout) {
        layout = node;
        delete layout.dataset.layoutRouteV16;
        delete layout.dataset.layoutRouteV17;
        delete layout.dataset.layoutRouteV18;
        delete layout.dataset.layoutRouteV19;
        layout.dataset.layoutRouteV21 = "true";
      } else if (node !== layout) node.remove();
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
      const currentTheme = findNavButton(layout.closest(".sn-side"), "Tema");
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

function setOpen(shell, side, toggle, shouldOpen) {
  const currentlyOpen = !side.classList.contains("collapsed");
  if (currentlyOpen !== shouldOpen) toggle.click();
  requestAnimationFrame(schedule);
}

function ensureScrim(shell, side, toggle, profile) {
  const scrims = [...shell.querySelectorAll(":scope > .sn-sidebar-scrim-v15")];
  const scrim = scrims.shift() || document.createElement("button");
  scrims.forEach((node) => node.remove());

  if (!scrim.isConnected) {
    scrim.type = "button";
    scrim.className = "sn-sidebar-scrim-v15";
    scrim.setAttribute("aria-label", "Tutup menu Studio");
    shell.append(scrim);
  }

  if (scrim.dataset.scrimHandlerV21 !== "true") {
    scrim.dataset.scrimHandlerV21 = "true";
    scrim.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const currentSide = shell.querySelector(":scope > .sn-side");
      const currentToggle = shell.querySelector('.sn-icon[data-sidebar-authority="single-v21"]');
      if (currentSide && currentToggle) setOpen(shell, currentSide, currentToggle, false);
    });
  }

  scrim.hidden = side.classList.contains("collapsed") || !profile.compactPhone;
}

function normalizeToggle(shell, side, toggle, profile) {
  shell.querySelectorAll(":scope > .sn-sidebar-edge-v15").forEach((node) => node.remove());
  shell.querySelectorAll(':scope > .sn-main > .sn-top > .sn-icon:not(:first-of-type)')
    .forEach((node) => node.remove());

  toggle.removeAttribute("data-v15-original-toggle");
  delete toggle.dataset.v15OriginalToggle;
  toggle.dataset.sidebarAuthority = "single-v21";
  toggle.classList.remove("sn-sidebar-edge-owner-v17", "sn-sidebar-edge-owner-v18", "sn-sidebar-edge-owner-v19");
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

  if (profile.compactPhone && shell.dataset.v21InitialSidebarResolved !== "true") {
    shell.dataset.v21InitialSidebarResolved = "true";
    if (!side.classList.contains("collapsed")) {
      toggle.click();
      return false;
    }
  }
  return true;
}

function normalizeNav(shell, side, toggle, profile) {
  side.querySelectorAll(":scope > nav > button").forEach((button) => {
    const label = textLabel(button);
    if (label === "Nara AI") {
      button.hidden = true;
      button.disabled = false;
      button.tabIndex = -1;
      button.setAttribute("aria-hidden", "true");
      button.dataset.naraWorkspaceRoute = "true";
      return;
    }

    if (button.dataset.sidebarCloseV21 !== "true") {
      button.dataset.sidebarCloseV21 = "true";
      button.addEventListener("click", () => {
        if (!deviceProfile().compactPhone) return;
        requestAnimationFrame(() => {
          const currentSide = shell.querySelector(":scope > .sn-side");
          const currentToggle = shell.querySelector('.sn-icon[data-sidebar-authority="single-v21"]');
          if (currentSide && currentToggle && !currentSide.classList.contains("collapsed")) {
            setOpen(shell, currentSide, currentToggle, false);
          }
        });
      });
    }
  });

  if (!profile.compactPhone) return;
  side.querySelectorAll(".sn-side-close,.sn-side-bottom").forEach((node) => node.remove());
}

function syncShell(shell) {
  const profile = deviceProfile();
  const root = document.documentElement;
  root.dataset.studioCompactPhone = String(profile.compactPhone);
  root.dataset.v15Mobile = String(profile.compactPhone || profile.mobileViewport);
  root.dataset.v15Narrow = String(profile.narrow);
  root.dataset.studioDesktopSitePhone = String(profile.desktopSitePhone);
  root.dataset.studioSidebarRelease = RELEASE;

  const side = shell.querySelector(":scope > .sn-side");
  const toggle = shell.querySelector(":scope > .sn-main > .sn-top > .sn-icon");
  if (!side || !toggle) return;

  side.id ||= "ngeblogging-studio-sidebar";
  if (!normalizeToggle(shell, side, toggle, profile)) return;

  const open = !side.classList.contains("collapsed");
  shell.dataset.v15SidebarOpen = String(open);
  shell.dataset.v21SidebarOpen = String(open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Tutup menu Studio" : "Buka menu Studio");

  ensureScrim(shell, side, toggle, profile);
  normalizeNav(shell, side, toggle, profile);
  ensureLayoutRoute(side);

  shell.querySelectorAll(".sn-mobile-nav, .sn-mobile-sheet-layer, .sn-side-close, .sn-side-bottom")
    .forEach((node) => node.remove());

  document.querySelectorAll(".sn-top-actions .sn-nara-button, .ce-nara, .nara-floating-button")
    .forEach((button) => {
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
  document.querySelectorAll(".sn-shell").forEach(syncShell);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });

schedule();
