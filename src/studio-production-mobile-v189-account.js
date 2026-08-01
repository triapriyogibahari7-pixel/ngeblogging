const RELEASE = "studio-production-mobile-v189-account-20260801";
let frame = 0;

function syncAccountSurface() {
  frame = 0;
  const mode = document.documentElement.dataset.studioAccountViewV189 || "settings";
  const grid = document.querySelector(".sn-settings-grid");
  const page = grid?.closest(".sn-view-pad");
  if (!page) return;

  const title = page.querySelector(".sn-page-title h1");
  const description = page.querySelector(".sn-page-title p");
  const save = page.querySelector(".sn-save-settings");

  if (mode === "profile") {
    if (title) title.textContent = "Profil";
    if (description) description.textContent = "Kelola identitas, biografi, avatar, dan informasi publik akun Anda.";
    if (save) save.lastChild.textContent = " Simpan profil";
  } else {
    if (title) title.textContent = "Profil & pengaturan";
    if (description) description.textContent = "Identitas pengguna dan situs aktif.";
    if (save) save.lastChild.textContent = " Simpan perubahan";
  }

  page.dataset.accountSurfaceV189 = mode;
  document.documentElement.dataset.studioAccountSurfaceReleaseV189 = RELEASE;
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(syncAccountSurface);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["data-studio-account-view-v189", "class"],
});

window.addEventListener("pageshow", schedule, { passive: true });
schedule();

export { RELEASE, syncAccountSurface };
