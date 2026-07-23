import { supabase, supabaseConfigured } from "./lib/supabase";
import {
  createUserSite,
  getUserProfile,
  listUserSites,
  setActiveSiteId,
  updateUserProfile,
} from "./lib/studio-data";
import "./workspace-profile-bridge.css";

let modal = null;
let activeRequest = 0;

function escapeText(value) {
  return String(value || "");
}

function currentActiveSiteId() {
  try {
    return localStorage.getItem("ngeblogging-active-site-id") || "";
  } catch {
    return "";
  }
}

async function currentUser() {
  if (!supabaseConfigured || !supabase) throw new Error("Masuk ke akun untuk mengelola beberapa situs.");
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.user) throw new Error("Sesi login tidak ditemukan.");
  return data.session.user;
}

function publicSiteUrl(site) {
  return `https://${site.slug}.ngeblogging.com`;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 63);
}

function closeModal() {
  if (!modal) return;
  modal.classList.add("closing");
  const node = modal;
  modal = null;
  window.setTimeout(() => node.remove(), 170);
}

function overlay(title, subtitle = "") {
  closeModal();
  const layer = document.createElement("div");
  layer.className = "workspace-modal-layer";
  layer.innerHTML = `
    <button class="workspace-modal-backdrop" aria-label="Tutup"></button>
    <section class="workspace-modal" role="dialog" aria-modal="true">
      <header>
        <div><small>NGEBLOGGING CLOUD</small><h2></h2><p></p></div>
        <button class="workspace-modal-close" type="button" aria-label="Tutup">×</button>
      </header>
      <div class="workspace-modal-body"></div>
    </section>
  `;
  layer.querySelector("h2").textContent = title;
  layer.querySelector("header p").textContent = subtitle;
  layer.querySelector(".workspace-modal-backdrop").addEventListener("click", closeModal);
  layer.querySelector(".workspace-modal-close").addEventListener("click", closeModal);
  document.body.append(layer);
  modal = layer;
  requestAnimationFrame(() => layer.classList.add("open"));
  return layer.querySelector(".workspace-modal-body");
}

function status(message, kind = "") {
  const box = document.createElement("div");
  box.className = `workspace-status ${kind}`;
  box.textContent = message;
  return box;
}

function siteCard(site, selected) {
  const card = document.createElement("article");
  card.className = `workspace-site-card${selected ? " selected" : ""}`;

  const identity = document.createElement("div");
  identity.className = "workspace-site-identity";
  const badge = document.createElement("span");
  badge.textContent = escapeText(site.name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "NB";
  const copy = document.createElement("div");
  const name = document.createElement("b");
  name.textContent = site.name;
  const url = document.createElement("small");
  url.textContent = `${site.slug}.ngeblogging.com`;
  const description = document.createElement("p");
  description.textContent = site.description || "Belum ada deskripsi situs.";
  copy.append(name, url, description);
  identity.append(badge, copy);

  const metadata = document.createElement("div");
  metadata.className = "workspace-site-meta";
  const role = document.createElement("i");
  role.textContent = site.role || "anggota";
  const publication = document.createElement("i");
  publication.className = site.status === "active" ? "published" : "draft";
  publication.textContent = site.status === "active" ? "Publik" : "Draf";
  metadata.append(role, publication);

  const actions = document.createElement("nav");
  const manage = document.createElement("button");
  manage.type = "button";
  manage.className = selected ? "active" : "";
  manage.textContent = selected ? "Sedang dikelola" : "Kelola";
  manage.disabled = selected;
  manage.addEventListener("click", () => {
    setActiveSiteId(site.id);
    location.reload();
  });
  const visit = document.createElement("a");
  visit.href = publicSiteUrl(site);
  visit.target = "_blank";
  visit.rel = "noopener noreferrer";
  visit.textContent = "Lihat situs";
  const copyUrl = document.createElement("button");
  copyUrl.type = "button";
  copyUrl.textContent = "Salin alamat";
  copyUrl.addEventListener("click", async () => {
    await navigator.clipboard.writeText(publicSiteUrl(site));
    copyUrl.textContent = "Tersalin";
    window.setTimeout(() => { copyUrl.textContent = "Salin alamat"; }, 1500);
  });
  actions.append(manage, visit, copyUrl);

  card.append(identity, metadata, actions);
  return card;
}

function createSiteForm(user, refresh) {
  const form = document.createElement("form");
  form.className = "workspace-create-site";
  form.innerHTML = `
    <div class="workspace-form-heading"><div><b>Buat situs baru</b><p>Setiap situs mendapat subdomain gratis Cloudflare.</p></div><button type="button" class="workspace-form-toggle">Buka formulir</button></div>
    <div class="workspace-create-fields" hidden>
      <label>Nama situs<input name="name" required minlength="2" maxlength="100" placeholder="Contoh: Portal Berita Kalimantan"></label>
      <label>Subdomain<div class="workspace-subdomain-field"><input name="slug" required minlength="3" maxlength="63" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="portal-kalimantan"><span>.ngeblogging.com</span></div></label>
      <label class="wide">Deskripsi<textarea name="description" maxlength="1000" placeholder="Jelaskan tujuan dan isi situs."></textarea></label>
      <label>Jenis situs<select name="blueprint"><option value="blog">Blog</option><option value="news">Portal berita</option><option value="business">Bisnis</option><option value="portfolio">Portofolio</option><option value="community">Komunitas</option><option value="landing">Landing page</option><option value="diary">Diary</option></select></label>
      <div class="workspace-form-actions"><span role="status"></span><button type="submit">Buat situs</button></div>
    </div>
  `;
  const fields = form.querySelector(".workspace-create-fields");
  const toggle = form.querySelector(".workspace-form-toggle");
  const nameInput = form.elements.name;
  const slugInput = form.elements.slug;
  let manualSlug = false;
  toggle.addEventListener("click", () => {
    fields.hidden = !fields.hidden;
    toggle.textContent = fields.hidden ? "Buka formulir" : "Tutup formulir";
    if (!fields.hidden) nameInput.focus();
  });
  nameInput.addEventListener("input", () => {
    if (!manualSlug) slugInput.value = slugify(nameInput.value);
  });
  slugInput.addEventListener("input", () => {
    manualSlug = true;
    slugInput.value = slugify(slugInput.value);
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    const message = form.querySelector('[role="status"]');
    submit.disabled = true;
    message.textContent = "Membuat situs…";
    message.className = "";
    try {
      const created = await createUserSite({
        userId: user.id,
        name: nameInput.value,
        slug: slugInput.value,
        description: form.elements.description.value,
        blueprint: form.elements.blueprint.value,
      });
      message.textContent = `Situs ${created.name} berhasil dibuat.`;
      message.className = "success";
      await refresh(created.id);
    } catch (error) {
      console.error("Site creation failed", error);
      message.textContent = error.message || "Situs belum dapat dibuat.";
      message.className = "error";
      submit.disabled = false;
    }
  });
  return form;
}

async function openWorkspaceManager() {
  const requestId = ++activeRequest;
  const body = overlay("Situs saya", "Kelola semua situs, subdomain gratis, dan alamat publik dari satu tempat.");
  body.append(status("Memuat daftar situs…"));
  try {
    const user = await currentUser();
    const render = async (newActiveId = "") => {
      const sites = await listUserSites(user.id);
      if (!modal || requestId !== activeRequest) return;
      if (newActiveId) setActiveSiteId(newActiveId);
      const selectedId = newActiveId || currentActiveSiteId() || sites[0]?.id;
      body.replaceChildren();
      const overview = document.createElement("div");
      overview.className = "workspace-overview";
      overview.innerHTML = `<b>${sites.length} situs</b><span>${sites.filter((site) => site.status === "active").length} publik · ${sites.filter((site) => site.status !== "active").length} draf</span>`;
      const grid = document.createElement("div");
      grid.className = "workspace-sites-grid";
      for (const site of sites) grid.append(siteCard(site, site.id === selectedId));
      body.append(overview, grid, createSiteForm(user, render));
    };
    await render();
  } catch (error) {
    console.error("Workspace manager failed", error);
    if (modal && requestId === activeRequest) body.replaceChildren(status(error.message || "Daftar situs belum dapat dimuat.", "error"));
  }
}

function textField(label, name, value, options = {}) {
  const wrapper = document.createElement("label");
  wrapper.textContent = label;
  const control = options.multiline ? document.createElement("textarea") : document.createElement("input");
  control.name = name;
  control.value = value || "";
  if (options.placeholder) control.placeholder = options.placeholder;
  if (options.maxLength) control.maxLength = options.maxLength;
  if (options.type) control.type = options.type;
  wrapper.append(control);
  return wrapper;
}

async function openProfileManager() {
  const requestId = ++activeRequest;
  const body = overlay("Profil & biografi", "Identitas ini digunakan pada Studio, tim, dan halaman publik yang mendukung profil penulis.");
  body.append(status("Memuat profil…"));
  try {
    const user = await currentUser();
    const profile = await getUserProfile(user.id) || {};
    if (!modal || requestId !== activeRequest) return;

    const form = document.createElement("form");
    form.className = "workspace-profile-form";
    const avatar = document.createElement("div");
    avatar.className = "workspace-profile-avatar";
    if (profile.avatar_url) {
      const image = document.createElement("img");
      image.src = profile.avatar_url;
      image.alt = profile.display_name || "Avatar";
      avatar.append(image);
    } else {
      avatar.textContent = (profile.display_name || user.email || "NB").split(/\s+|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    }

    const fields = document.createElement("div");
    fields.className = "workspace-profile-fields";
    fields.append(
      textField("Nama tampilan", "displayName", profile.display_name || user.user_metadata?.full_name || "", { maxLength: 120 }),
      textField("Alamat situs pribadi", "website", profile.website || "", { type: "url", placeholder: "https://...", maxLength: 500 }),
      textField("URL avatar", "avatarUrl", profile.avatar_url || "", { type: "url", placeholder: "https://...", maxLength: 2000 }),
      textField("Biografi", "bio", profile.bio || "", { multiline: true, maxLength: 2000, placeholder: "Ceritakan keahlian, tujuan, dan perjalanan Anda." }),
    );
    const localeRow = document.createElement("div");
    localeRow.className = "workspace-profile-row";
    const locale = document.createElement("label");
    locale.innerHTML = '<span>Bahasa</span><select name="locale"><option value="id-ID">Bahasa Indonesia</option><option value="en-US">English</option></select>';
    locale.querySelector("select").value = profile.locale || "id-ID";
    const timezone = document.createElement("label");
    timezone.innerHTML = '<span>Zona waktu</span><select name="timezone"><option value="Asia/Jakarta">Asia/Jakarta (WIB)</option><option value="Asia/Makassar">Asia/Makassar (WITA)</option><option value="Asia/Jayapura">Asia/Jayapura (WIT)</option></select>';
    timezone.querySelector("select").value = profile.timezone || "Asia/Jakarta";
    localeRow.append(locale, timezone);
    fields.append(localeRow);

    const footer = document.createElement("footer");
    const message = document.createElement("span");
    message.setAttribute("role", "status");
    const save = document.createElement("button");
    save.type = "submit";
    save.textContent = "Simpan profil";
    footer.append(message, save);
    form.append(avatar, fields, footer);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      save.disabled = true;
      message.textContent = "Menyimpan…";
      message.className = "";
      try {
        await updateUserProfile(user.id, {
          displayName: form.elements.displayName.value,
          website: form.elements.website.value,
          avatarUrl: form.elements.avatarUrl.value,
          bio: form.elements.bio.value,
          locale: form.elements.locale.value,
          timezone: form.elements.timezone.value,
        });
        message.textContent = "Profil dan biografi tersimpan.";
        message.className = "success";
        save.disabled = false;
      } catch (error) {
        console.error("Profile update failed", error);
        message.textContent = error.message || "Profil belum dapat disimpan.";
        message.className = "error";
        save.disabled = false;
      }
    });

    body.replaceChildren(form);
  } catch (error) {
    console.error("Profile manager failed", error);
    if (modal && requestId === activeRequest) body.replaceChildren(status(error.message || "Profil belum dapat dimuat.", "error"));
  }
}

document.addEventListener("click", (event) => {
  const workspace = event.target.closest?.(".workspace-switch");
  if (workspace) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openWorkspaceManager();
    return;
  }
  const avatar = event.target.closest?.(".avatar-lg");
  if (avatar) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openProfileManager();
  }
}, true);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal) closeModal();
});
