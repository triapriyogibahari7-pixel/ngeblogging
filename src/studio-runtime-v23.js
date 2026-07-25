const RELEASE = "studio-runtime-v23-20260725";
const MOBILE_FIX_RELEASE = "studio-mobile-interaction-v25-20260725";
const MOBILE_BREAKPOINT = 760;
const TABLET_BREAKPOINT = 1100;
const LAYOUT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 9h18M9 9v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const SIDEBAR_CLOSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 9l-3 3 3 3"/></svg>';
const SIDEBAR_OPEN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M12 9l3 3-3 3"/></svg>';

let frame = 0;
let layoutTicket = 0;

function viewportProfile() {
  const layoutWidth = Math.max(1, Number(window.innerWidth) || 1);
  const layoutHeight = Math.max(1, Number(window.innerHeight) || 1);
  const visualWidth = Math.max(1, Number(window.visualViewport?.width) || layoutWidth);
  const visualHeight = Math.max(1, Number(window.visualViewport?.height) || layoutHeight);
  const screenWidth = Math.max(1, Number(window.screen?.width) || layoutWidth);
  const screenHeight = Math.max(1, Number(window.screen?.height) || layoutHeight);
  const screenShortSide = Math.min(screenWidth, screenHeight);
  const physicalPhone = screenShortSide <= MOBILE_BREAKPOINT;
  const viewportToScreenRatio = layoutWidth / screenWidth;
  const compact = layoutWidth <= MOBILE_BREAKPOINT;
  const desktopRequested = physicalPhone
    && !compact
    && (layoutWidth >= 780 || viewportToScreenRatio >= 1.18);
  const tablet = !compact && !desktopRequested && layoutWidth <= TABLET_BREAKPOINT;
  return {
    layoutWidth,
    layoutHeight,
    visualWidth,
    visualHeight,
    screenWidth,
    screenHeight,
    physicalPhone,
    desktopRequested,
    compact,
    tablet,
    viewportToScreenRatio,
  };
}

function syncDeviceFlags() {
  const profile = viewportProfile();
  const root = document.documentElement;
  root.dataset.studioRuntime = RELEASE;
  root.dataset.studioMobileInteraction = MOBILE_FIX_RELEASE;
  root.dataset.studioAuthority = "v23";
  root.dataset.physicalPhone = String(profile.physicalPhone);
  root.dataset.physicalScreenMobile = String(profile.physicalPhone);
  root.dataset.desktopLayoutRequested = String(profile.desktopRequested);
  root.dataset.desktopSitePhone = String(profile.desktopRequested);
  root.dataset.compactViewport = String(profile.compact);
  root.dataset.physicalMobile = String(profile.compact);
  root.dataset.tabletViewport = String(profile.tablet);
  root.dataset.layoutMode = profile.desktopRequested
    ? "desktop-phone"
    : profile.compact
      ? "mobile"
      : profile.tablet
        ? "tablet"
        : "desktop";
  root.dataset.orientation = window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
  root.style.setProperty("--sn-v23-layout-width", `${profile.layoutWidth.toFixed(2)}px`);
  root.style.setProperty("--sn-v23-layout-height", `${profile.layoutHeight.toFixed(2)}px`);
  root.style.setProperty("--sn-v23-visual-width", `${profile.visualWidth.toFixed(2)}px`);
  root.style.setProperty("--sn-v23-visual-height", `${profile.visualHeight.toFixed(2)}px`);
  root.style.setProperty("--sn-v23-screen-ratio", profile.viewportToScreenRatio.toFixed(3));
  return profile;
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

  let layout = nav.querySelector(':scope > button[data-layout-route-v23="true"]');
  nav.querySelectorAll(':scope > button[class*="sn-layout-route"], :scope > button[data-layout-route-v16], :scope > button[data-layout-route-v17], :scope > button[data-layout-route-v18], :scope > button[data-layout-route-v19], :scope > button[data-layout-route-v20], :scope > button[data-layout-route-v21], :scope > button[data-layout-route-v22]')
    .forEach((node) => {
      if (!layout) {
        layout = node;
        [...Object.keys(node.dataset)]
          .filter((key) => /^layoutRouteV\d+$/.test(key))
          .forEach((key) => delete node.dataset[key]);
        layout.dataset.layoutRouteV23 = "true";
        layout.className = "sn-layout-route-v23";
      } else if (node !== layout) {
        node.remove();
      }
    });

  if (!layout) {
    layout = document.createElement("button");
    layout.type = "button";
    layout.dataset.layoutRouteV23 = "true";
    layout.className = "sn-layout-route-v23";
    layout.innerHTML = `${LAYOUT_ICON}<span>Tata Letak</span>`;
    layout.setAttribute("aria-label", "Buka pengaturan tata letak situs");
    theme.insertAdjacentElement("afterend", layout);
  }

  if (layout.dataset.layoutHandlerV23 !== "true") {
    layout.dataset.layoutHandlerV23 = "true";
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
}

function ensureScrim(shell, side, toggle, compact) {
  shell.querySelectorAll(':scope > [class*="sn-sidebar-scrim-"]')
    .forEach((node) => {
      if (!node.classList.contains("sn-sidebar-scrim-v23")) node.remove();
    });

  let scrim = shell.querySelector(":scope > .sn-sidebar-scrim-v23");
  if (!scrim) {
    scrim = document.createElement("button");
    scrim.type = "button";
    scrim.className = "sn-sidebar-scrim-v23";
    scrim.setAttribute("aria-label", "Tutup menu Studio");
    scrim.addEventListener("click", () => {
      const currentSide = shell.querySelector(":scope > .sn-side");
      if (currentSide && !currentSide.classList.contains("collapsed")) toggle.click();
    });
    shell.append(scrim);
  }
  scrim.hidden = !compact || side.classList.contains("collapsed");
}

function syncSidebar(shell, profile) {
  shell.querySelectorAll(":scope > .sn-mobile-nav, :scope > .sn-mobile-sheet-layer, .sn-side-close, .sn-side-bottom")
    .forEach((node) => node.remove());
  shell.querySelectorAll(':scope > [class*="sn-sidebar-edge-v"]')
    .forEach((node) => node.remove());

  const side = shell.querySelector(":scope > .sn-side");
  const toggle = shell.querySelector(":scope > .sn-main > .sn-top .sn-icon");
  if (!side || !toggle) return;

  side.id ||= "ngeblogging-studio-sidebar";
  toggle.type = "button";
  toggle.hidden = false;
  toggle.disabled = false;
  toggle.tabIndex = 0;
  toggle.removeAttribute("aria-hidden");
  [...toggle.classList]
    .filter((name) => /^sn-sidebar-edge-owner-v\d+$/.test(name))
    .forEach((name) => toggle.classList.remove(name));
  toggle.classList.add("sn-sidebar-edge-owner-v23");
  toggle.dataset.sidebarAuthority = "single-v23";
  toggle.dataset.sidebarInteraction = MOBILE_FIX_RELEASE;

  if (toggle.dataset.sidebarUserHandlerV23 !== "true") {
    toggle.dataset.sidebarUserHandlerV23 = "true";
    toggle.addEventListener("click", () => {
      shell.dataset.v23UserChangedSidebar = "true";
      requestAnimationFrame(schedule);
    });
  }

  const mode = profile.compact ? "mobile" : profile.tablet ? "tablet" : "desktop";
  if (shell.dataset.v23ResolvedMode !== mode) {
    shell.dataset.v23ResolvedMode = mode;
    shell.dataset.v23UserChangedSidebar = "false";
    if ((profile.compact || profile.tablet) && !side.classList.contains("collapsed")) {
      toggle.click();
      requestAnimationFrame(schedule);
      return;
    }
    if (!profile.compact && !profile.tablet && side.classList.contains("collapsed")) {
      toggle.click();
      requestAnimationFrame(schedule);
      return;
    }
  }

  const open = !side.classList.contains("collapsed");
  shell.dataset.v23SidebarOpen = String(open);
  shell.dataset.sidebarMode = mode;
  toggle.innerHTML = open ? SIDEBAR_CLOSE_ICON : SIDEBAR_OPEN_ICON;
  toggle.setAttribute("aria-controls", side.id);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Tutup menu Studio" : "Buka menu Studio");
  toggle.title = open ? "Tutup menu" : "Buka menu";

  side.querySelectorAll(":scope > nav > button").forEach((button) => {
    if (textLabel(button) !== "Nara AI") return;
    button.hidden = true;
    button.tabIndex = -1;
    button.setAttribute("aria-hidden", "true");
    button.dataset.naraWorkspaceRoute = "true";
  });

  ensureLayoutRoute(side);
  ensureScrim(shell, side, toggle, profile.compact);
}

function syncNara() {
  document.querySelectorAll([
    ".nara-floating-proxy-v14",
    ".nara-floating-proxy-v15",
    ".nara-floating-proxy-v16",
    ".nara-floating-proxy-v17",
    ".nara-floating-proxy-v18",
    ".nara-floating-proxy-v19",
    ".nara-floating-proxy-v20",
    ".nara-floating-proxy-v21",
    ".nara-floating-proxy-v22",
  ].join(",")).forEach((node) => node.remove());

  document.querySelectorAll(".sn-top-actions .sn-nara-button, .ce-nara").forEach((button) => {
    button.hidden = true;
    button.disabled = true;
    button.tabIndex = -1;
    button.setAttribute("aria-hidden", "true");
  });

  const launchers = [...document.querySelectorAll(".nara-floating-button")];
  launchers.forEach((button, index) => {
    button.type = "button";
    button.dataset.naraLauncherAuthority = "single-v23";
    if (index > 0) {
      button.hidden = true;
      button.disabled = true;
      button.tabIndex = -1;
      button.setAttribute("aria-hidden", "true");
      return;
    }
    button.hidden = false;
    button.disabled = false;
    button.tabIndex = 0;
    button.removeAttribute("aria-hidden");
    button.setAttribute("aria-label", "Buka Nara AI");
    button.style.removeProperty("display");
    button.style.removeProperty("visibility");
    button.style.removeProperty("opacity");
    button.style.removeProperty("pointer-events");
    button.style.removeProperty("transform");
  });

  const layer = document.querySelector(".nara-assistant-layer");
  const open = Boolean(layer);
  document.documentElement.dataset.naraOpen = String(open);
  document.body.classList.toggle("nara-open-v23", open);
  if (layer) layer.dataset.naraLayerAuthority = "full-viewport-v23";
}

function syncEditor() {
  document.querySelectorAll(".ce-app").forEach((editor) => {
    editor.dataset.editorAuthority = "v23";
  });
}

function sync() {
  const profile = syncDeviceFlags();
  document.querySelectorAll(".sn-shell").forEach((shell) => syncSidebar(shell, profile));
  syncNara();
  syncEditor();
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("click", (event) => {
  const navButton = event.target.closest(".sn-side > nav > button");
  if (!navButton || navButton.dataset.layoutRouteV23 === "true") return;
  const profile = viewportProfile();
  if (!profile.compact) return;
  const shell = navButton.closest(".sn-shell");
  const side = shell?.querySelector(":scope > .sn-side");
  const toggle = shell?.querySelector(":scope > .sn-main > .sn-top .sn-icon");
  if (side && toggle && !side.classList.contains("collapsed")) requestAnimationFrame(() => toggle.click());
}, true);

window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });

schedule();
