const COMPACT_QUERY = "(max-width: 900px)";
const compactMedia = window.matchMedia(COMPACT_QUERY);
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

function updateShell(shell) {
  const { side, toggle } = elements(shell);
  if (!side || !toggle) return;
  const expanded = !side.classList.contains("collapsed");
  side.id ||= "ngeblogging-studio-sidebar";
  shell.classList.toggle("sn-sidebar-expanded", expanded);
  shell.classList.toggle("sn-sidebar-compact", compactMedia.matches);
  toggle.setAttribute("aria-expanded", String(expanded));
  toggle.setAttribute("aria-controls", side.id);
  toggle.setAttribute("aria-label", expanded ? "Tutup sidebar Studio" : "Buka sidebar Studio");
  toggle.setAttribute("title", expanded ? "Tutup sidebar" : "Buka sidebar");
  labelSidebarButtons(side);
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

  // Remove the duplicate control injected by the previous mobile controller.
  side.querySelectorAll(":scope > .sn-side-close").forEach((node) => node.remove());

  const sideObserver = new MutationObserver(() => updateShell(shell));
  sideObserver.observe(side, { attributes: true, attributeFilter: ["class"] });
  observers.set(shell, sideObserver);

  // Compact screens start as an icon rail. The same React button in the header
  // is the only open/close control on mobile, tablet, laptop, and desktop.
  if (compactMedia.matches && !side.classList.contains("collapsed")) {
    collapseSidebar(shell);
    window.requestAnimationFrame(() => updateShell(shell));
  } else {
    updateShell(shell);
  }
}

function scan() {
  document.querySelectorAll(".sn-shell").forEach(attach);
}

const rootObserver = new MutationObserver(scan);
rootObserver.observe(document.documentElement, { childList: true, subtree: true });
scan();

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.querySelectorAll(".sn-shell").forEach(collapseSidebar);
});

function handleViewportChange() {
  document.querySelectorAll(".sn-shell").forEach((shell) => {
    if (compactMedia.matches) collapseSidebar(shell);
    updateShell(shell);
  });
}

if (typeof compactMedia.addEventListener === "function") compactMedia.addEventListener("change", handleViewportChange);
else compactMedia.addListener(handleViewportChange);
