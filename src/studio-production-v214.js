import "./studio-production-v214.css";

const RELEASE = "studio-production-v214-20260802";
const RESPONSIVE_MODES = new Set(["application", "phone", "mobile", "compact", "tablet", "desktop"]);
const SMALL_MODES = new Set(["application", "phone", "mobile", "compact"]);
let frame = 0;
let profileMenuNode = null;

function mode() {
  const root = document.documentElement;
  const candidate = root.dataset.studioResponsiveMode || "";
  if (RESPONSIVE_MODES.has(candidate)) return candidate;
  if (root.dataset.studioDeviceMode === "small") return window.innerWidth <= 430 ? "phone" : "mobile";
  if (window.innerWidth <= 760) return "compact";
  if (window.innerWidth <= 1180) return "tablet";
  return "desktop";
}

function variant(currentMode) {
  const root = document.documentElement;
  if (currentMode !== "desktop") return currentMode;
  const candidate = root.dataset.studioDeviceVariant || "";
  if (candidate === "laptop" || candidate === "computer") return candidate;
  return window.innerWidth <= 1536 ? "laptop" : "computer";
}

function setImportant(node, property, value) {
  if (!node) return;
  if (node.style.getPropertyValue(property) === value && node.style.getPropertyPriority(property) === "important") return;
  node.style.setProperty(property, value, "important");
}

function normalizeRoot() {
  const root = document.documentElement;
  const currentMode = mode();
  root.dataset.studioProductionV214 = RELEASE;
  root.dataset.studioV214Mode = currentMode;
  root.dataset.studioV214Variant = variant(currentMode);
  root.dataset.studioV214Layout = SMALL_MODES.has(currentMode) ? "small" : "large";
}

function normalizeSidebar() {
  const root = document.documentElement;
  const sidebar = document.getElementById("ngeblogging-studio-sidebar");
  const main = document.querySelector(".sn-main");
  const backdrop = document.querySelector(".sn-side-backdrop");
  const toggle = document.querySelector(".sn-sidebar-toggle");
  if (!sidebar) return;

  sidebar.dataset.v214Mode = root.dataset.studioV214Mode || mode();
  sidebar.dataset.v214Layout = root.dataset.studioV214Layout || "large";
  sidebar.removeAttribute("inert");
  sidebar.removeAttribute("aria-hidden");
  sidebar.querySelectorAll("button,a").forEach((control) => control.removeAttribute("inert"));

  for (const node of [sidebar, toggle]) {
    if (!node) continue;
    setImportant(node, "animation", "none");
    setImportant(node, "filter", "none");
  }

  if (root.dataset.studioV214Layout === "small") {
    if (main) {
      setImportant(main, "transform", "none");
      setImportant(main, "filter", "none");
      setImportant(main, "opacity", "1");
      main.removeAttribute("inert");
      main.removeAttribute("aria-hidden");
    }
    if (backdrop) {
      setImportant(backdrop, "background", "transparent");
      setImportant(backdrop, "backdrop-filter", "none");
      setImportant(backdrop, "-webkit-backdrop-filter", "none");
      setImportant(backdrop, "filter", "none");
    }
  }
}

function normalizeLayoutMap() {
  const currentMode = mode();
  document.querySelectorAll(".tn-layout-canvas-v170[data-v212-layout-map]").forEach((map) => {
    map.dataset.v214Mode = currentMode;
    map.dataset.v214Adaptive = currentMode === "phone" || currentMode === "application"
      ? "single-column"
      : currentMode === "mobile" || currentMode === "compact"
        ? "paired-small"
        : "large-map";

    const content = map.querySelector(":scope > .content-main");
    if (content) {
      content.dataset.v214LockedContent = "true";
      content.setAttribute("aria-disabled", "true");
      content.setAttribute("tabindex", "-1");
      content.setAttribute("title", "Konten utama Post/Page — bukan slot widget");
      const badge = content.querySelector(":scope > span");
      const title = content.querySelector(":scope > small");
      const description = content.querySelector(":scope > b");
      if (badge) badge.textContent = "POST / PAGE";
      if (title) title.textContent = "Konten utama";
      if (description) description.textContent = "Area tulisan utama tetap penuh; widget aktif berada di area sekeliling sesuai perangkat.";
    }
  });
}

function closeProfileMenu() {
  profileMenuNode?.remove();
  profileMenuNode = null;
  document.documentElement.dataset.studioV214ProfileMenu = "closed";
  const avatar = document.querySelector(".sn-avatar");
  avatar?.setAttribute("aria-expanded", "false");
}

function navigateSettings(section) {
  const root = document.documentElement;
  root.dataset.studioV214SettingsSection = section;
  const button = document.querySelector(".sn-account-settings-v135");
  if (!button) return;
  button.dataset.v214RequestedSection = section;
  button.click();
  queueMicrotask(() => { delete button.dataset.v214RequestedSection; schedule(); });
}

function openProfileMenu() {
  closeProfileMenu();
  const avatar = document.querySelector(".sn-avatar");
  if (!avatar) return;
  const menu = document.createElement("div");
  menu.id = "ngeblogging-profile-menu-v214";
  menu.className = "sn-profile-menu-v214";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Menu profil");
  menu.innerHTML = `
    <button type="button" role="menuitem" data-v214-profile-action="profile"><span aria-hidden="true">P</span><b>Profil</b></button>
    <button type="button" role="menuitem" data-v214-profile-action="settings"><span aria-hidden="true">⚙</span><b>Pengaturan</b></button>
    <button type="button" role="menuitem" class="danger" data-v214-profile-action="logout"><span aria-hidden="true">↪</span><b>Keluar</b></button>`;
  document.body.append(menu);
  profileMenuNode = menu;
  document.documentElement.dataset.studioV214ProfileMenu = "open";
  avatar.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => menu.querySelector("button")?.focus({ preventScroll:true }));
}

function normalizeSettingsSection() {
  const grid = document.querySelector(".sn-settings-grid");
  if (!grid) return;
  const root = document.documentElement;
  const section = root.dataset.studioV214SettingsSection === "profile" ? "profile" : "site";
  const page = grid.closest(".sn-view-pad");
  if (!page) return;
  page.dataset.v214SettingsSection = section;
  const title = page.querySelector(":scope > .sn-page-title h1");
  const description = page.querySelector(":scope > .sn-page-title p");
  if (title) title.textContent = section === "profile" ? "Profil" : "Pengaturan";
  if (description) description.textContent = section === "profile"
    ? "Identitas akun, biografi, website, avatar, bahasa, dan zona waktu."
    : "Konfigurasi situs aktif dipisahkan dari identitas profil Anda.";
  const save = page.querySelector(".sn-save-settings");
  if (save) save.dataset.v214SaveSection = section;
}

function normalizeProfileMenu() {
  const avatar = document.querySelector(".sn-avatar");
  if (avatar) {
    avatar.dataset.v214ProfileTrigger = "true";
    avatar.setAttribute("aria-label", "Buka menu profil");
    avatar.setAttribute("aria-haspopup", "menu");
    avatar.setAttribute("aria-controls", "ngeblogging-profile-menu-v214");
    avatar.setAttribute("aria-expanded", String(Boolean(profileMenuNode)));
  }
  normalizeSettingsSection();
}

function normalizeNara() {
  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(":scope > .nara-assistant-shell");
  if (!layer || !shell) return;
  const size = shell.dataset.naraSize || "small";
  const full = size === "full";
  shell.dataset.v214Mode = mode();
  shell.dataset.v214Size = size;
  if (!full) {
    setImportant(layer, "pointer-events", "none");
    setImportant(layer, "background", "transparent");
    setImportant(layer, "backdrop-filter", "none");
    setImportant(shell, "pointer-events", "auto");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }
}

function normalizeContainment() {
  document.querySelectorAll([
    ".sn-main", ".sn-main>*", ".sn-view-pad", ".sn-view-pad>*",
    ".sc161-content-page", ".sc161-content-card", ".sc161-table-wrap",
    ".ce-app", ".ce-workspace", ".ce-paper-shell", ".ce-sidebar",
    ".tn-studio", ".tn-layout-studio", ".tn-layout-canvas-v170", ".tn-code-workspace",
    ".mv176-page", ".sv124-page", ".sn-api-page", ".op41-panel", ".op41-card",
  ].join(",")).forEach((node) => {
    setImportant(node, "min-width", "0");
    setImportant(node, "max-width", "100%");
  });
}

function sync() {
  frame = 0;
  normalizeRoot();
  normalizeSidebar();
  normalizeLayoutMap();
  normalizeProfileMenu();
  normalizeNara();
  normalizeContainment();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(sync);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList:true,
  subtree:true,
  attributes:true,
  attributeFilter:[
    "class", "hidden", "aria-expanded", "data-nara-size",
    "data-studio-responsive-mode", "data-studio-device-mode", "data-studio-device-variant",
  ],
});
for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) {
  window.addEventListener(eventName, schedule, { passive:true });
}
window.visualViewport?.addEventListener?.("resize", schedule, { passive:true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  if (target.closest('.tn-layout-canvas-v170[data-v212-layout-map] > .content-main')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }

  const avatar = target.closest(".sn-avatar");
  if (avatar) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (profileMenuNode) closeProfileMenu(); else openProfileMenu();
    return;
  }

  const action = target.closest("[data-v214-profile-action]")?.dataset.v214ProfileAction;
  if (action) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeProfileMenu();
    if (action === "profile") navigateSettings("profile");
    else if (action === "settings") navigateSettings("site");
    else if (action === "logout") document.querySelector(".sn-account-logout-v135")?.click();
    return;
  }

  const settingsButton = target.closest(".sn-account-settings-v135");
  if (settingsButton) {
    const requested = settingsButton.dataset.v214RequestedSection;
    document.documentElement.dataset.studioV214SettingsSection = requested === "profile" ? "profile" : "site";
    closeProfileMenu();
    requestAnimationFrame(schedule);
    return;
  }

  if (profileMenuNode && !target.closest(".sn-profile-menu-v214")) closeProfileMenu();
}, true);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && profileMenuNode) {
    event.preventDefault();
    closeProfileMenu();
    document.querySelector(".sn-avatar")?.focus({ preventScroll:true });
  }
});

sync();

export {
  RELEASE,
  RESPONSIVE_MODES,
  SMALL_MODES,
  mode,
  variant,
  normalizeSidebar,
  normalizeLayoutMap,
  normalizeProfileMenu,
  normalizeSettingsSection,
  normalizeNara,
  normalizeContainment,
  openProfileMenu,
  closeProfileMenu,
  navigateSettings,
  sync,
};
