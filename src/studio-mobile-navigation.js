const MOBILE_QUERY = "(max-width: 1100px)";
const media = window.matchMedia(MOBILE_QUERY);
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
    if (button.classList.contains("sn-side-close")) return;
    const label = button.querySelector("span")?.textContent?.trim();
    if (!label) return;
    button.setAttribute("title", label);
    button.setAttribute("aria-label", label);
  });
}

function clickToggle(shell) {
  const { toggle } = elements(shell);
  if (toggle) toggle.click();
}

function collapseRail(shell) {
  const { side } = elements(shell);
  if (!side || side.classList.contains("collapsed")) return;
  clickToggle(shell);
}

function ensureCloseButton(shell) {
  const { side } = elements(shell);
  if (!side) return null;
  let close = side.querySelector(":scope > .sn-side-close");
  if (close) return close;
  close = document.createElement("button");
  close.type = "button";
  close.className = "sn-side-close";
  close.setAttribute("aria-label", "Tutup sidebar Studio");
  close.setAttribute("title", "Tutup sidebar");
  close.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>`;
  close.addEventListener("click", () => clickToggle(shell));
  side.append(close);
  return close;
}

function updateShell(shell) {
  const { side, toggle } = elements(shell);
  if (!side || !toggle) return;
  const expanded = !side.classList.contains("collapsed");
  const close = ensureCloseButton(shell);
  side.id ||= "ngeblogging-studio-sidebar";
  shell.classList.toggle("sn-sidebar-expanded", expanded);
  toggle.setAttribute("aria-expanded", String(expanded));
  toggle.setAttribute("aria-controls", side.id);
  toggle.setAttribute("aria-label", expanded ? "Tutup sidebar Studio" : "Buka sidebar Studio");
  toggle.setAttribute("title", expanded ? "Tutup sidebar" : "Buka sidebar");
  if (close) close.hidden = !expanded;
  labelSidebarButtons(side);
}

function attach(shell) {
  if (attachedShells.has(shell)) return;
  const { side, toggle } = elements(shell);
  if (!side || !toggle) return;
  attachedShells.add(shell);
  ensureCloseButton(shell);

  const sideObserver = new MutationObserver(() => updateShell(shell));
  sideObserver.observe(side, { attributes: true, attributeFilter: ["class"] });
  observers.set(shell, sideObserver);

  // Pada layar sempit Studio dimulai dalam bentuk rel ikon, bukan disembunyikan.
  // Semua ikon menu tetap terlihat dan tombol header dapat membukanya kembali.
  if (media.matches && !side.classList.contains("collapsed")) {
    collapseRail(shell);
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
  document.querySelectorAll(".sn-shell").forEach((shell) => {
    const { side } = elements(shell);
    if (side && !side.classList.contains("collapsed")) collapseRail(shell);
  });
});

function handleViewportChange() {
  document.querySelectorAll(".sn-shell").forEach((shell) => {
    if (media.matches) collapseRail(shell);
    updateShell(shell);
  });
}

if (typeof media.addEventListener === "function") media.addEventListener("change", handleViewportChange);
else media.addListener(handleViewportChange);
