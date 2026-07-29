const RELEASE = "studio-recovery-v131-20260729";
const V130_SIZE_KEY = "ngeblogging-nara-panel-size-v130";
const V131_MIGRATION_KEY = "ngeblogging-nara-panel-size-v131-migrated";
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

function removeDuplicateNaraSidebar() {
  document.querySelectorAll(".sv124-side nav button,.sn-side nav button").forEach((button) => {
    if (labelOf(button).toLowerCase() !== "nara ai") return;
    button.dataset.naraSidebarDuplicate = "true";
    button.hidden = true;
    button.setAttribute("aria-hidden", "true");
    button.tabIndex = -1;
  });
}

function migrateNaraSize() {
  if (!physicalPhone()) return;
  try {
    if (localStorage.getItem(V131_MIGRATION_KEY) === RELEASE) return;
    localStorage.setItem(V130_SIZE_KEY, "compact");
    localStorage.setItem(V131_MIGRATION_KEY, RELEASE);
  } catch {
    // Storage is optional; DOM authority below still applies.
  }
}

function applyCompactDefault() {
  const shell = document.querySelector(".nara-assistant-shell");
  if (!(shell instanceof HTMLElement)) return;
  if (!shell.dataset.naraSize || (physicalPhone() && shell.dataset.naraSize === "full")) {
    shell.dataset.naraSize = "compact";
    shell.closest(".nara-assistant-layer")?.setAttribute("data-nara-size", "compact");
    shell.querySelectorAll(".nara-window-controls button[data-size]").forEach((button) => {
      const active = button.dataset.size === "compact";
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  } else {
    shell.closest(".nara-assistant-layer")?.setAttribute("data-nara-size", shell.dataset.naraSize);
  }
}

function sync() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    migrateNaraSize();
    removeDuplicateNaraSidebar();
    applyCompactDefault();
    document.documentElement.dataset.studioRecoveryV131 = RELEASE;
  });
}

new MutationObserver(sync).observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-nara-size"],
});
window.addEventListener("resize", sync, { passive: true });
window.addEventListener("orientationchange", sync, { passive: true });
window.addEventListener("pageshow", sync, { passive: true });
sync();
