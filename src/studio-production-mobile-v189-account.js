const RELEASE = "studio-production-mobile-v189-account-20260804-r2";
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
  const mode = document.documentElement.dataset.studioAccountViewV189 === "profile" ? "profile" : "settings";
  const grid = document.querySelector(".sn-settings-grid");
  const page = grid?.closest(".sn-view-pad");
  if (!page) return;

  const title = page.querySelector(".sn-page-title h1");
  const description = page.querySelector(".sn-page-title p");
  const save = page.querySelector(".sn-save-settings");
  const sections = [...grid.querySelectorAll(":scope>section")];
  const profileSection = sections[0] || null;
  const settingsSection = sections[1] || null;

  page.dataset.accountSurfaceV189 = mode;
  if (mode === "profile") {
    setTextIfChanged(title, "Profil");
    setTextIfChanged(description, "Kelola nama tampilan, biografi, website, dan avatar akun Anda.");
    setButtonTextIfChanged(save, " Simpan profil");
    if (profileSection) {
      profileSection.hidden = false;
      profileSection.removeAttribute("aria-hidden");
    }
    if (settingsSection) {
      settingsSection.hidden = true;
      settingsSection.setAttribute("aria-hidden", "true");
    }
  } else {
    setTextIfChanged(title, "Pengaturan");
    setTextIfChanged(description, "Kelola nama situs, deskripsi, bahasa, zona waktu, dan preferensi situs aktif.");
    setButtonTextIfChanged(save, " Simpan pengaturan");
    if (profileSection) {
      profileSection.hidden = true;
      profileSection.setAttribute("aria-hidden", "true");
    }
    if (settingsSection) {
      settingsSection.hidden = false;
      settingsSection.removeAttribute("aria-hidden");
    }
  }

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