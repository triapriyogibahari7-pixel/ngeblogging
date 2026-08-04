export const RELEASE = "studio-screenshot-authority-v265-20260804-r3";

const SMALL_MODES = new Set(["application", "phone", "mobile", "compact", "small"]);
const LARGE_MODES = new Set(["tablet", "desktop", "laptop", "computer", "large"]);
let frame = 0;

function root() {
  return document.documentElement;
}

function family() {
  const html = root();
  if (html.dataset.studioDesktopSitePhone === "true" || html.dataset.v232ModeLock === "desktop-site-large") return "large";
  const responsive = String(html.dataset.studioResponsiveMode || "").toLowerCase();
  const variant = String(html.dataset.studioDeviceVariant || "").toLowerCase();
  const device = String(html.dataset.studioDeviceMode || "").toLowerCase();
  if (SMALL_MODES.has(responsive)) return "small";
  if (LARGE_MODES.has(responsive) || LARGE_MODES.has(variant)) return "large";
  if (device === "small" || device === "large") return device;
  return Number(document.documentElement.clientWidth || window.innerWidth || 0) <= 760 ? "small" : "large";
}

function closeProfileMenu() {
  document.querySelector(".sn-profile-menu-v150")?.remove();
  const avatar = document.querySelector(".sn-avatar");
  if (avatar) avatar.setAttribute("aria-expanded", "false");
}

function openAccountView(mode) {
  root().dataset.studioAccountViewV189 = mode;
  root().dataset.studioAccountViewV263 = mode;
  const settings = document.querySelector(".sn-account-settings-v135");
  if (settings) settings.click();
  else {
    const sidebarSettings = [...document.querySelectorAll("#ngeblogging-studio-sidebar button")]
      .find((button) => /^\s*Pengaturan\s*$/i.test(button.textContent || ""));
    sidebarSettings?.click();
  }
  closeProfileMenu();
}

function openSiteManager() {
  const workspace = document.querySelector(".sn-workspace");
  if (workspace) {
    workspace.click();
    closeProfileMenu();
    return true;
  }
  const summary = [...document.querySelectorAll("#ngeblogging-studio-sidebar nav button")]
    .find((button) => /Ringkasan/i.test(button.textContent || ""));
  summary?.click();
  closeProfileMenu();
  return false;
}

function openPublicSite() {
  const link = document.querySelector("a.sn-view-site");
  if (link?.href) {
    window.open(link.href, "_blank", "noopener,noreferrer");
    closeProfileMenu();
    return true;
  }
  closeProfileMenu();
  return false;
}

function makeProfileAction(action, title, description) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("role", "menuitem");
  button.dataset.action = action;
  button.innerHTML = `<span>${title}</span><small>${description}</small>`;
  return button;
}

function repairProfileMenu() {
  const menu = document.querySelector(".sn-profile-menu-v150");
  if (!menu) return;
  menu.dataset.profileMenuV265 = "profile-settings-add-site-view-site-install-logout";

  const profile = menu.querySelector('[data-action="profile"]');
  const settings = menu.querySelector('[data-action="settings"]');
  const install = menu.querySelector('[data-action="install"]');
  const logout = menu.querySelector('[data-action="logout"]');

  if (!menu.querySelector('[data-action="add-site"]')) {
    const addSite = makeProfileAction("add-site", "+ Tambahkan situs", "Buat atau kelola situs di akun ini");
    menu.insertBefore(addSite, install || logout || null);
  }
  if (!menu.querySelector('[data-action="view-site"]')) {
    const viewSite = makeProfileAction("view-site", "Lihat situs", "Buka situs aktif di tab baru");
    menu.insertBefore(viewSite, install || logout || null);
  }

  if (profile) {
    profile.querySelector("span") && (profile.querySelector("span").textContent = "Profil & avatar");
    profile.querySelector("small") && (profile.querySelector("small").textContent = "Identitas, avatar, biografi, dan website");
  }
  if (settings) {
    settings.querySelector("span") && (settings.querySelector("span").textContent = "Pengaturan situs");
    settings.querySelector("small") && (settings.querySelector("small").textContent = "Nama situs, bahasa, zona waktu, dan workspace");
  }
  if (install) {
    install.querySelector("span") && (install.querySelector("span").textContent = "Dapatkan aplikasi");
    install.querySelector("small") && (install.querySelector("small").textContent = "Pasang Ngeblogging sebagai PWA");
  }
  if (logout) {
    logout.querySelector("span") && (logout.querySelector("span").textContent = "Keluar");
    logout.querySelector("small") && (logout.querySelector("small").textContent = "Akhiri sesi hanya pada perangkat ini");
  }
}

function repairSidebar() {
  const side = document.getElementById("ngeblogging-studio-sidebar");
  const toggle = document.querySelector(".sn-top .sn-sidebar-toggle");
  if (!side || !toggle) return;

  const mark = side.querySelector(".sn-logo-mark");
  const letter = mark?.querySelector("strong");
  const brand = side.querySelector(".sn-logo > b");
  if (letter && letter.textContent !== "n") letter.textContent = "n";
  if (brand && brand.textContent !== "Ngeblogging") brand.textContent = "Ngeblogging";

  // IMPORTANT: v229/v231/v232 already own the internal logo click and proxy it
  // to React's .sn-sidebar-toggle. Do not add another click/keydown listener here:
  // two owners would toggle twice and make the n appear frozen or laggy.
  if (mark) {
    mark.dataset.sidebarToggleV265 = "single-owner-v232-react-proxy";
    mark.setAttribute("role", "button");
    mark.setAttribute("tabindex", "0");
    mark.setAttribute("aria-controls", "ngeblogging-studio-sidebar");
  }

  const mode = family();
  const expanded = mode === "small" ? side.classList.contains("mobile-open") : !side.classList.contains("collapsed");
  if (mark) {
    mark.setAttribute("aria-expanded", String(expanded));
    mark.setAttribute("aria-label", mode === "small"
      ? (expanded ? "Tutup menu Studio" : "Buka menu Studio")
      : (expanded ? "Ciutkan menu Studio" : "Perluas menu Studio"));
    mark.setAttribute("title", mark.getAttribute("aria-label"));
  }

  toggle.dataset.sidebarAuthorityV265 = RELEASE;
  toggle.setAttribute("aria-expanded", String(expanded));
  root().dataset.studioSidebarFamilyV265 = mode;
  root().dataset.studioSidebarStateV265 = expanded ? "open" : "closed";

  document.querySelectorAll([
    ".sn-sidebar-edge-toggle-v147",
    ".v227-sidebar-fab",
    ".studio-external-sidebar-toggle",
    "[data-v173-collapse-toggle]",
    "[data-v187-sidebar-toggle]",
    "[data-v208-sidebar-toggle]",
    "[data-v223-sidebar-toggle]",
    "[data-v229-sidebar-toggle]",
    "#ngeblogging-studio-chrome-v244",
  ].join(",")).forEach((node) => node.remove());
}

function repairNara() {
  const launcher = document.querySelector(".nara-floating-button");
  if (launcher) launcher.dataset.naraLauncherV265 = "fixed-safe-corner";

  const layer = document.querySelector(".nara-assistant-layer");
  const shell = layer?.querySelector(".nara-assistant-shell");
  if (!layer || !shell) return;
  const size = ["small", "medium", "full"].includes(shell.dataset.naraSize) ? shell.dataset.naraSize : "small";
  const modal = size === "full";
  layer.dataset.naraModalV265 = String(modal);
  layer.setAttribute("aria-modal", String(modal));
  shell.dataset.naraAuthorityV265 = RELEASE;

  const backdrop = layer.querySelector(".nara-assistant-backdrop");
  if (backdrop) {
    backdrop.hidden = !modal;
    backdrop.setAttribute("aria-hidden", String(!modal));
  }

  const attachment = shell.querySelector(".nara-attachment-menu");
  if (attachment) attachment.dataset.naraAttachmentV265 = "camera-photo-file-visible";

  if (!modal) {
    document.body.classList.remove("nara-fullscreen-open-v148");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("touch-action");
    document.body.style.removeProperty("pointer-events");
    document.documentElement.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("touch-action");
  }
}

function clearHistoricalFreeze() {
  const side = document.getElementById("ngeblogging-studio-sidebar");
  const naraShell = document.querySelector(".nara-assistant-shell");
  const naraIsFull = naraShell?.dataset.naraSize === "full";
  if (!naraIsFull) {
    document.querySelector(".sn-main")?.style.removeProperty("pointer-events");
    document.querySelector(".sn-main")?.style.removeProperty("filter");
    document.querySelector(".sn-shell")?.style.removeProperty("filter");
  }
  if (side?.classList.contains("mobile-open")) side.removeAttribute("inert");
}

function sync() {
  frame = 0;
  root().dataset.studioScreenshotAuthorityV265 = RELEASE;
  repairSidebar();
  repairProfileMenu();
  repairNara();
  clearHistoricalFreeze();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    const action = event.target.closest?.(".sn-profile-menu-v150 button[data-action]")?.dataset.action;
    if (action === "profile") {
      event.preventDefault();
      event.stopImmediatePropagation();
      openAccountView("profile");
      return;
    }
    if (action === "settings") {
      event.preventDefault();
      event.stopImmediatePropagation();
      openAccountView("settings");
      return;
    }
    if (action === "add-site") {
      event.preventDefault();
      event.stopImmediatePropagation();
      openSiteManager();
      return;
    }
    if (action === "view-site") {
      event.preventDefault();
      event.stopImmediatePropagation();
      openPublicSite();
      return;
    }
    setTimeout(schedule, 0);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeProfileMenu();
      setTimeout(schedule, 0);
    }
  }, true);

  new MutationObserver((records) => {
    if (records.some((record) => record.type === "childList" || record.type === "attributes")) schedule();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "class", "data-nara-size", "data-studio-responsive-mode", "data-studio-device-mode",
      "data-studio-device-variant", "data-studio-desktop-site-phone",
    ],
  });

  for (const eventName of ["pageshow", "resize", "orientationchange", "online"]) {
    window.addEventListener(eventName, schedule, { passive: true });
  }
  window.visualViewport?.addEventListener("resize", schedule, { passive: true });
  schedule();
}
