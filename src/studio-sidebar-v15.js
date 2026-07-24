const RELEASE = "studio-sidebar-v18-20260724";
let frame = 0;
let layoutTicket = 0;

function deviceProfile() {
  const layoutWidth = Math.max(1, Number(window.innerWidth) || 1);
  const layoutHeight = Math.max(1, Number(window.innerHeight) || 1);
  const screenWidth = Math.max(1, Number(window.screen?.width) || layoutWidth);
  const screenHeight = Math.max(1, Number(window.screen?.height) || layoutHeight);
  const shortSide = Math.min(screenWidth, screenHeight);
  const physicalMobile = shortSide <= 760;
  const browserScale = physicalMobile ? Math.max(1, Math.min(3, layoutWidth / screenWidth)) : 1;
  const desktopSitePhone = document.documentElement.dataset.desktopSitePhone === "true"
    || (physicalMobile && browserScale > 1.2);
  const mobile = !desktopSitePhone && (shortSide <= 760 || window.matchMedia("(max-width: 760px)").matches);
  return {
    mobile,
    narrow: mobile && shortSide <= 390,
    desktopSitePhone,
  };
}

const LAYOUT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 9h18M9 9v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

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

  let layout = nav.querySelector(':scope > button[data-layout-route-v18="true"]');
  nav.querySelectorAll(':scope > button[data-layout-route-v16="true"], :scope > button[data-layout-route-v17="true"]').forEach((node) => {
    if (!layout) {
      layout = node;
      delete layout.dataset.layoutRouteV16;
      delete layout.dataset.layoutRouteV17;
      layout.dataset.layoutRouteV18 = "true";
    } else if (node !== layout) node.remove();
  });

  if (!layout) {
    layout = document.createElement("button");
    layout.type = "button";
    layout.dataset.layoutRouteV18 = "true";
    layout.className = "sn-layout-route-v16 sn-layout-route-v17 sn-layout-route-v18";
    layout.innerHTML = `${LAYOUT_ICON}<span>Tata Letak</span>`;
    layout.setAttribute("aria-label", "Buka pengaturan tata letak situs");
    theme.insertAdjacentElement("afterend", layout);
  }

  if (layout.dataset.layoutHandlerV18 !== "true") {
    layout.dataset.layoutHandlerV18 = "true";
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

function ensureScrim(shell, original, side, profile) {
  const scrims = [...shell.querySelectorAll(":scope > .sn-sidebar-scrim-v15")];
  const scrim = scrims.shift() || document.createElement("button");
  scrims.forEach((node) => node.remove());

  if (!scrim.isConnected) {
    scrim.type = "button";
    scrim.className = "sn-sidebar-scrim-v15";
    scrim.setAttribute("aria-label", "Tutup menu Studio");
    shell.append(scrim);
  }

  if (scrim.dataset.scrimHandlerV18 !== "true") {
    scrim.dataset.scrimHandlerV18 = "true";
    scrim.addEventListener("click", () => {
      const currentSide = shell.querySelector(":scope > .sn-side");
      if (currentSide && !currentSide.classList.contains("collapsed")) original.click();
    });
  }

  scrim.hidden = side.classList.contains("collapsed") || !profile.mobile;
}

function normalizeToggle(shell, side, original, profile) {
  shell.querySelectorAll(":scope > .sn-sidebar-edge-v15").forEach((node) => node.remove());

  original.removeAttribute("data-v15-original-toggle");
  delete original.dataset.v15OriginalToggle;
  original.dataset.sidebarAuthority = "single-v18";
  original.classList.add("sn-sidebar-edge-owner-v17", "sn-sidebar-edge-owner-v18");
  original.hidden = false;
  original.disabled = false;
  original.tabIndex = 0;
  original.removeAttribute("aria-hidden");
  original.setAttribute("aria-controls", side.id || "ngeblogging-studio-sidebar");
  original.setAttribute("aria-expanded", String(!side.classList.contains("collapsed")));
  original.setAttribute("aria-label", side.classList.contains("collapsed") ? "Buka menu Studio" : "Tutup menu Studio");
  original.title = side.classList.contains("collapsed") ? "Buka menu" : "Tutup menu";

  if (original.dataset.sidebarSyncV18 !== "true") {
    original.dataset.sidebarSyncV18 = "true";
    original.addEventListener("click", () => requestAnimationFrame(schedule));
  }

  if (profile.mobile && shell.dataset.v18InitialSidebarResolved !== "true") {
    shell.dataset.v18InitialSidebarResolved = "true";
    if (!side.classList.contains("collapsed")) {
      original.click();
      return false;
    }
  }
  return true;
}

function syncShell(shell) {
  const profile = deviceProfile();
  const root = document.documentElement;
  root.dataset.v15Mobile = String(profile.mobile);
  root.dataset.v15Narrow = String(profile.narrow);
  root.dataset.studioDesktopSitePhone = String(profile.desktopSitePhone);
  root.dataset.studioSidebarRelease = RELEASE;

  const side = shell.querySelector(":scope > .sn-side");
  const original = shell.querySelector(":scope > .sn-main > .sn-top .sn-icon");
  if (!side || !original) return;

  side.id ||= "ngeblogging-studio-sidebar";
  if (!normalizeToggle(shell, side, original, profile)) return;

  shell.dataset.v15SidebarOpen = String(!side.classList.contains("collapsed"));
  ensureScrim(shell, original, side, profile);

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

  document.querySelectorAll(".sn-top-actions .sn-nara-button, .nara-floating-button").forEach((button) => {
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

const observer = new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
});
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });

schedule();
