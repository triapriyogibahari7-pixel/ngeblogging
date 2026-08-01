const RELEASE = "studio-production-mobile-v189-account-20260801";
let frame = 0;

function setTextIfChanged(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function setButtonTextIfChanged(button, value) {
  const textNode = button?.lastChild;
  if (textNode && textNode.textContent !== value) textNode.textContent = value;
}

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
    setTextIfChanged(title, "Profil");
    setTextIfChanged(description, "Kelola identitas, biografi, avatar, dan informasi publik akun Anda.");
    setButtonTextIfChanged(save, " Simpan profil");
  } else {
    setTextIfChanged(title, "Profil & pengaturan");
    setTextIfChanged(description, "Identitas pengguna dan situs aktif.");
    setButtonTextIfChanged(save, " Simpan perubahan");
  }

  if (page.dataset.accountSurfaceV189 !== mode) page.dataset.accountSurfaceV189 = mode;
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
