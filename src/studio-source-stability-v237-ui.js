export const UI_RELEASE = "studio-source-stability-v237-ui-20260803";

let frame = 0;

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function settingsView() {
  for (const view of document.querySelectorAll(".sn-view-pad")) {
    const title = view.querySelector(":scope > .sn-page-title h1");
    if (!title || !/profil\s*&\s*pengaturan|pengaturan/i.test(cleanText(title.textContent))) continue;
    const grid = view.querySelector(".sn-settings-grid");
    if (!grid) continue;

    view.dataset.v237RenderedSettings = "site-only";
    title.textContent = "Pengaturan";
    const description = view.querySelector(":scope > .sn-page-title p");
    if (description) description.textContent = "Kelola konfigurasi situs aktif. Profil dan avatar akun dikelola terpisah melalui menu profil di pojok kanan atas.";

    grid.dataset.v237Settings = "site-only-bounded";
    const sections = [...grid.querySelectorAll(":scope > section")];
    for (const section of sections) {
      const heading = cleanText(section.querySelector("h2")?.textContent).toLowerCase();
      if (heading === "profil" || heading.startsWith("profil ")) {
        section.dataset.v237ProfileSection = "moved-to-profile-menu";
        section.hidden = true;
        section.setAttribute("aria-hidden", "true");
        section.style.setProperty("display", "none", "important");
      } else {
        section.hidden = false;
        section.removeAttribute("aria-hidden");
      }
    }

    if (!view.querySelector(".sn-settings-profile-note.v237")) {
      const note = document.createElement("div");
      note.className = "sn-settings-profile-note v237";
      note.setAttribute("role", "note");
      note.innerHTML = "<span>Profil, biografi, website, dan avatar akun tersedia dari tombol profil di pojok kanan atas. Pengaturan halaman ini hanya untuk situs aktif.</span>";
      grid.insertAdjacentElement("afterend", note);
    }
  }
}

function quotaCopy() {
  document.querySelectorAll(".sn-site-capacity").forEach((node) => {
    if (/\d+\s*\/\s*25|25\s*situs/i.test(cleanText(node.textContent))) node.textContent = "Kelola situs dalam akun ini";
    node.dataset.v237Capacity = "internal-limit";
  });
  document.querySelectorAll("button").forEach((button) => {
    if (/batas\s*25\s*situs/i.test(cleanText(button.textContent))) button.textContent = "Batas situs tercapai";
  });
  document.querySelectorAll(".sv124-site-strip i,.sv124-metric b").forEach((node) => {
    const text = cleanText(node.textContent);
    if (/^\d+\s*\/\s*25/.test(text)) node.textContent = text.replace(/\s*\/\s*25/, "");
  });
  document.querySelectorAll(".sv124-metric span").forEach((node) => {
    if (/kapasitas akun/i.test(cleanText(node.textContent))) node.textContent = "Situs dalam akun";
  });
}

function domainCopy() {
  document.querySelectorAll(".sv124-domain-page").forEach((page) => {
    page.dataset.v237DomainRendered = "bounded";
    page.querySelectorAll("button,a").forEach((control) => {
      const text = cleanText(control.textContent).toLowerCase();
      if (/jadikan draf|terbitkan|hubungkan|verifikasi|muat ulang|refresh|salin|hapus|utama|buka/.test(text)) {
        control.dataset.v237DomainAction = "true";
      }
    });
  });
}

function summarySiteAction() {
  document.querySelectorAll(".sp37-active-site,.op41-active-site").forEach((card) => {
    card.dataset.v237SummarySite = "real-site-manager";
    const create = card.querySelector("[data-site-create]");
    if (create) {
      create.textContent = "+ Tambahkan situs";
      create.setAttribute("aria-label", "Tambahkan situs");
    }
  });
}

function profileSurface() {
  document.querySelectorAll(".sn-avatar").forEach((avatar) => {
    avatar.dataset.v237ProfileSurface = "separate";
    avatar.setAttribute("aria-label", "Buka menu profil");
  });
  document.querySelectorAll(".sn-profile-menu-v150").forEach((menu) => menu.dataset.v237ProfileMenu = "profile-settings-add-site-logout");
}

function scan() {
  frame = 0;
  document.documentElement.dataset.studioSourceStabilityUiV237 = UI_RELEASE;
  settingsView();
  quotaCopy();
  domainCopy();
  summarySiteAction();
  profileSurface();
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(scan);
}

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
  attributes: true,
  attributeFilter: ["class", "hidden", "aria-expanded"],
});
window.addEventListener("pageshow", schedule, { passive: true });
window.addEventListener("resize", schedule, { passive: true });
scan();
