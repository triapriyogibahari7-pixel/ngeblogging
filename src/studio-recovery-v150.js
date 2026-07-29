import { loadAnalytics } from "./studio-analytics-v41.js";
import { createUserSite, listUserSites, setActiveSiteId } from "./lib/studio-data.js";
import { supabase, supabaseConfigured } from "./lib/supabase.js";

const RELEASE = "studio-recovery-v150-20260729";
const ONBOARDING_PREFIX = "ngeblogging-first-site-v150:";
const BLUEPRINTS = [
  ["blog", "Blog", "Artikel, kategori, tag, penulis, dan arsip."],
  ["website", "Website", "Halaman bisnis, layanan, kontak, dan navigasi."],
  ["news", "Portal berita", "Redaksi, berita, topik, dan publikasi cepat."],
  ["portfolio", "Portofolio", "Karya, studi kasus, layanan, dan profil."],
  ["forum", "Forum", "Diskusi, topik, anggota, dan moderasi."],
  ["community", "Komunitas", "Anggota, aktivitas, konten, dan interaksi."],
  ["landing", "Landing page", "Kampanye, produk, formulir, dan konversi."],
  ["profile", "Profil", "Identitas pribadi atau profesional yang lengkap."],
  ["knowledge", "Knowledge base", "Dokumentasi, panduan, dan pusat bantuan."],
];

let frame = 0;
let analyticsHost = null;
let onboardingBusy = false;
let sessionRefreshBusy = false;

function safeGet(key) {
  try { return localStorage.getItem(key) || ""; } catch { return ""; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage tidak boleh memblokir Studio */ }
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function activeMenuLabel() {
  return document.querySelector(".sn-side nav button.active span")?.textContent?.trim() || "";
}

function currentView() {
  return document.querySelector(".sn-shell > .sn-main > .sn-view-pad");
}

function restoreAnalytics() {
  if (activeMenuLabel() !== "Analitik") {
    analyticsHost = null;
    return;
  }
  const view = currentView();
  if (!view || view === analyticsHost) return;
  const title = view.querySelector(".sn-page-title h1")?.textContent?.trim();
  if (title !== "Analitik") return;
  analyticsHost = view;
  document.documentElement.dataset.studioOperationsV41 = "true";
  view.dataset.analyticsRecovery = RELEASE;
  loadAnalytics(view, 30, false);
}

function closeProfileMenu() {
  document.querySelector(".sn-profile-menu-v150")?.remove();
  document.querySelector(".sn-avatar")?.setAttribute("aria-expanded", "false");
}

function openSettings() {
  document.querySelector(".sn-account-settings-v135")?.click();
  closeProfileMenu();
}

function openProfileMenu(avatar) {
  const existing = document.querySelector(".sn-profile-menu-v150");
  if (existing) {
    closeProfileMenu();
    return;
  }
  const actions = avatar.closest(".sn-top-actions");
  if (!actions) return;
  const menu = document.createElement("div");
  menu.className = "sn-profile-menu-v150";
  menu.setAttribute("role", "menu");
  menu.innerHTML = `
    <button type="button" role="menuitem" data-action="profile"><span>Profil</span><small>Identitas dan biografi</small></button>
    <button type="button" role="menuitem" data-action="settings"><span>Pengaturan</span><small>Situs, bahasa, dan zona waktu</small></button>
    <button type="button" role="menuitem" data-action="logout"><span>Keluar</span><small>Akhiri sesi pada perangkat ini</small></button>`;
  menu.addEventListener("click", (event) => {
    const action = event.target.closest("button")?.dataset.action;
    if (action === "profile" || action === "settings") openSettings();
    if (action === "logout") {
      closeProfileMenu();
      document.querySelector(".sn-account-logout-v135")?.click();
    }
  });
  actions.append(menu);
  avatar.setAttribute("aria-haspopup", "menu");
  avatar.setAttribute("aria-expanded", "true");
  menu.querySelector("button")?.focus();
}

function bindProfileMenu() {
  const avatar = document.querySelector(".sn-avatar");
  if (!avatar || avatar.dataset.profileMenuV150) return;
  avatar.dataset.profileMenuV150 = RELEASE;
  avatar.setAttribute("aria-label", "Buka menu profil");
  avatar.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openProfileMenu(avatar);
  }, true);
}

function addLayoutButton() {
  const actions = document.querySelector(".tn-hero-actions");
  if (!actions || actions.querySelector(".tn-edit-layout-v150")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tn-edit-layout-v150";
  button.textContent = "Edit Tata Letak";
  button.addEventListener("click", () => {
    const map = document.querySelector(".tn-layout-studio");
    map?.scrollIntoView({ behavior: "smooth", block: "start" });
    map?.setAttribute("tabindex", "-1");
    setTimeout(() => map?.focus({ preventScroll: true }), 350);
  });
  const htmlButton = [...actions.querySelectorAll("button")].find((node) => /Edit HTML/i.test(node.textContent));
  actions.insertBefore(button, htmlButton || null);
}

function recentAutomaticSite(sites) {
  if (sites.length !== 1) return null;
  const site = sites[0];
  const created = new Date(site.created_at || 0).getTime();
  const recent = Number.isFinite(created) && Date.now() - created < 45 * 60 * 1000;
  const automatic = site.settings?.onboarding === "theme-studio";
  return recent && automatic ? site : null;
}

function onboardingMarkup(defaultName, defaultSlug) {
  return `
    <div class="sn-onboarding-layer-v150" role="dialog" aria-modal="true" aria-label="Buat situs pertama">
      <section class="sn-onboarding-v150">
        <header><small>LANGKAH PERTAMA</small><h1>Buat ruang digital Anda.</h1><p>Pilih tujuan situs. Semua pilihan tetap mendapat Posts, Pages, Tema, Media, Analitik, Anggota, Komentar, Domain, API Keys, serta Nara AI.</p></header>
        <div class="sn-onboarding-blueprints-v150">${BLUEPRINTS.map(([id, label, description], index) => `<button type="button" data-blueprint="${id}" class="${index === 0 ? "active" : ""}"><b>${label}</b><span>${description}</span><i>✓</i></button>`).join("")}</div>
        <div class="sn-onboarding-fields-v150">
          <label>Nama situs<input name="name" value="${defaultName.replaceAll('"', '&quot;')}" maxlength="100"/></label>
          <label>Subdomain<div><input name="slug" value="${defaultSlug.replaceAll('"', '&quot;')}" maxlength="80"/><span>.ngeblogging.com</span></div></label>
          <label class="wide">Deskripsi<textarea name="description" maxlength="1000" placeholder="Jelaskan tujuan situs Anda."></textarea></label>
        </div>
        <p class="sn-onboarding-error-v150" role="alert"></p>
        <footer><span>Gratis untuk memulai · HTTPS · sitemap · feed · schema</span><button type="button" class="primary">Buat dan buka Studio</button></footer>
      </section>
    </div>`;
}

async function saveOnboarding(layer, user, sites) {
  if (onboardingBusy) return;
  const name = layer.querySelector('[name="name"]')?.value?.trim() || "";
  const slug = slugify(layer.querySelector('[name="slug"]')?.value || name);
  const description = layer.querySelector('[name="description"]')?.value?.trim() || "";
  const blueprint = layer.querySelector("[data-blueprint].active")?.dataset.blueprint || "blog";
  const errorNode = layer.querySelector(".sn-onboarding-error-v150");
  const submit = layer.querySelector("footer button");
  if (name.length < 2) { errorNode.textContent = "Nama situs minimal 2 karakter."; return; }
  if (slug.length < 3) { errorNode.textContent = "Subdomain minimal 3 karakter."; return; }

  onboardingBusy = true;
  submit.disabled = true;
  submit.textContent = "Membuat situs…";
  errorNode.textContent = "";
  try {
    const latestSites = await listUserSites(user.id);
    const automatic = recentAutomaticSite(latestSites) || recentAutomaticSite(sites);
    let selected;
    if (automatic) {
      const availability = await supabase.rpc("is_site_slug_available", { candidate: slug, excluding_site: automatic.id });
      if (availability.error) throw availability.error;
      if (!availability.data) throw new Error("Subdomain sudah digunakan atau termasuk nama sistem.");
      const settings = { ...(automatic.settings || {}), onboarding: "complete-v150", onboarding_completed_at: new Date().toISOString() };
      const result = await supabase.from("sites").update({ name, slug, description, blueprint, settings }).eq("id", automatic.id).select("id").single();
      if (result.error) throw result.error;
      selected = { id: automatic.id };
    } else {
      selected = await createUserSite({ userId: user.id, name, slug, description, blueprint });
    }
    setActiveSiteId(selected.id);
    safeSet(`${ONBOARDING_PREFIX}${user.id}`, "complete");
    layer.remove();
    window.location.reload();
  } catch (error) {
    errorNode.textContent = error.message || "Situs belum dapat dibuat. Periksa koneksi lalu coba lagi.";
    submit.disabled = false;
    submit.textContent = "Buat dan buka Studio";
  } finally {
    onboardingBusy = false;
  }
}

async function maybeShowOnboarding() {
  if (!supabaseConfigured || !supabase || !document.querySelector(".sn-shell") || document.querySelector(".sn-onboarding-layer-v150")) return;
  const sessionResult = await supabase.auth.getSession().catch(() => ({ data: {} }));
  const user = sessionResult.data?.session?.user;
  if (!user || safeGet(`${ONBOARDING_PREFIX}${user.id}`) === "complete") return;
  const sites = await listUserSites(user.id).catch(() => []);
  if (sites.length && !recentAutomaticSite(sites)) {
    safeSet(`${ONBOARDING_PREFIX}${user.id}`, "complete");
    return;
  }
  const baseName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Situs Saya";
  const defaultName = `${baseName} — Ngeblogging`;
  const defaultSlug = `${slugify(baseName) || "situs"}-${String(user.id).replaceAll("-", "").slice(0, 6)}`;
  document.body.insertAdjacentHTML("beforeend", onboardingMarkup(defaultName, defaultSlug));
  const layer = document.querySelector(".sn-onboarding-layer-v150");
  layer.querySelectorAll("[data-blueprint]").forEach((button) => button.addEventListener("click", () => {
    layer.querySelectorAll("[data-blueprint]").forEach((node) => node.classList.toggle("active", node === button));
  }));
  const nameInput = layer.querySelector('[name="name"]');
  const slugInput = layer.querySelector('[name="slug"]');
  let slugTouched = false;
  slugInput.addEventListener("input", () => { slugTouched = true; slugInput.value = slugify(slugInput.value); });
  nameInput.addEventListener("input", () => { if (!slugTouched) slugInput.value = slugify(nameInput.value); });
  layer.querySelector("footer button").addEventListener("click", () => saveOnboarding(layer, user, sites));
}

async function refreshSessionIfNeeded() {
  if (!supabaseConfigured || !supabase || sessionRefreshBusy) return;
  sessionRefreshBusy = true;
  try {
    const result = await supabase.auth.getSession();
    const session = result.data?.session;
    if (!session) return;
    const expiresAt = Number(session.expires_at || 0) * 1000;
    if (expiresAt && expiresAt - Date.now() < 12 * 60 * 1000) {
      const refreshed = await supabase.auth.refreshSession(session);
      if (!refreshed.error && refreshed.data?.session) document.documentElement.dataset.authSessionV150 = "refreshed";
    } else {
      document.documentElement.dataset.authSessionV150 = "persistent";
    }
  } catch {
    document.documentElement.dataset.authSessionV150 = "retained-offline";
  } finally {
    sessionRefreshBusy = false;
  }
}

function scan() {
  frame = 0;
  bindProfileMenu();
  addLayoutButton();
  restoreAnalytics();
  maybeShowOnboarding();
  document.documentElement.dataset.studioRecoveryV150 = RELEASE;
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(scan);
}

new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener("click", (event) => {
  if (!event.target.closest(".sn-profile-menu-v150,.sn-avatar")) closeProfileMenu();
});
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeProfileMenu(); });
window.addEventListener("pageshow", () => { schedule(); refreshSessionIfNeeded(); }, { passive: true });
window.addEventListener("online", refreshSessionIfNeeded, { passive: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshSessionIfNeeded(); });

schedule();
refreshSessionIfNeeded();

export { RELEASE, restoreAnalytics, refreshSessionIfNeeded };
