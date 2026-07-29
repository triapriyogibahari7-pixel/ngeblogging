const RELEASE = "studio-shell-controller-v147-20260729";
const EDGE_TOGGLE_CLASS = "sn-sidebar-edge-toggle-v147";
const PROFILE_MENU_CLASS = "sn-profile-menu-v147";
let frame = 0;
let activeAvatar = null;

function buttonLabel(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.textContent?.trim()
    || "";
}

function findStudioButton(label) {
  const shell = document.querySelector('.sn-shell[data-shell-release="v147"]') || document.querySelector(".sn-shell");
  if (!shell) return null;
  return [...shell.querySelectorAll("button")].find((button) => buttonLabel(button) === label) || null;
}

function closeProfileMenu() {
  document.querySelectorAll(`.${PROFILE_MENU_CLASS}`).forEach((menu) => menu.remove());
  activeAvatar?.setAttribute("aria-expanded", "false");
  activeAvatar = null;
}

function runProfileAction(action) {
  closeProfileMenu();
  if (action === "profile" || action === "settings") {
    findStudioButton("Pengaturan")?.click();
    return;
  }
  if (action === "logout") findStudioButton("Keluar")?.click();
}

function positionProfileMenu(menu, avatar) {
  const rect = avatar.getBoundingClientRect();
  const compact = document.documentElement.dataset.studioDeviceMode === "small";
  if (compact) {
    menu.style.top = `${Math.max(66, rect.bottom + 8)}px`;
    menu.style.right = "12px";
    menu.style.left = "auto";
    return;
  }
  menu.style.top = `${rect.bottom + 10}px`;
  menu.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`;
  menu.style.left = "auto";
}

function openProfileMenu(avatar) {
  closeProfileMenu();
  activeAvatar = avatar;
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-expanded", "true");

  const menu = document.createElement("div");
  menu.className = PROFILE_MENU_CLASS;
  menu.dataset.release = RELEASE;
  menu.setAttribute("role", "menu");
  menu.innerHTML = `
    <div class="sn-profile-menu-head-v147">
      <strong>${avatar.textContent?.trim() || "Profil"}</strong>
      <span>Akun Ngeblogging</span>
    </div>
    <button type="button" role="menuitem" data-action="profile">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>
      <span>Profil</span>
    </button>
    <button type="button" role="menuitem" data-action="settings">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3.1 14H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>
      <span>Pengaturan</span>
    </button>
    <button type="button" role="menuitem" data-action="logout" class="danger">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg>
      <span>Keluar</span>
    </button>`;
  menu.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (button) runProfileAction(button.dataset.action);
  });
  document.body.append(menu);
  positionProfileMenu(menu, avatar);
  requestAnimationFrame(() => menu.querySelector("button")?.focus());
}

function ensureEdgeToggle(shell, sidebar) {
  let toggle = shell.querySelector(`:scope > .${EDGE_TOGGLE_CLASS}`);
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = EDGE_TOGGLE_CLASS;
    toggle.dataset.release = RELEASE;
    toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="m15 9-3 3 3 3"/></svg>';
    toggle.addEventListener("click", () => {
      const reactToggle = shell.querySelector(".sn-sidebar-toggle");
      reactToggle?.click();
      requestAnimationFrame(schedule);
    });
    sidebar.insertAdjacentElement("afterend", toggle);
  }
  const collapsed = sidebar.classList.contains("collapsed");
  toggle.classList.toggle("collapsed", collapsed);
  toggle.setAttribute("aria-label", collapsed ? "Perluas menu Studio" : "Ciutkan menu Studio");
  toggle.setAttribute("title", collapsed ? "Perluas menu Studio" : "Ciutkan menu Studio");
  toggle.setAttribute("aria-expanded", String(!collapsed));
}

function enhanceShell() {
  frame = 0;
  const shell = document.querySelector(".sn-shell");
  if (!shell) return;
  const sidebar = shell.querySelector(":scope > .sn-side");
  const main = shell.querySelector(":scope > .sn-main");
  if (!sidebar || !main) return;

  shell.dataset.shellRelease = "v147";
  shell.dataset.navigationOwner = "react-v147";
  shell.dataset.sidebarState = sidebar.classList.contains("collapsed") ? "collapsed" : "expanded";
  sidebar.dataset.sidebarRelease = "v147";
  main.dataset.mainRelease = "v147";
  const logo = sidebar.querySelector(".sn-logo-mark");
  if (logo) logo.setAttribute("aria-label", "n");
  const activeItem = sidebar.querySelector("nav > button.active span")?.textContent?.trim();
  if (activeItem) shell.dataset.activeView = activeItem.toLowerCase().replace(/\s+/g, "-");
  ensureEdgeToggle(shell, sidebar);
}

function schedule() {
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(enhanceShell);
}

document.addEventListener("click", (event) => {
  const avatar = event.target.closest(".sn-shell .sn-avatar");
  if (avatar) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (activeAvatar === avatar && document.querySelector(`.${PROFILE_MENU_CLASS}`)) closeProfileMenu();
    else openProfileMenu(avatar);
    return;
  }
  if (!event.target.closest(`.${PROFILE_MENU_CLASS}`)) closeProfileMenu();
}, true);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeProfileMenu();
});

window.addEventListener("resize", () => {
  const menu = document.querySelector(`.${PROFILE_MENU_CLASS}`);
  if (menu && activeAvatar) positionProfileMenu(menu, activeAvatar);
  schedule();
}, { passive: true });
window.addEventListener("pageshow", schedule, { passive: true });

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.type === "childList" || mutation.attributeName === "class")) schedule();
}).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class"],
});

schedule();
document.documentElement.dataset.studioShellController = RELEASE;

export { RELEASE, enhanceShell, closeProfileMenu };
