import "./studio-account-surface-v189.css";

const RELEASE = "studio-account-surface-v189-20260801";
let surface = "settings";
let openingProfile = false;
let frame = 0;

function closeMenus() {
  document.querySelectorAll(".sn-profile-menu-v150,.sn-profile-menu-v147").forEach((node) => node.remove());
  document.querySelector(".sn-avatar")?.setAttribute("aria-expanded", "false");
}

function applySurface() {
  frame = 0;
  const settingsButton = document.querySelector(".sn-account-settings-v135");
  const grid = document.querySelector(".sn-settings-grid");
  const page = grid?.closest(".sn-view-pad");
  if (!grid || !page || !settingsButton?.classList.contains("active")) return;

  page.dataset.accountSurfaceV189 = surface;
  page.dataset.accountSurfaceRelease = RELEASE;
  const title = page.querySelector(".sn-page-title h1");
  const description = page.querySelector(".sn-page-title p");
  if (surface === "profile") {
    if (title) title.textContent = "Profil";
    if (description) description.textContent = "Identitas publik, biografi, avatar, dan situs profil pengguna.";
  } else {
    if (title) title.textContent = "Pengaturan";
    if (description) description.textContent = "Konfigurasi situs aktif, bahasa, zona waktu, dan preferensi workspace.";
  }
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(applySurface);
}

document.addEventListener("click", (event) => {
  const action = event.target.closest(".sn-profile-menu-v150 button[data-action],.sn-profile-menu-v147 button[data-action]")?.dataset.action;
  if (action === "profile") {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openingProfile = true;
    document.querySelector(".sn-account-settings-v135")?.click();
    openingProfile = false;
    surface = "profile";
    closeMenus();
    schedule();
    return;
  }
  if (action === "settings") {
    surface = "settings";
    schedule();
    return;
  }
  if (!openingProfile && event.target.closest(".sn-account-settings-v135")) {
    surface = "settings";
    schedule();
  }
}, true);

new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:["class"] });
window.addEventListener("pageshow", schedule, { passive:true });
schedule();

export { RELEASE, applySurface };