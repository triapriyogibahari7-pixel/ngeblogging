const RELEASE = "studio-runtime-rail-v13-20260724";
const COMPACT_QUERY = "(max-width: 1024px)";
const PHONE_QUERY = "(max-width: 760px)";
const compactMedia = window.matchMedia(COMPACT_QUERY);
const phoneMedia = window.matchMedia(PHONE_QUERY);
const attachedShells = new WeakSet();
const observers = new WeakMap();

function phoneMode() {
  return phoneMedia.matches || document.documentElement.dataset.deviceMode === "mobile";
}

function compactMode() {
  return compactMedia.matches || phoneMode();
}

function elements(shell) {
  return {
    side: shell.querySelector(":scope > .sn-side"),
    main: shell.querySelector(":scope > .sn-main"),
    toggle: shell.querySelector(":scope > .sn-main .sn-icon"),
  };
}

function important(node, property, value) {
  if (!node) return;
  node.style.setProperty(property, value, "important");
}

function phoneRail() {
  return window.innerWidth <= 360 ? 52 : 56;
}

function panelWidth() {
  if (phoneMode()) return Math.max(220, Math.min(Math.round(window.innerWidth * 0.78), 264));
  if (compactMode()) return Math.min(Math.round(window.innerWidth * 0.82), 288);
  return 240;
}

function railWidth() {
  return phoneMode() ? phoneRail() : 72;
}

function enforceGeometry(shell, expanded) {
  const { side, main, toggle } = elements(shell);
  if (!side || !main || !toggle) return;

  const rail = railWidth();
  const panel = panelWidth();
  const sideWidth = expanded ? panel : rail;
  const compact = compactMode();
  const mainOffset = compact ? rail : sideWidth;
  const toggleSize = phoneMode() ? 40 : 44;

  shell.dataset.runtimeRail = RELEASE;
  shell.style.setProperty("--sn-runtime-rail", `${rail}px`);
  shell.style.setProperty("--sn-runtime-panel", `${panel}px`);

  important(side, "display", "flex");
  important(side, "left", "0");
  important(side, "right", "auto");
  important(side, "width", `${sideWidth}px`);
  important(side, "min-width", `${sideWidth}px`);
  important(side, "max-width", `${sideWidth}px`);
  important(side, "transform", "translate3d(0,0,0)");
  important(side, "translate", "none");
  important(side, "visibility", "visible");
  important(side, "opacity", "1");
  important(side, "pointer-events", "auto");

  important(main, "margin-left", `${mainOffset}px`);
  important(main, "min-width", "0");
  if (compact) {
    important(main, "width", `calc(100vw - ${rail}px)`);
    important(main, "max-width", `calc(100vw - ${rail}px)`);
  } else {
    important(main, "width", "auto");
    important(main, "max-width", "none");
  }

  important(toggle, "position", "fixed");
  important(toggle, "left", `${sideWidth - Math.round(toggleSize / 2)}px`);
  important(toggle, "width", `${toggleSize}px`);
  important(toggle, "min-width", `${toggleSize}px`);
  important(toggle, "height", `${toggleSize}px`);
  important(toggle, "z-index", "13000");
}

function labelSidebarButtons(side) {
  side.querySelectorAll("button").forEach((button) => {
    const label = button.querySelector("span")?.textContent?.trim();
    if (!label) return;
    button.setAttribute("title", label);
    button.setAttribute("aria-label", label);
  });
}

function syncDocumentState() {
  const anyExpandedCompact = [...document.querySelectorAll(".sn-shell")].some((shell) => {
    const { side } = elements(shell);
    return compactMode() && side && !side.classList.contains("collapsed");
  });
  document.documentElement.classList.toggle("sn-studio-menu-open", anyExpandedCompact);
}

function updateShell(shell) {
  const { side, toggle } = elements(shell);
  if (!side || !toggle) return;
  const expanded = !side.classList.contains("collapsed");
  side.id ||= "ngeblogging-studio-sidebar";
  shell.classList.toggle("sn-sidebar-expanded", expanded);
  shell.classList.toggle("sn-sidebar-compact", compactMode());
  shell.classList.toggle("sn-sidebar-phone", phoneMode());
  toggle.setAttribute("aria-expanded", String(expanded));
  toggle.setAttribute("aria-controls", side.id);
  toggle.setAttribute("aria-label", expanded ? "Tutup menu Studio" : "Buka menu Studio");
  toggle.setAttribute("title", expanded ? "Tutup menu" : "Buka menu");
  labelSidebarButtons(side);
  enforceGeometry(shell, expanded);
  syncDocumentState();
}

function collapseSidebar(shell) {
  const { side, toggle } = elements(shell);
  if (!side || !toggle || side.classList.contains("collapsed")) return;
  toggle.click();
}

function attach(shell) {
  if (attachedShells.has(shell)) return;
  const { side, toggle } = elements(shell);
  if (!side || !toggle) return;
  attachedShells.add(shell);

  side.querySelectorAll(":scope > .sn-side-close").forEach((node) => node.remove());

  const sideObserver = new MutationObserver(() => updateShell(shell));
  sideObserver.observe(side, { attributes: true, attributeFilter: ["class"] });
  observers.set(shell, sideObserver);

  if (compactMode() && !side.classList.contains("collapsed")) {
    collapseSidebar(shell);
    window.requestAnimationFrame(() => updateShell(shell));
  } else {
    updateShell(shell);
  }
}

function scan() {
  document.documentElement.dataset.studioRuntimeRail = RELEASE;
  document.querySelectorAll(".sn-shell").forEach(attach);
  syncDocumentState();
}

const rootObserver = new MutationObserver(scan);
rootObserver.observe(document.getElementById("root") || document.documentElement, { childList: true, subtree: true });
scan();

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.querySelectorAll(".sn-shell").forEach(collapseSidebar);
});

// Closing an expanded drawer must never cancel the user's intended click.
// In particular, the same tap must still open the floating Nara assistant.
document.addEventListener("pointerdown", (event) => {
  if (!compactMode()) return;
  document.querySelectorAll(".sn-shell").forEach((shell) => {
    const { side, toggle } = elements(shell);
    if (!side || !toggle || side.classList.contains("collapsed")) return;
    if (side.contains(event.target) || toggle.contains(event.target)) return;
    collapseSidebar(shell);
  });
}, true);

function handleViewportChange() {
  document.querySelectorAll(".sn-shell").forEach((shell) => {
    if (compactMode()) collapseSidebar(shell);
    updateShell(shell);
  });
}

window.addEventListener("resize", handleViewportChange, { passive: true });
window.addEventListener("orientationchange", handleViewportChange, { passive: true });
if (typeof compactMedia.addEventListener === "function") compactMedia.addEventListener("change", handleViewportChange);
else compactMedia.addListener(handleViewportChange);

if (typeof phoneMedia.addEventListener === "function") phoneMedia.addEventListener("change", handleViewportChange);
else phoneMedia.addListener(handleViewportChange);

window.addEventListener("ngeblogging:device-mode", handleViewportChange);
