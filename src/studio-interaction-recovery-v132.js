const RELEASE = "studio-interaction-recovery-v132-20260729";
const SIZE_KEY = "ngeblogging-nara-panel-size-v130";
const initializedShells = new WeakSet();
let frame = 0;

function physicalPhone() {
  const root = document.documentElement;
  return root.dataset.physicalScreenMobile === "true"
    || root.dataset.desktopSitePhone === "true"
    || window.matchMedia("(max-width:760px)").matches;
}

function labelOf(button) {
  return button?.querySelector(":scope > span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function removeDuplicateNara() {
  document.querySelectorAll(".sv124-side nav button,.sn-side nav button").forEach((button) => {
    if (labelOf(button).toLowerCase() !== "nara ai") return;
    button.dataset.naraSidebarDuplicate = "true";
    button.hidden = true;
    button.setAttribute("aria-hidden", "true");
    button.tabIndex = -1;
  });
}

function applySize(shell, size) {
  shell.dataset.naraSize = size;
  const layer = shell.closest(".nara-assistant-layer");
  layer?.setAttribute("data-nara-size", size);
  shell.querySelectorAll(".nara-window-controls button[data-size]").forEach((button) => {
    const active = button.dataset.size === size;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  try { localStorage.setItem(SIZE_KEY, size); } catch { /* optional */ }
}

function initializeNara() {
  document.querySelectorAll(".nara-assistant-shell").forEach((shell) => {
    if (!(shell instanceof HTMLElement)) return;
    if (!initializedShells.has(shell)) {
      initializedShells.add(shell);
      /* Every newly opened assistant starts compact on a physical phone. The
         size buttons still work normally after the panel is open. */
      if (physicalPhone()) applySize(shell, "compact");
      else if (!shell.dataset.naraSize) applySize(shell, "compact");

      shell.querySelectorAll(".nara-window-controls button[data-size]").forEach((button) => {
        button.addEventListener("click", () => {
          const size = button.dataset.size;
          if (["compact", "medium", "full"].includes(size)) applySize(shell, size);
        });
      });
    } else {
      const size = shell.dataset.naraSize || "compact";
      shell.closest(".nara-assistant-layer")?.setAttribute("data-nara-size", size);
    }
  });
}

function normalizePhoneSidebar() {
  if (!physicalPhone()) return;
  const shell = document.querySelector(".sv124-shell,.sn-shell");
  const side = shell?.querySelector(":scope > .sv124-side,:scope > .sn-side");
  if (!(shell instanceof HTMLElement) || !(side instanceof HTMLElement)) return;

  /* Preserve the existing open/closed state, but remove stale drawer transforms
     and hidden flags that made the mobile sidebar disappear. */
  side.hidden = false;
  side.removeAttribute("aria-hidden");
  side.style.removeProperty("transform");
  side.style.removeProperty("visibility");
  side.style.removeProperty("opacity");
  side.style.removeProperty("display");

  const collapsed = shell.classList.contains("collapsed") || side.classList.contains("collapsed");
  if (shell.classList.contains("sv124-shell")) {
    shell.classList.toggle("collapsed", collapsed);
    shell.classList.toggle("expanded", !collapsed);
  }
  document.documentElement.dataset.v132PhoneSidebar = collapsed ? "collapsed" : "expanded";
}

function sync() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    removeDuplicateNara();
    initializeNara();
    normalizePhoneSidebar();
    document.documentElement.dataset.studioInteractionRecoveryV132 = RELEASE;
  });
}

new MutationObserver(sync).observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "aria-hidden", "data-nara-size"],
});
window.addEventListener("resize", sync, { passive: true });
window.addEventListener("orientationchange", sync, { passive: true });
window.addEventListener("pageshow", sync, { passive: true });
sync();
