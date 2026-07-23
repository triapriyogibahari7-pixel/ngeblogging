const COMPACT_QUERY = "(max-width: 1024px)";
const PHONE_QUERY = "(max-width: 700px)";
const compactMedia = window.matchMedia(COMPACT_QUERY);
const phoneMedia = window.matchMedia(PHONE_QUERY);
const attachedShells = new WeakSet();
const observers = new WeakMap();

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
    return compactMedia.matches && side && !side.classList.contains("collapsed");
  });
  document.documentElement.classList.toggle("sn-studio-menu-open", anyExpandedCompact);
}

function updateShell(shell) {
  const { side, toggle } = elements(shell);
  if (!side || !toggle) return;
  const expanded = !side.classList.contains("collapsed");
  side.id ||= "ngeblogging-studio-sidebar";
  shell.classList.toggle("sn-sidebar-expanded", expanded);
  shell.classList.toggle("sn-sidebar-compact", compactMedia.matches);
  shell.classList.toggle("sn-sidebar-phone", phoneMedia.matches);
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

  // Legacy controllers used to inject a second close button. The React header
  // control is now the only open/close button at every viewport size.
  side.querySelectorAll(":scope > .sn-side-close").forEach((node) => node.remove());

  const sideObserver = new MutationObserver(() => updateShell(shell));
  sideObserver.observe(side, { attributes: true, attributeFilter: ["class"] });
  observers.set(shell, sideObserver);

  // Phone and tablet sessions start closed. Desktop keeps the user's React
  // state and can still switch between the full panel and icon rail.
  if (compactMedia.matches && !side.classList.contains("collapsed")) {
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
rootObserver.observe(document.documentElement, { childList: true, subtree: true });
scan();

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.querySelectorAll(".sn-shell").forEach(collapseSidebar);
});

// On compact screens, a click outside the open panel closes it and is
// consumed so the obscured page cannot accidentally activate an action.
document.addEventListener("pointerdown", (event) => {
  if (!compactMedia.matches) return;
  document.querySelectorAll(".sn-shell").forEach((shell) => {
    const { side, toggle } = elements(shell);
    if (!side || !toggle || side.classList.contains("collapsed")) return;
    if (side.contains(event.target) || toggle.contains(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    collapseSidebar(shell);
  });
}, true);

function handleViewportChange() {
  document.querySelectorAll(".sn-shell").forEach((shell) => {
    if (compactMedia.matches) collapseSidebar(shell);
    updateShell(shell);
  });
}

if (typeof compactMedia.addEventListener === "function") compactMedia.addEventListener("change", handleViewportChange);
else compactMedia.addListener(handleViewportChange);

if (typeof phoneMedia.addEventListener === "function") phoneMedia.addEventListener("change", handleViewportChange);
else phoneMedia.addListener(handleViewportChange);
