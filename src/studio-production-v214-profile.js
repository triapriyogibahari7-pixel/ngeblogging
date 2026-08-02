import "./studio-production-v214-profile.css";

const RELEASE = "studio-production-v214-profile-20260802";
const SEPARATION_RELEASE = "studio-production-v214-profile-settings-separated-20260802";
const MENU_ID = "ngeblogging-profile-menu-v214";
let bound = false;
let accountFrame = 0;

function sidebarAction(label) {
  const wanted = String(label || "").trim().toLowerCase();
  return [...document.querySelectorAll("#ngeblogging-studio-sidebar button")].find((button) => {
    const text = String(button.textContent || "").replace(/\s+/g," ").trim().toLowerCase();
    return text === wanted || text.startsWith(`${wanted} `);
  }) || null;
}

function ensureMenu() {
  let menu = document.getElementById(MENU_ID);
  if (menu) return menu;
  menu = document.createElement("div");
  menu.id = MENU_ID;
  menu.className = "sn-profile-dropdown-v214";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Menu profil");
  const items = [
    ["profile", "Profil", "Identitas akun"],
    ["settings", "Pengaturan", "Konfigurasi situs"],
    ["logout", "Keluar", "Akhiri sesi akun"],
  ];
  for (const [action,title,description] of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.setAttribute("role", "menuitem");
    if (action === "logout") button.className = "danger";
    const titleNode = document.createElement("b");
    titleNode.textContent = title;
    const descriptionNode = document.createElement("small");
    descriptionNode.textContent = description;
    button.append(titleNode, descriptionNode);
    menu.append(button);
  }
  document.body.append(menu);
  return menu;
}

function trigger() {
  return document.querySelector(".sn-top .sn-avatar") || document.querySelector(".sn-avatar");
}

function positionMenu() {
  const button = trigger();
  const menu = ensureMenu();
  if (!button || menu.hidden) return;
  const rect = button.getBoundingClientRect();
  const right = Math.max(8, window.innerWidth - rect.right);
  const top = Math.min(window.innerHeight - 190, rect.bottom + 8);
  menu.style.setProperty("right", `${right}px`);
  menu.style.setProperty("top", `${Math.max(8,top)}px`);
}

function closeMenu() {
  const menu = ensureMenu();
  menu.hidden = true;
  trigger()?.setAttribute("aria-expanded", "false");
}

function toggleMenu() {
  const menu = ensureMenu();
  const nextOpen = menu.hidden;
  menu.hidden = !nextOpen;
  const button = trigger();
  if (button) {
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-controls", MENU_ID);
    button.setAttribute("aria-expanded", String(nextOpen));
    button.dataset.v214ProfileTrigger = "true";
  }
  if (nextOpen) positionMenu();
}

function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function syncAccountPresentation() {
  accountFrame = 0;
  const mode = document.documentElement.dataset.studioAccountViewV189 || "settings";
  const grid = document.querySelector(".sn-settings-grid");
  const page = grid?.closest(".sn-view-pad");
  if (!page) return;
  const title = page.querySelector(".sn-page-title h1");
  const description = page.querySelector(".sn-page-title p");
  const save = page.querySelector(".sn-save-settings");
  const saveText = save?.lastChild;

  if (mode === "profile") {
    setText(title, "Profil");
    setText(description, "Kelola identitas, biografi, avatar, dan informasi publik akun Anda.");
    setText(saveText, " Simpan profil");
  } else {
    setText(title, "Pengaturan");
    setText(description, "Kelola konfigurasi situs aktif tanpa mencampurkannya dengan profil akun.");
    setText(saveText, " Simpan pengaturan");
  }
  page.dataset.accountSurfaceV214 = mode;
  document.documentElement.dataset.studioProfileSettingsSeparationV214 = SEPARATION_RELEASE;
}

function scheduleAccountPresentation() {
  if (!accountFrame) accountFrame = requestAnimationFrame(syncAccountPresentation);
}

function openAccount(mode) {
  document.documentElement.dataset.studioAccountViewV189 = mode;
  const settings = sidebarAction("Pengaturan");
  if (settings) settings.click();
  closeMenu();
  scheduleAccountPresentation();
}

function handleClick(event) {
  const avatar = event.target.closest?.(".sn-top .sn-avatar,.sn-avatar[data-v214-profile-trigger]");
  if (avatar) {
    event.preventDefault();
    event.stopImmediatePropagation();
    toggleMenu();
    return;
  }

  const sidebarButton = event.target.closest?.("#ngeblogging-studio-sidebar button");
  if (sidebarButton) {
    const label = String(sidebarButton.textContent || "").replace(/\s+/g," ").trim().toLowerCase();
    if (label === "pengaturan" || label.startsWith("pengaturan ")) {
      document.documentElement.dataset.studioAccountViewV189 = "settings";
      scheduleAccountPresentation();
    }
  }

  const menu = event.target.closest?.(`#${MENU_ID}`);
  if (!menu) {
    closeMenu();
    return;
  }
  const action = event.target.closest?.("button[data-action]")?.dataset.action;
  if (!action) return;
  event.preventDefault();
  event.stopPropagation();
  if (action === "profile") openAccount("profile");
  if (action === "settings") openAccount("settings");
  if (action === "logout") {
    closeMenu();
    sidebarAction("Keluar")?.click();
  }
}

function syncProfileMenu() {
  const button = trigger();
  if (button) {
    button.dataset.v214ProfileTrigger = "true";
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-controls", MENU_ID);
    if (!button.hasAttribute("aria-expanded")) button.setAttribute("aria-expanded", "false");
  }
  ensureMenu();
  document.documentElement.dataset.studioProfileReleaseV214 = RELEASE;
  scheduleAccountPresentation();
}

function bind() {
  if (bound) return;
  bound = true;
  document.addEventListener("click", handleClick, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  }, true);
  window.addEventListener("resize", () => { if (!ensureMenu().hidden) positionMenu(); }, { passive:true });
  window.addEventListener("orientationchange", () => { if (!ensureMenu().hidden) positionMenu(); }, { passive:true });
}

new MutationObserver(() => {
  syncProfileMenu();
  scheduleAccountPresentation();
}).observe(document.documentElement, {
  childList:true,
  subtree:true,
  attributes:true,
  attributeFilter:["data-studio-account-view-v189"],
});
bind();
syncProfileMenu();
scheduleAccountPresentation();

export { RELEASE, SEPARATION_RELEASE, MENU_ID, sidebarAction, openAccount, syncProfileMenu, syncAccountPresentation };
