const RELEASE = "studio-device-sidebar-nara-v27-20260725";
const COMPAT_RELEASE = "studio-device-sidebar-nara-v26-20260725";
const ROOT = document.getElementById("root") || document.documentElement;
const MOBILE_MAX = 760;
const TABLET_MAX = 1100;

const SIDEBAR_OPEN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M12 9l3 3-3 3"/></svg>';
const SIDEBAR_CLOSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 9l-3 3 3 3"/></svg>';
const MINI_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 15h8"/></svg>';
const COMPACT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 21h12a2 2 0 0 0 2-2V7"/></svg>';

let frame = 0;

function positiveNumber(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function deviceProfile() {
  const root = document.documentElement;
  const width = positiveNumber(window.innerWidth, document.documentElement.clientWidth || 1);
  const height = positiveNumber(window.innerHeight, document.documentElement.clientHeight || 1);
  const screenWidth = positiveNumber(window.screen?.width, width);
  const screenHeight = positiveNumber(window.screen?.height, height);
  const screenShortSide = Math.min(screenWidth, screenHeight);
  const screenRatio = width / screenWidth;
  const physicalPhone = root.dataset.physicalPhone === "true"
    || root.dataset.physicalScreenMobile === "true"
    || screenShortSide <= MOBILE_MAX;
  const desktopPhone = root.dataset.desktopSitePhone === "true"
    || root.dataset.desktopLayoutRequested === "true"
    || (physicalPhone && width > MOBILE_MAX && (width >= 780 || screenRatio >= 1.18));
  const standalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
  const appleMobile = /iPhone|iPad|iPod/i.test(window.navigator.userAgent || "")
    || (window.navigator.platform === "MacIntel" && Number(window.navigator.maxTouchPoints) > 1);

  let device = "desktop";
  if (desktopPhone) device = "desktop-phone";
  else if (width <= 480) device = "phone";
  else if (width <= MOBILE_MAX) device = "mobile";
  else if (width <= TABLET_MAX) device = "tablet";
  else if (width <= 1440) device = "laptop";

  return {
    width,
    height,
    screenWidth,
    screenHeight,
    physicalPhone,
    desktopPhone,
    standalone,
    appleMobile,
    device,
    compact: device === "phone" || device === "mobile" || device === "tablet",
  };
}

function syncRootFlags(profile) {
  const root = document.documentElement;
  root.dataset.studioDeviceAuthority = RELEASE;
  root.dataset.studioDeviceCompatibility = COMPAT_RELEASE;
  root.dataset.studioShellModeV27 = profile.device;
  root.dataset.studioAppMode = profile.standalone ? "standalone" : "browser";
  root.dataset.studioAppleMobile = String(profile.appleMobile);
  root.dataset.studioPhysicalPhoneV27 = String(profile.physicalPhone);

  for (const name of ["phone", "mobile", "tablet", "desktop-phone", "laptop", "desktop"]) {
    root.classList.toggle(`studio-${name}-v27`, profile.device === name);
  }
  root.classList.toggle("studio-compact-v27", profile.compact);
  root.classList.toggle("studio-desktop-v27", !profile.compact);
  root.classList.toggle("studio-standalone-v27", profile.standalone);
  root.classList.toggle("studio-apple-mobile-v27", profile.appleMobile);
}

function buttonLabel(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.getAttribute("aria-label")?.trim()
    || button?.textContent?.trim()
    || "";
}

function findSourceToggle(shell) {
  return shell.querySelector(":scope > .sn-main > .sn-top > .sn-icon")
    || shell.querySelector(":scope > .sn-main > .sn-top .sn-icon");
}

function clickSourceToggle(shell) {
  const source = findSourceToggle(shell);
  if (!source) return false;
  source.hidden = false;
  source.disabled = false;
  source.click();
  requestAnimationFrame(schedule);
  return true;
}

function ensureNavAccessibility(side) {
  const buttons = [side.querySelector(":scope > .sn-new"), ...side.querySelectorAll(":scope > nav > button")].filter(Boolean);
  buttons.forEach((button) => {
    const label = buttonLabel(button);
    if (!label) return;
    button.setAttribute("aria-label", label);
    button.title = label;
    if (button.getAttribute("aria-hidden") !== "true") {
      button.disabled = false;
      button.tabIndex = 0;
      button.style.removeProperty("pointer-events");
      button.style.removeProperty("visibility");
      button.style.removeProperty("opacity");
    }
  });
}

function disableLegacyScrim(shell) {
  shell.querySelectorAll(":scope > .sn-sidebar-scrim-v23").forEach((scrim) => {
    scrim.hidden = true;
    scrim.disabled = true;
    scrim.tabIndex = -1;
    scrim.setAttribute("aria-hidden", "true");
    scrim.dataset.supersededBy = RELEASE;
  });
}

function ensureScrim(shell, side, profile) {
  disableLegacyScrim(shell);
  let scrim = shell.querySelector(":scope > .sn-device-scrim-v27");
  if (!scrim) {
    scrim = document.createElement("button");
    scrim.type = "button";
    scrim.className = "sn-device-scrim-v27";
    scrim.dataset.deviceScrimOwner = RELEASE;
    scrim.setAttribute("aria-label", "Tutup menu Studio");
    scrim.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const currentShell = scrim.closest(".sn-shell");
      const currentSide = currentShell?.querySelector(":scope > .sn-side");
      if (currentShell && currentSide && !currentSide.classList.contains("collapsed")) clickSourceToggle(currentShell);
    });
    shell.append(scrim);
  }

  const open = !side.classList.contains("collapsed");
  const visible = profile.compact && open;
  scrim.hidden = !visible;
  scrim.disabled = !visible;
  scrim.tabIndex = visible ? 0 : -1;
  scrim.setAttribute("aria-hidden", String(!visible));
}

function ensureEdgeToggle(shell, side, profile) {
  shell.querySelectorAll(":scope > .sn-device-toggle-v26").forEach((node) => node.remove());
  let edge = shell.querySelector(":scope > .sn-device-toggle-v27");
  if (!edge) {
    edge = document.createElement("button");
    edge.type = "button";
    edge.className = "sn-device-toggle-v27";
    edge.dataset.deviceSidebarOwner = RELEASE;
    edge.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const currentShell = edge.closest(".sn-shell");
      if (currentShell) clickSourceToggle(currentShell);
    });
    shell.append(edge);
  }

  const open = !side.classList.contains("collapsed");
  shell.dataset.v27SidebarOpen = String(open);
  shell.dataset.v27SidebarDevice = profile.device;

  const iconState = open ? "close" : "open";
  if (edge.dataset.iconState !== iconState) {
    edge.dataset.iconState = iconState;
    edge.innerHTML = open ? SIDEBAR_CLOSE_ICON : SIDEBAR_OPEN_ICON;
  }

  edge.hidden = !profile.compact;
  edge.disabled = !profile.compact;
  edge.tabIndex = profile.compact ? 0 : -1;
  edge.setAttribute("aria-hidden", String(!profile.compact));
  edge.setAttribute("aria-controls", side.id || "ngeblogging-studio-sidebar");
  edge.setAttribute("aria-expanded", String(open));
  edge.setAttribute("aria-label", open ? "Tutup menu Studio" : "Buka menu Studio");
  edge.title = open ? "Tutup menu" : "Buka menu";
}

function syncSourceToggle(source, profile) {
  source.hidden = false;
  source.disabled = false;
  source.dataset.v27SourceToggle = profile.compact ? "programmatic" : "visible";
  if (profile.compact) {
    source.tabIndex = -1;
    source.setAttribute("aria-hidden", "true");
  } else {
    source.tabIndex = 0;
    source.removeAttribute("aria-hidden");
  }
}

function syncSidebar(shell, profile) {
  const side = shell.querySelector(":scope > .sn-side");
  const sourceToggle = findSourceToggle(shell);
  if (!side || !sourceToggle) return;

  side.id ||= "ngeblogging-studio-sidebar";
  shell.dataset.sidebarAuthorityV27 = RELEASE;
  shell.dataset.v27SidebarDevice = profile.device;
  ensureNavAccessibility(side);
  syncSourceToggle(sourceToggle, profile);
  ensureEdgeToggle(shell, side, profile);
  ensureScrim(shell, side, profile);
}

function baseNaraMode(profile = deviceProfile()) {
  return profile.compact ? "compact" : "desktop";
}

function naraSizeButtonState(button, size) {
  const mini = size === "mini";
  const state = mini ? "mini" : "compact";
  if (button.dataset.sizeState !== state) {
    button.dataset.sizeState = state;
    button.innerHTML = mini ? COMPACT_ICON : MINI_ICON;
  }
  button.title = mini ? "Buka kotak Nara lengkap" : "Kecilkan menjadi widget";
  button.setAttribute("aria-label", button.title);
  button.setAttribute("aria-pressed", String(mini));
}

function setNaraSize(layer, size) {
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;
  const resolved = size === "mini" ? "mini" : "compact";
  layer.dataset.naraSizeV26 = resolved;
  layer.dataset.naraSizeV27 = resolved;
  shell.dataset.naraSizeV26 = resolved;
  shell.dataset.naraSizeV27 = resolved;
  document.documentElement.dataset.naraSize = resolved;
  const button = shell.querySelector(":scope .nara-size-toggle-v26");
  if (button) naraSizeButtonState(button, resolved);
}

function leaveExpanded(layer) {
  if (!layer || layer.dataset.naraWindowMode !== "expanded") return;
  const shell = layer.querySelector(":scope > .nara-assistant-shell");
  const mode = baseNaraMode();
  layer.dataset.naraWindowMode = mode;
  if (shell) shell.dataset.naraWindowMode = mode;
  document.documentElement.dataset.naraExpanded = "false";
}

function ensureNaraControls(shell, profile) {
  const layer = shell.closest(".nara-assistant-layer");
  const header = shell.querySelector(":scope > .nara-assistant-header");
  if (!layer || !header) return;

  const close = [...header.querySelectorAll(":scope > button")]
    .find((button) => button.title === "Tutup" || button.getAttribute("aria-label") === "Tutup");
  const expand = header.querySelector(":scope > .nara-window-toggle-v24");
  if (!close || !expand) return;

  expand.classList.add("nara-expand-toggle-v27");
  expand.hidden = false;
  expand.disabled = false;
  expand.tabIndex = 0;
  expand.removeAttribute("aria-hidden");

  let sizeButton = header.querySelector(":scope > .nara-size-toggle-v26");
  if (!sizeButton) {
    sizeButton = document.createElement("button");
    sizeButton.type = "button";
    sizeButton.className = "nara-size-toggle-v26 nara-size-toggle-v27";
    sizeButton.dataset.naraSizeOwner = RELEASE;
    sizeButton.addEventListener("click", () => {
      const currentLayer = sizeButton.closest(".nara-assistant-layer");
      if (!currentLayer) return;
      leaveExpanded(currentLayer);
      const current = currentLayer.dataset.naraSizeV27 === "mini" ? "mini" : "compact";
      setNaraSize(currentLayer, current === "mini" ? "compact" : "mini");
    });
    expand.insertAdjacentElement("beforebegin", sizeButton);
  }

  sizeButton.classList.add("nara-size-toggle-v27");
  sizeButton.hidden = false;
  sizeButton.disabled = false;
  sizeButton.tabIndex = 0;
  sizeButton.removeAttribute("aria-hidden");

  if (!layer.dataset.naraSizeV27 && !layer.dataset.naraSizeV26) {
    setNaraSize(layer, profile.compact ? "mini" : "compact");
  } else {
    setNaraSize(layer, layer.dataset.naraSizeV27 || layer.dataset.naraSizeV26);
  }

  shell.dataset.naraThreeModeOwner = RELEASE;
  layer.dataset.naraThreeModeOwner = RELEASE;
}

function syncNara(profile) {
  document.querySelectorAll(".nara-assistant-shell").forEach((shell) => ensureNaraControls(shell, profile));
}

function sync() {
  const profile = deviceProfile();
  syncRootFlags(profile);
  document.querySelectorAll(".sn-shell").forEach((shell) => syncSidebar(shell, profile));
  syncNara(profile);
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(sync);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.type === "childList" || (mutation.type === "attributes" && mutation.attributeName === "class"))) schedule();
}).observe(ROOT, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

document.addEventListener("click", (event) => {
  const navButton = event.target.closest(".sn-side > nav > button, .sn-side > .sn-new");
  if (!navButton) return;
  const profile = deviceProfile();
  if (!profile.compact) return;
  const shell = navButton.closest(".sn-shell");
  const side = shell?.querySelector(":scope > .sn-side");
  if (shell && side && !side.classList.contains("collapsed")) requestAnimationFrame(() => clickSourceToggle(shell));
}, true);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  const shell = document.querySelector(".sn-shell");
  const side = shell?.querySelector(":scope > .sn-side");
  const profile = deviceProfile();
  if (profile.compact && shell && side && !side.classList.contains("collapsed")) {
    clickSourceToggle(shell);
    return;
  }

  const layer = document.querySelector(".nara-assistant-layer");
  if (!layer) return;
  if (layer.dataset.naraWindowMode === "expanded") {
    layer.querySelector(".nara-window-toggle-v24")?.click();
    return;
  }
  if ((layer.dataset.naraSizeV27 || layer.dataset.naraSizeV26) !== "mini") {
    setNaraSize(layer, "mini");
    return;
  }
  const close = [...layer.querySelectorAll(".nara-assistant-header > button")]
    .find((button) => button.title === "Tutup" || button.getAttribute("aria-label") === "Tutup");
  close?.click();
});

window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });
window.visualViewport?.addEventListener("resize", schedule, { passive: true });

schedule();
