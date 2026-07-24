const RELEASE = "studio-sidebar-v15-20260724";
let frame = 0;

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

function textLabel(button) {
  return button?.querySelector("span")?.textContent?.trim() || button?.textContent?.trim() || "";
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

  let edge = shell.querySelector(":scope > .sn-sidebar-edge-v15");
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

  let scrim = shell.querySelector(":scope > .sn-sidebar-scrim-v15");
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
    button.disabled = true;
    button.tabIndex = -1;
    button.setAttribute("aria-hidden", "true");
    button.dataset.naraWorkspaceRoute = "true";
  });

  shell.querySelectorAll(".sn-mobile-nav, .sn-mobile-sheet-layer, .sn-side-close, .sn-side-bottom")
    .forEach((node) => node.remove());

  shell.querySelectorAll(".sn-top-actions .sn-nara-button, .nara-floating-button").forEach((button) => {
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

document.addEventListener("pointerdown", (event) => {
  if (!deviceProfile().mobile) return;
  const launcher = event.target.closest(".nara-floating-button, .sn-top-actions .sn-nara-button");
  if (!launcher || launcher.disabled) return;
  event.preventDefault();
  event.stopPropagation();
  launcher.click();
}, true);

document.addEventListener("click", (event) => {
  const navButton = event.target.closest(".sn-side nav button");
  if (!navButton || !deviceProfile().mobile) return;
  const shell = navButton.closest(".sn-shell");
  const side = shell?.querySelector(":scope > .sn-side");
  const original = shell?.querySelector(":scope > .sn-main > .sn-top .sn-icon");
  if (side && original && !side.classList.contains("collapsed")) {
    requestAnimationFrame(() => {
      original.click();
      requestAnimationFrame(() => syncShell(shell));
    });
  }
}, true);

window.addEventListener("resize", sync, { passive: true });
window.addEventListener("orientationchange", sync, { passive: true });
window.addEventListener("pageshow", sync, { passive: true });

sync();
