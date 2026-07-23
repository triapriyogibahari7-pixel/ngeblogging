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

function setDocumentLock(open) {
  document.body?.classList.toggle("sn-mobile-sidebar-lock", Boolean(open));
}

function updateShell(shell) {
  const { side, toggle } = elements(shell);
  if (!side || !toggle) return;
  const open = media.matches && !side.classList.contains("collapsed");
  shell.classList.toggle("sn-mobile-sidebar-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-controls", side.id || "ngeblogging-studio-sidebar");
  toggle.setAttribute("aria-label", open ? "Tutup menu Studio" : "Buka menu Studio");
  side.id ||= "ngeblogging-studio-sidebar";
  const backdrop = shell.querySelector(":scope > .sn-sidebar-backdrop");
  if (backdrop) {
    backdrop.hidden = !open;
    backdrop.setAttribute("aria-hidden", String(!open));
  }
  setDocumentLock(open);
}

function clickToggle(shell) {
  const { toggle } = elements(shell);
  if (toggle) toggle.click();
}

function closeDrawer(shell) {
  const { side } = elements(shell);
  if (!media.matches || !side || side.classList.contains("collapsed")) return;
  clickToggle(shell);
}

function ensureBackdrop(shell) {
  let backdrop = shell.querySelector(":scope > .sn-sidebar-backdrop");
  if (backdrop) return backdrop;
  backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.className = "sn-sidebar-backdrop";
  backdrop.hidden = true;
  backdrop.tabIndex = -1;
  backdrop.setAttribute("aria-label", "Tutup menu Studio");
  backdrop.addEventListener("click", () => closeDrawer(shell));
  shell.append(backdrop);
  return backdrop;
}

function attach(shell) {
  if (attachedShells.has(shell)) return;
  const { side, toggle } = elements(shell);
  if (!side || !toggle) return;
  attachedShells.add(shell);
  ensureBackdrop(shell);

  const sideObserver = new MutationObserver(() => updateShell(shell));
  sideObserver.observe(side, { attributes: true, attributeFilter: ["class"] });
  observers.set(shell, sideObserver);

  shell.addEventListener("click", (event) => {
    if (!media.matches) return;
    const menuAction = event.target.closest(".sn-side nav button,.sn-side-bottom button,.sn-new");
    if (!menuAction) return;
    window.setTimeout(() => closeDrawer(shell), 0);
  });

  // Studio historically starts with the desktop sidebar open. On a narrow screen,
  // close it immediately so content never remains trapped behind the drawer.
  if (media.matches && !side.classList.contains("collapsed")) {
    clickToggle(shell);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      updateShell(shell);
      document.body?.classList.add("sn-mobile-nav-ready");
    }));
  } else {
    updateShell(shell);
    document.body?.classList.add("sn-mobile-nav-ready");
  }
}

function scan() {
  const shells = [...document.querySelectorAll(".sn-shell")];
  shells.forEach(attach);
  if (!shells.length) {
    setDocumentLock(false);
    // Keep the drawer visually suppressed on narrow screens until React mounts
    // and the controller has synchronized the real sidebar state.
    document.body?.classList.toggle("sn-mobile-nav-ready", !media.matches);
  }
}

const rootObserver = new MutationObserver(scan);
rootObserver.observe(document.documentElement, { childList: true, subtree: true });
scan();

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !media.matches) return;
  document.querySelectorAll(".sn-shell.sn-mobile-sidebar-open").forEach(closeDrawer);
});

function handleViewportChange() {
  const shells = [...document.querySelectorAll(".sn-shell")];
  if (!shells.length) document.body?.classList.toggle("sn-mobile-nav-ready", !media.matches);
  shells.forEach((shell) => {
    if (media.matches) closeDrawer(shell);
    else updateShell(shell);
  });
}

if (typeof media.addEventListener === "function") media.addEventListener("change", handleViewportChange);
else media.addListener(handleViewportChange);
