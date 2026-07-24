const RELEASE = "studio-production-guard-v8-20260724";
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

function mergeSidebarMenus(side) {
  const nav = side.querySelector(":scope > nav");
  const bottom = side.querySelector(":scope > .sn-side-bottom");
  if (!nav || !bottom) return;

  for (const button of [...bottom.querySelectorAll(":scope > button")]) {
    const label = button.querySelector("span")?.textContent?.trim()?.toLowerCase();
    if (label === "pengaturan") button.dataset.sidebarSection = "settings";
    if (label === "keluar") button.dataset.sidebarSection = "exit";
    nav.append(button);
  }
  bottom.remove();
  side.dataset.singleMenu = "true";
}

function labelSidebar(side) {
  side.querySelectorAll("button").forEach((button) => {
    const label = button.querySelector("span")?.textContent?.trim();
    if (!label) return;
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  });
}

function siteShortcutIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>Lihat situs</span>';
}

function ensureSiteShortcut(shell, side) {
  const actions = shell.querySelector(":scope > .sn-main > .sn-top .sn-top-actions");
  if (!actions) return;
  let shortcut = actions.querySelector(":scope > .sn-site-shortcut");
  if (!shortcut) {
    shortcut = actions.querySelector(":scope > button:first-child") || document.createElement("button");
    if (!shortcut.parentElement) actions.prepend(shortcut);
    shortcut.classList.add("sn-site-shortcut");
    shortcut.innerHTML = siteShortcutIcon();
  }
  shortcut.type = "button";
  shortcut.setAttribute("aria-label", "Lihat situs dan domain");
  shortcut.setAttribute("title", "Lihat situs");
  if (!shortcut.dataset.boundSiteShortcut) {
    shortcut.dataset.boundSiteShortcut = "true";
    shortcut.addEventListener("click", (event) => {
      event.preventDefault();
      const domainButton = [...side.querySelectorAll(":scope > nav > button")].find((button) => button.textContent?.trim() === "Domain");
      domainButton?.click();
    });
  }
}

function prepareShell(shell) {
  removeLegacyMobileNavigation(shell);
  shell.dataset.productionGuard = RELEASE;

  const side = shell.querySelector(":scope > .sn-side");
  const main = shell.querySelector(":scope > .sn-main");
  const toggle = main?.querySelector(":scope > .sn-top .sn-icon");
  if (!side || !toggle) return;

  mergeSidebarMenus(side);
  ensureSiteShortcut(shell, side);
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

// Every Studio section begins at the top. On phones the sidebar also closes
// after choosing a destination so it never covers the selected page.
document.addEventListener("click", (event) => {
  const navigationButton = event.target.closest(".sn-side nav button");
  if (!navigationButton) return;
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const shell = navigationButton.closest(".sn-shell");
    const side = shell?.querySelector(":scope > .sn-side");
    const toggle = shell?.querySelector(":scope > .sn-main > .sn-top .sn-icon");
    if (MOBILE_QUERY.matches && side && toggle && !side.classList.contains("collapsed")) toggle.click();
  });
}, true);

schedule();
