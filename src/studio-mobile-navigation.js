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
    toggle: shell.querySelector(":scope > .sn-main .sn-icon"),
  };
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

if (typeof compactMedia.addEventListener === "function") compactMedia.addEventListener("change", handleViewportChange);
else compactMedia.addListener(handleViewportChange);

if (typeof phoneMedia.addEventListener === "function") phoneMedia.addEventListener("change", handleViewportChange);
else phoneMedia.addListener(handleViewportChange);

window.addEventListener("ngeblogging:device-mode", handleViewportChange);
