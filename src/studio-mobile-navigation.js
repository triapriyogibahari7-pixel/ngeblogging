const COMPACT_QUERY = "(max-width: 1100px)";
const media = window.matchMedia(COMPACT_QUERY);
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

function removeLegacyDuplicateControls(side) {
  side.querySelectorAll(":scope > .sn-side-close").forEach((button) => button.remove());
}

function updateShell(shell) {
  const { side, toggle } = elements(shell);
  if (!side || !toggle) return;
  removeLegacyDuplicateControls(side);
  const expanded = !side.classList.contains("collapsed");
  side.id ||= "ngeblogging-studio-sidebar";
  shell.classList.toggle("sn-sidebar-expanded", expanded);
  shell.classList.toggle("sn-sidebar-collapsed", !expanded);
  toggle.setAttribute("aria-expanded", String(expanded));
  toggle.setAttribute("aria-controls", side.id);
  toggle.setAttribute("aria-label", expanded ? "Tutup sidebar Studio" : "Buka sidebar Studio");
  toggle.setAttribute("title", expanded ? "Tutup sidebar" : "Buka sidebar");
  labelSidebarButtons(side);
}

function clickToggle(shell) {
  const { toggle } = elements(shell);
  toggle?.click();
}

function collapse(shell) {
  const { side } = elements(shell);
  if (!side || side.classList.contains("collapsed")) return;
  clickToggle(shell);
}

function markReady(shell) {
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    updateShell(shell);
    document.documentElement.classList.add("sn-nav-ready");
  }));
}

function attach(shell) {
  if (attachedShells.has(shell)) return;
  const { side, toggle } = elements(shell);
  if (!side || !toggle) return;
  attachedShells.add(shell);
  removeLegacyDuplicateControls(side);

  const sideObserver = new MutationObserver(() => updateShell(shell));
  sideObserver.observe(side, { attributes: true, attributeFilter: ["class"], childList: true });
  observers.set(shell, sideObserver);

  // Layar sempit dimulai sebagai rel ikon. Sidebar tetap terlihat dan tidak
  // mengurangi lebar konten saat dibuka karena panel melebar sebagai overlay.
  if (media.matches && !side.classList.contains("collapsed")) collapse(shell);
  else updateShell(shell);
  markReady(shell);
}

function scan() {
  document.querySelectorAll(".sn-shell").forEach(attach);
}

const rootObserver = new MutationObserver(scan);
rootObserver.observe(document.documentElement, { childList: true, subtree: true });
scan();

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.querySelectorAll(".sn-shell").forEach(collapse);
});

function handleViewportChange() {
  document.querySelectorAll(".sn-shell").forEach((shell) => {
    if (media.matches) collapse(shell);
    updateShell(shell);
  });
}

if (typeof media.addEventListener === "function") media.addEventListener("change", handleViewportChange);
else media.addListener(handleViewportChange);
