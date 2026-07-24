const RELEASE = "studio-production-guard-v7-20260724";
const MOBILE_QUERY = window.matchMedia("(max-width: 760px)");
let scheduled = 0;

function ensureSettingsExtras() {
  const saveButton = document.querySelector(".sn-save-settings");
  if (!saveButton) return null;

  let extras = document.getElementById("ngeblogging-settings-extras");
  if (!extras) {
    extras = document.createElement("div");
    extras.id = "ngeblogging-settings-extras";
    extras.className = "sn-settings-extras";
    saveButton.insertAdjacentElement("afterend", extras);
  }

  for (const id of ["ngeblogging-site-favicon-settings", "ngeblogging-backup-settings"]) {
    const node = document.getElementById(id);
    if (node && node.parentElement !== extras) extras.append(node);
  }

  return extras;
}

function removeLegacyMobileNavigation(shell) {
  shell.querySelectorAll(":scope > .sn-mobile-nav, :scope > .sn-mobile-sheet-layer").forEach((node) => node.remove());
  shell.querySelectorAll(":scope > .sn-side > .sn-side-close").forEach((node) => node.remove());
}

function labelSidebar(side) {
  side.querySelectorAll("button").forEach((button) => {
    const label = button.querySelector("span")?.textContent?.trim();
    if (!label) return;
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });
}

function prepareShell(shell) {
  removeLegacyMobileNavigation(shell);
  shell.dataset.productionGuard = RELEASE;

  const side = shell.querySelector(":scope > .sn-side");
  const main = shell.querySelector(":scope > .sn-main");
  const toggle = main?.querySelector(":scope > .sn-top .sn-icon");
  if (!side || !toggle) return;

  side.id ||= "ngeblogging-studio-sidebar";
  toggle.dataset.sidebarAuthority = "single";
  toggle.setAttribute("aria-controls", side.id);
  toggle.setAttribute("aria-expanded", String(!side.classList.contains("collapsed")));
  toggle.setAttribute("aria-label", side.classList.contains("collapsed") ? "Buka menu Studio" : "Tutup menu Studio");
  toggle.setAttribute("title", side.classList.contains("collapsed") ? "Buka menu" : "Tutup menu");
  labelSidebar(side);

  if (MOBILE_QUERY.matches && !shell.dataset.initialMobileCollapse) {
    shell.dataset.initialMobileCollapse = "true";
    if (!side.classList.contains("collapsed")) toggle.click();
  }
}

function apply() {
  document.documentElement.dataset.studioProductionGuard = RELEASE;
  document.querySelectorAll(".sn-shell").forEach(prepareShell);
  ensureSettingsExtras();
}

function schedule() {
  cancelAnimationFrame(scheduled);
  scheduled = requestAnimationFrame(apply);
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
window.addEventListener("pageshow", schedule);
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });

// Switching Studio sections must always begin at the top. This prevents an old
// scroll position from placing page headings underneath the sticky toolbar.
document.addEventListener("click", (event) => {
  const navigationButton = event.target.closest(".sn-side nav button, .sn-side-bottom button");
  if (!navigationButton) return;
  requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
}, true);

schedule();
