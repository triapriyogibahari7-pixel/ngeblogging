import "./studio-add-site-v303.css";
import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { setActiveSiteId } from "./lib/studio-data.js";
import { createUserSiteWithPolicy, getSiteQuota } from "./lib/site-policy-v169.js";
import { getVerifiedSession } from "./lib/auth-session-v76.js";

export const STUDIO_ADD_SITE_RELEASE_V303 = "studio-add-site-free-subdomain-v303-20260805";

const BLUEPRINTS = [
  ["blog", "Blog"],
  ["website", "Website"],
  ["news", "Portal berita"],
  ["portfolio", "Portofolio"],
  ["forum", "Forum"],
  ["community", "Komunitas"],
  ["landing", "Landing page"],
  ["profile", "Profil"],
  ["knowledge", "Knowledge base"],
];

const THEMES = [
  ["editorial-clean", "Editorial bersih"],
  ["modern-blog", "Blog modern"],
  ["news-grid", "Portal berita"],
  ["business-pro", "Bisnis profesional"],
  ["portfolio-focus", "Portofolio fokus"],
  ["community-hub", "Komunitas"],
  ["knowledge-docs", "Dokumentasi"],
  ["landing-conversion", "Landing page"],
];

const LANGUAGES = [
  ["id-ID", "Bahasa Indonesia"],
  ["en-US", "English"],
  ["ms-MY", "Bahasa Melayu"],
];

const TIMEZONES = [
  ["Asia/Jakarta", "WIB — Asia/Jakarta"],
  ["Asia/Makassar", "WITA — Asia/Makassar"],
  ["Asia/Jayapura", "WIT — Asia/Jayapura"],
  ["Asia/Kuala_Lumpur", "Asia/Kuala Lumpur"],
  ["UTC", "UTC"],
];

let layer = null;
let availabilityTimer = 0;
let availabilityRequest = 0;

function normalizeSlug(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

function options(rows) {
  return rows.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
}

function setStatus(message, state = "idle") {
  const node = layer?.querySelector("[data-site-v303-status]");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function closeCreateSite() {
  if (!layer) return;
  window.clearTimeout(availabilityTimer);
  layer.remove();
  layer = null;
  document.documentElement.classList.remove("site-create-v303-open");
}

function closeLegacySiteSurface() {
  document.querySelectorAll(".sn-profile-menu-v298,.sn-profile-menu-v295").forEach((node) => node.remove());
  document.querySelector(".sn-avatar")?.setAttribute("aria-expanded", "false");
  const legacy = document.querySelector(".sn-modal-layer .sn-site-manager");
  legacy?.closest(".sn-modal-layer")?.querySelector(".sn-modal-backdrop")?.click();
}

async function currentUserId() {
  const handed = window.__ngebloggingVerifiedSession;
  if (handed?.user?.id) return handed.user.id;
  const verified = await getVerifiedSession();
  if (verified?.user?.id) return verified.user.id;
  throw Object.assign(new Error("Sesi akun belum siap. Silakan coba lagi tanpa keluar dari akun."), { code: "SITE_V303_SESSION_NOT_READY" });
}

async function checkAvailability(slug) {
  const request = ++availabilityRequest;
  if (slug.length < 3) {
    setStatus("Subdomain minimal 3 karakter.", "idle");
    return false;
  }
  if (!supabaseConfigured || !supabase) {
    setStatus("Koneksi pembuatan situs belum tersedia. Sesi akun tetap aktif.", "error");
    return false;
  }
  setStatus("Memeriksa subdomain gratis…", "checking");
  try {
    const { data, error } = await supabase.rpc("is_site_slug_available", { candidate: slug, excluding_site: null });
    if (request !== availabilityRequest) return false;
    if (error) throw error;
    if (data === true) {
      setStatus(`${slug}.ngeblogging.com tersedia dan dapat digunakan gratis.`, "available");
      return true;
    }
    setStatus("Subdomain sudah digunakan atau termasuk nama sistem.", "unavailable");
    return false;
  } catch (error) {
    if (request === availabilityRequest) setStatus(error?.message || "Ketersediaan subdomain belum dapat diperiksa.", "error");
    return false;
  }
}

function publishActiveSite(site, userId) {
  if (!site?.id || !site?.slug) return;
  const snapshot = {
    ...site,
    __userId: userId,
    __savedAt: Date.now(),
    __release: STUDIO_ADD_SITE_RELEASE_V303,
  };
  setActiveSiteId(site.id);
  try { localStorage.setItem("ngeblogging-active-site-snapshot-v292", JSON.stringify(snapshot)); } catch { /* optional storage */ }
  window.__ngebloggingActiveSite = site;
  document.documentElement.dataset.activeSiteId = site.id;
  document.documentElement.dataset.activeSiteSlug = site.slug;
  document.documentElement.dataset.studioAddSiteV303 = STUDIO_ADD_SITE_RELEASE_V303;
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-ready", { detail: site }));
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-change", { detail: site }));
  window.dispatchEvent(new CustomEvent("ngeblogging:site-created-v303", { detail: site }));
}

async function configureCreatedSite(site, draft) {
  if (!supabaseConfigured || !supabase || !site?.id) return site;
  const settings = {
    ...(site.settings || {}),
    onboarding: "complete-v303",
    onboarding_completed_at: new Date().toISOString(),
    initial_theme: draft.themeKey,
    locale: draft.locale,
    timezone: draft.timezone,
    free_subdomain: true,
  };
  const { data, error } = await supabase.from("sites")
    .update({ theme_key: draft.themeKey, locale: draft.locale, settings })
    .eq("id", site.id)
    .select("id,name,slug,description,status,is_public,blueprint,theme_key,settings,published_at,created_at,updated_at")
    .single();
  if (error) throw error;
  return { ...data, role: "owner" };
}

async function submitCreateSite(event) {
  event.preventDefault();
  if (!layer) return;
  const form = event.currentTarget;
  const submit = form.querySelector("button[type='submit']");
  const name = String(form.elements.name?.value || "").trim().slice(0, 100);
  const slug = normalizeSlug(form.elements.slug?.value || name);
  const draft = {
    name,
    slug,
    description: String(form.elements.description?.value || "").trim().slice(0, 1000),
    blueprint: String(form.elements.blueprint?.value || "blog"),
    themeKey: String(form.elements.themeKey?.value || "editorial-clean"),
    locale: String(form.elements.locale?.value || "id-ID"),
    timezone: String(form.elements.timezone?.value || "Asia/Jakarta"),
  };

  if (name.length < 2) return setStatus("Nama situs minimal 2 karakter.", "error");
  if (slug.length < 3) return setStatus("Subdomain minimal 3 karakter.", "error");
  if (!await checkAvailability(slug)) return;

  submit.disabled = true;
  submit.dataset.busy = "true";
  submit.textContent = "Membuat situs gratis…";
  setStatus("Membuat situs dan subdomain gratis Anda…", "checking");

  try {
    const userId = await currentUserId();
    const quota = await getSiteQuota(userId);
    if (!quota.canCreate) throw Object.assign(new Error("Batas jumlah situs untuk akun ini telah tercapai."), { code: "SITE_LIMIT_REACHED" });
    const created = await createUserSiteWithPolicy({
      userId,
      name: draft.name,
      slug: draft.slug,
      description: draft.description,
      blueprint: draft.blueprint,
    });
    let selected = created;
    try {
      selected = await configureCreatedSite(created, draft);
    } catch (configureError) {
      console.error("Site v303 post-create configuration failed", configureError);
    }
    publishActiveSite(selected, userId);
    setStatus(`${selected.slug}.ngeblogging.com berhasil dibuat. Membuka Studio…`, "available");
    window.setTimeout(() => {
      closeCreateSite();
      const target = new URL("/studio", window.location.origin);
      target.searchParams.set("site_created", "v303");
      target.searchParams.set("site", selected.id);
      window.location.assign(target.href);
    }, 220);
  } catch (error) {
    console.error("Create site v303 failed", error);
    setStatus(error?.message || "Situs belum dapat dibuat. Sesi akun tidak dihapus.", "error");
    submit.disabled = false;
    delete submit.dataset.busy;
    submit.textContent = "Buat situs gratis";
  }
}

export function openCreateSiteV303() {
  closeLegacySiteSurface();
  closeCreateSite();
  const wrapper = document.createElement("div");
  wrapper.className = "sn-site-create-v303-layer";
  wrapper.dataset.release = STUDIO_ADD_SITE_RELEASE_V303;
  wrapper.innerHTML = `
    <button class="sn-site-create-v303-backdrop" type="button" aria-label="Tutup Tambah situs"></button>
    <section class="sn-site-create-v303" role="dialog" aria-modal="true" aria-labelledby="sn-site-create-v303-title">
      <header>
        <div><small>SITUS BARU</small><h2 id="sn-site-create-v303-title">Tambah situs gratis</h2><p>Buat situs baru dengan alamat <strong>*.ngeblogging.com</strong>. Situs dimulai sebagai draf sampai Anda menerbitkannya.</p></div>
        <button type="button" data-site-v303-close aria-label="Tutup">×</button>
      </header>
      <form>
        <div class="sn-site-create-v303-grid">
          <label><span>Nama situs</span><input name="name" autocomplete="off" maxlength="100" placeholder="Contoh: Catatan Saya" required></label>
          <label><span>Subdomain gratis</span><div class="sn-site-create-v303-domain"><input name="slug" autocomplete="off" maxlength="63" placeholder="catatan-saya" required><strong>.ngeblogging.com</strong></div></label>
          <label><span>Jenis situs</span><select name="blueprint">${options(BLUEPRINTS)}</select></label>
          <label><span>Tema awal</span><select name="themeKey">${options(THEMES)}</select></label>
          <label><span>Bahasa</span><select name="locale">${options(LANGUAGES)}</select></label>
          <label><span>Zona waktu</span><select name="timezone">${options(TIMEZONES)}</select></label>
          <label class="wide"><span>Deskripsi <em>opsional</em></span><textarea name="description" maxlength="1000" placeholder="Jelaskan tujuan situs Anda."></textarea></label>
        </div>
        <div class="sn-site-create-v303-preview"><span>ALAMAT SITUS GRATIS</span><b data-site-v303-preview>nama-situs.ngeblogging.com</b></div>
        <p class="sn-site-create-v303-status" data-site-v303-status data-state="idle">Masukkan nama dan pilih subdomain gratis Anda.</p>
        <footer><button type="button" data-site-v303-close>Batal</button><button class="primary" type="submit">Buat situs gratis</button></footer>
      </form>
    </section>`;
  document.body.append(wrapper);
  layer = wrapper;
  document.documentElement.classList.add("site-create-v303-open");

  const form = wrapper.querySelector("form");
  const nameInput = form.elements.name;
  const slugInput = form.elements.slug;
  const preview = wrapper.querySelector("[data-site-v303-preview]");
  let slugManuallyEdited = false;

  const syncPreview = () => {
    const normalized = normalizeSlug(slugInput.value || nameInput.value);
    preview.textContent = `${normalized || "nama-situs"}.ngeblogging.com`;
    window.clearTimeout(availabilityTimer);
    availabilityTimer = window.setTimeout(() => checkAvailability(normalized), 360);
  };

  nameInput.addEventListener("input", () => {
    if (!slugManuallyEdited) slugInput.value = normalizeSlug(nameInput.value);
    syncPreview();
  });
  slugInput.addEventListener("input", () => {
    slugManuallyEdited = true;
    const caret = slugInput.selectionStart;
    slugInput.value = normalizeSlug(slugInput.value);
    try { slugInput.setSelectionRange(caret, caret); } catch { /* optional */ }
    syncPreview();
  });
  form.addEventListener("submit", submitCreateSite);
  wrapper.querySelectorAll("[data-site-v303-close],.sn-site-create-v303-backdrop").forEach((node) => node.addEventListener("click", closeCreateSite));
  nameInput.focus({ preventScroll: true });
}

function interceptedAddSiteClick(event) {
  const target = event.target?.closest?.(
    ".sn-add-site-v298,.sn-profile-menu-v298 button[data-profile-action='add-site'],.sn-profile-menu-v295 button[data-profile-action='add-site']",
  );
  if (!target) return;
  event.preventDefault();
  event.stopPropagation();
  openCreateSiteV303();
}

function onKeydown(event) {
  if (event.key === "Escape" && layer) closeCreateSite();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.__ngebloggingOpenCreateSiteV303 = openCreateSiteV303;
  window.addEventListener("click", interceptedAddSiteClick, true);
  window.addEventListener("ngeblogging:open-create-site", openCreateSiteV303);
  document.addEventListener("keydown", onKeydown, true);
  document.documentElement.dataset.studioAddSiteV303 = STUDIO_ADD_SITE_RELEASE_V303;
}
