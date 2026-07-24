const RELEASE = "studio-production-guard-v10-20260724";
const MOBILE_QUERY = window.matchMedia("(max-width: 760px)");
let scheduled = 0;

function labelOf(node) {
  return node?.querySelector?.("span")?.textContent?.replace(/\s+/g, " ").trim()
    || node?.textContent?.replace(/\s+/g, " ").trim()
    || "";
}

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
  for (const button of [...bottom.querySelectorAll(":scope > button")]) nav.append(button);
  bottom.remove();
  side.dataset.singleMenu = "true";
}

function hideNaraSidebarRoute(side) {
  const route = [...side.querySelectorAll(":scope > nav > button")]
    .find((button) => labelOf(button) === "Nara AI");
  if (!route) return null;
  route.dataset.naraWorkspaceRoute = "true";
  route.hidden = true;
  route.tabIndex = -1;
  route.setAttribute("aria-hidden", "true");
  route.style.setProperty("display", "none", "important");
  return route;
}

function labelSidebar(side) {
  side.querySelectorAll(":scope > nav > button:not([data-nara-workspace-route])").forEach((button) => {
    const label = labelOf(button);
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
    shortcut = document.createElement("button");
    shortcut.className = "sn-site-shortcut";
    shortcut.innerHTML = siteShortcutIcon();
    actions.prepend(shortcut);
  }
  shortcut.type = "button";
  shortcut.setAttribute("aria-label", "Lihat situs dan domain");
  shortcut.setAttribute("title", "Lihat situs");
  if (!shortcut.dataset.boundSiteShortcut) {
    shortcut.dataset.boundSiteShortcut = "true";
    shortcut.addEventListener("click", (event) => {
      event.preventDefault();
      const domainButton = [...side.querySelectorAll(":scope > nav > button")]
        .find((button) => labelOf(button) === "Domain");
      domainButton?.click();
    });
  }
}

function ensureFloatingNara() {
  document.querySelectorAll(".nara-floating-button").forEach((button) => {
    button.hidden = false;
    button.disabled = false;
    button.tabIndex = 0;
    button.dataset.naraLauncher = "primary";
    button.setAttribute("aria-hidden", "false");
    button.setAttribute("aria-label", "Buka Nara AI");
    button.setAttribute("title", "Buka Nara AI");
    button.style.removeProperty("display");
    button.style.removeProperty("visibility");
    button.style.removeProperty("pointer-events");
    button.style.removeProperty("opacity");
  });

  // The floating launcher is the only permanent Nara entry. The top-bar
  // duplicate is removed to prevent overlapping click targets on phones.
  document.querySelectorAll(".sn-top-actions .sn-nara-button").forEach((button) => {
    button.hidden = true;
    button.tabIndex = -1;
    button.setAttribute("aria-hidden", "true");
    button.style.setProperty("display", "none", "important");
  });
}

function setReactTextarea(textarea, value) {
  if (!textarea) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (setter) setter.call(textarea, value);
  else textarea.value = value;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
}

function openNaraWorkspace(tabLabel = "Projects") {
  const shell = document.querySelector(".sn-shell");
  const route = shell?.querySelector('[data-nara-workspace-route="true"]');
  if (!route) return;

  const close = document.querySelector('.nara-assistant-header button[title="Tutup"]');
  close?.click();
  route.click();

  let attempts = 0;
  const selectTab = () => {
    const button = [...document.querySelectorAll(".nw-tabs button")]
      .find((candidate) => candidate.textContent?.trim().toLowerCase() === tabLabel.toLowerCase());
    if (button) {
      button.click();
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      return;
    }
    if (attempts++ < 20) window.setTimeout(selectTab, 80);
  };
  selectTab();
}

function requestQrScan() {
  const textarea = document.querySelector(".nara-composer textarea");
  setReactTextarea(textarea, "Baca kode QR pada gambar ini, salin isi persisnya, lalu jelaskan tujuan tautan atau datanya dengan aman.");
  const camera = document.querySelector('.nara-composer input[type="file"][capture]');
  camera?.click();
}

function shortcutButton(label, action, icon) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.naraCapabilityShortcut = label.toLowerCase();
  button.innerHTML = `${icon}<span>${label}</span>`;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", action);
  return button;
}

function ensureNaraCapabilityShortcuts() {
  const bar = document.querySelector(".nara-context-bar");
  if (!bar || bar.querySelector(".nara-capability-shortcuts")) return;

  const controls = document.createElement("div");
  controls.className = "nara-capability-shortcuts";
  controls.setAttribute("aria-label", "Pusat kemampuan Nara");
  controls.append(
    shortcutButton("Projects", () => openNaraWorkspace("Projects"), "◆"),
    shortcutButton("Memori", () => openNaraWorkspace("Memory"), "◫"),
    shortcutButton("Buat gambar", () => openNaraWorkspace("Images"), "▧"),
    shortcutButton("Plugins", () => openNaraWorkspace("Plugins"), "⬡"),
    shortcutButton("Baca QR", requestQrScan, "⌗"),
  );
  bar.append(controls);
}

async function decodeQrFromInput(input) {
  const file = input.files?.[0];
  if (!file || !file.type.startsWith("image/") || typeof BarcodeDetector !== "function") return;
  try {
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const bitmap = await createImageBitmap(file);
    const results = await detector.detect(bitmap);
    bitmap.close?.();
    const value = results[0]?.rawValue?.trim();
    if (!value) return;
    const textarea = document.querySelector(".nara-composer textarea");
    setReactTextarea(textarea, `Kode QR terbaca: ${value}\n\nPeriksa keamanan dan jelaskan isi kode QR ini.`);
  } catch {
    // Vision provider remains available when the browser has no BarcodeDetector.
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
  hideNaraSidebarRoute(side);
  ensureSiteShortcut(shell, side);
  side.id ||= "ngeblogging-studio-sidebar";
  toggle.dataset.sidebarAuthority = "single";
  toggle.setAttribute("aria-controls", side.id);
  toggle.setAttribute("aria-expanded", String(!side.classList.contains("collapsed")));
  toggle.setAttribute("aria-label", side.classList.contains("collapsed") ? "Perluas menu Studio" : "Ringkas menu Studio");
  toggle.setAttribute("title", side.classList.contains("collapsed") ? "Perluas menu" : "Ringkas menu");
  labelSidebar(side);
}

function apply() {
  document.documentElement.dataset.studioProductionGuard = RELEASE;
  document.querySelectorAll(".sn-shell").forEach(prepareShell);
  ensureSettingsExtras();
  ensureFloatingNara();
  ensureNaraCapabilityShortcuts();
}

function schedule() {
  cancelAnimationFrame(scheduled);
  scheduled = requestAnimationFrame(apply);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "hidden"],
});
window.addEventListener("pageshow", schedule);
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });

document.addEventListener("change", (event) => {
  const input = event.target.closest?.('.nara-composer input[type="file"][accept^="image/"]');
  if (input) decodeQrFromInput(input);
}, true);

document.addEventListener("click", (event) => {
  const navigationButton = event.target.closest(".sn-side nav button:not([data-nara-workspace-route])");
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
