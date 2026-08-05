import "./studio-site-switcher-v304.css";
import { ACTIVE_SITE_STORAGE_KEY, setActiveSiteId } from "./lib/studio-data.js";
import { getVerifiedSession } from "./lib/auth-session-v76.js";
import { listUserSitesStartupV292 } from "./studio-startup-v292.js";
import { openCreateSiteV303 } from "./studio-add-site-v303.js";

export const STUDIO_SITE_SWITCHER_RELEASE_V304 = "studio-real-site-switcher-v304-20260805";
export const STUDIO_FIRST_SITE_GUARD_RELEASE_V304 = "studio-first-site-guard-v304-20260805";

const SNAPSHOT_KEYS = [
  "ngeblogging-active-site-snapshot-v292",
  "ngeblogging-active-site-snapshot-v209",
  "ngeblogging-active-site-snapshot-v208",
  "ngeblogging-active-site-snapshot-v205",
  "ngeblogging-active-site-snapshot-v198",
  "ngeblogging-active-site-snapshot-v195",
  "ngeblogging-active-site-snapshot-v192",
];

let layer = null;
let sites = [];
let query = "";
let loadToken = 0;

function closeLegacySiteManager() {
  const legacy = document.querySelector(".sn-modal-layer .sn-site-manager");
  legacy?.closest(".sn-modal-layer")?.querySelector(".sn-modal-backdrop")?.click();
}

function closeProfileMenu() {
  document.querySelectorAll(".sn-profile-menu-v298,.sn-profile-menu-v295").forEach((node) => node.remove());
  document.querySelector(".sn-avatar")?.setAttribute("aria-expanded", "false");
}

export function closeSiteSwitcherV304() {
  if (!layer) return;
  loadToken += 1;
  layer.remove();
  layer = null;
  sites = [];
  query = "";
  document.documentElement.classList.remove("site-switcher-v304-open");
}

async function currentUserId() {
  const handed = window.__ngebloggingVerifiedSession;
  if (handed?.user?.id) return handed.user.id;
  const verified = await getVerifiedSession();
  if (verified?.user?.id) return verified.user.id;
  throw Object.assign(new Error("Sesi akun belum siap. Coba lagi tanpa keluar dari akun."), {
    code: "SITE_SWITCHER_SESSION_NOT_READY",
  });
}

function activeSiteId() {
  const live = window.__ngebloggingActiveSite?.id;
  if (live) return String(live);
  const dataset = document.documentElement.dataset.activeSiteId;
  if (dataset) return String(dataset);
  try { return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; }
  catch { return ""; }
}

function initials(name) {
  return String(name || "Situs").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "NB";
}

function siteState(site) {
  if (site?.status === "active" && site?.is_public === true) return "Publik";
  if (site?.status === "archived") return "Diarsipkan";
  return "Draf";
}

function clearStaleActiveSitePointers() {
  setActiveSiteId("");
  try {
    SNAPSHOT_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage may be unavailable. Never touch auth/session storage here.
  }
  window.__ngebloggingActiveSite = null;
  delete document.documentElement.dataset.activeSiteId;
  delete document.documentElement.dataset.activeSiteSlug;
}

function publishSelectedSite(site, userId) {
  const snapshot = {
    ...site,
    __userId: userId,
    __savedAt: Date.now(),
    __release: STUDIO_SITE_SWITCHER_RELEASE_V304,
  };
  setActiveSiteId(site.id);
  try { localStorage.setItem("ngeblogging-active-site-snapshot-v292", JSON.stringify(snapshot)); }
  catch { /* active-site snapshot is optional; auth/session is untouched */ }
  window.__ngebloggingActiveSite = site;
  document.documentElement.dataset.activeSiteId = site.id;
  document.documentElement.dataset.activeSiteSlug = site.slug || "";
  document.documentElement.dataset.studioSiteSwitcherV304 = STUDIO_SITE_SWITCHER_RELEASE_V304;
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-ready", { detail: site }));
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-change", { detail: site }));
}

function createButton(label, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  return button;
}

function listHost() {
  return layer?.querySelector("[data-site-switcher-list]") || null;
}

function statusNode() {
  return layer?.querySelector("[data-site-switcher-status]") || null;
}

function setStatus(message, state = "idle") {
  const node = statusNode();
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function openFirstSiteOnboarding() {
  clearStaleActiveSitePointers();
  const target = new URL("/studio", window.location.origin);
  target.searchParams.set("first_site", "required-v304");
  window.location.assign(target.href);
}

async function selectSite(site) {
  if (!site?.id) return;
  const current = activeSiteId();
  if (String(site.id) === current) {
    closeSiteSwitcherV304();
    return;
  }
  try {
    setStatus(`Membuka ${site.name || "situs"}…`, "loading");
    const userId = await currentUserId();
    publishSelectedSite(site, userId);
    const target = new URL("/studio", window.location.origin);
    target.searchParams.set("site", site.id);
    target.searchParams.set("site_switch", "v304");
    window.location.assign(target.href);
  } catch (error) {
    console.error("Site switch v304 failed", error);
    setStatus(error?.message || "Situs belum dapat dipilih. Sesi akun tetap aktif.", "error");
  }
}

function renderEmpty() {
  const host = listHost();
  if (!host) return;
  host.replaceChildren();
  const empty = document.createElement("section");
  empty.className = "sn-site-switcher-v304-empty";
  const mark = document.createElement("span");
  mark.textContent = "n";
  const title = document.createElement("h3");
  title.textContent = "Belum ada situs untuk akun ini";
  const copy = document.createElement("p");
  copy.textContent = "Akun baru harus membuat situs pertama sebelum masuk Studio. Anda akan memilih jenis situs, subdomain gratis, tema awal, bahasa, dan zona waktu.";
  const action = createButton("Buat situs pertama", "primary");
  action.addEventListener("click", openFirstSiteOnboarding);
  empty.append(mark, title, copy, action);
  host.append(empty);
  setStatus("Belum ada membership situs. Tidak ada situs palsu yang ditampilkan.", "empty");
}

function renderSites() {
  const host = listHost();
  if (!host) return;
  host.replaceChildren();
  const normalizedQuery = query.trim().toLowerCase();
  const current = activeSiteId();
  const filtered = sites.filter((site) => {
    if (!normalizedQuery) return true;
    return [site.name, site.slug, site.role, site.status, site.blueprint]
      .some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
  });

  if (!sites.length) return renderEmpty();
  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "sn-site-switcher-v304-no-result";
    empty.textContent = "Tidak ada situs yang cocok dengan pencarian.";
    host.append(empty);
    setStatus(`${sites.length} situs tersedia.`, "ready");
    return;
  }

  filtered.forEach((site) => {
    const row = document.createElement("article");
    row.className = "sn-site-switcher-v304-row";
    if (String(site.id) === current) row.classList.add("active");
    row.dataset.siteId = String(site.id || "");

    const avatar = document.createElement("span");
    avatar.className = "site-mark";
    avatar.textContent = initials(site.name);

    const info = document.createElement("div");
    info.className = "site-copy";
    const heading = document.createElement("b");
    heading.textContent = site.name || "Situs tanpa nama";
    const address = document.createElement("small");
    address.textContent = site.slug ? `${site.slug}.ngeblogging.com` : "Subdomain belum tersedia";
    const meta = document.createElement("p");
    const role = String(site.role || "member").toLowerCase() === "owner" ? "Pemilik" : String(site.role || "Anggota");
    meta.textContent = `${siteState(site)} · ${role}${site.blueprint ? ` · ${site.blueprint}` : ""}`;
    info.append(heading, address, meta);

    const actions = document.createElement("div");
    actions.className = "site-actions";
    const manage = createButton(String(site.id) === current ? "Sedang dikelola" : "Kelola", String(site.id) === current ? "current" : "primary");
    manage.disabled = String(site.id) === current;
    manage.addEventListener("click", () => selectSite(site));
    actions.append(manage);

    if (site.slug && site.status === "active" && site.is_public === true) {
      const view = document.createElement("a");
      view.href = `https://${site.slug}.ngeblogging.com`;
      view.target = "_blank";
      view.rel = "noreferrer";
      view.textContent = "Lihat situs";
      actions.append(view);
    }

    row.append(avatar, info, actions);
    host.append(row);
  });
  setStatus(`${sites.length} situs nyata dimuat dari akun Anda.`, "ready");
}

async function loadSites() {
  const token = ++loadToken;
  setStatus("Memuat ulang daftar situs dari akun Anda…", "loading");
  try {
    const userId = await currentUserId();
    const rows = await listUserSitesStartupV292(userId);
    if (token !== loadToken || !layer) return;
    sites = [...rows].sort((a, b) => {
      const current = activeSiteId();
      if (String(a.id) === current) return -1;
      if (String(b.id) === current) return 1;
      return String(a.name || "").localeCompare(String(b.name || ""), "id");
    });
    if (!sites.length) clearStaleActiveSitePointers();
    renderSites();
  } catch (error) {
    if (token !== loadToken || !layer) return;
    console.error("Site switcher v304 load failed", error);
    const host = listHost();
    host?.replaceChildren();
    const errorBox = document.createElement("section");
    errorBox.className = "sn-site-switcher-v304-error";
    const title = document.createElement("h3");
    title.textContent = "Daftar situs belum dapat dimuat";
    const copy = document.createElement("p");
    copy.textContent = error?.message || "Koneksi data sedang bermasalah. Sesi akun tidak dihapus.";
    const retry = createButton("Coba lagi", "primary");
    retry.addEventListener("click", loadSites);
    errorBox.append(title, copy, retry);
    host?.append(errorBox);
    setStatus("Gagal membaca daftar situs. Coba lagi tanpa logout.", "error");
  }
}

export function openSiteSwitcherV304() {
  closeProfileMenu();
  closeLegacySiteManager();
  closeSiteSwitcherV304();

  const wrapper = document.createElement("div");
  wrapper.className = "sn-site-switcher-v304-layer";
  wrapper.dataset.release = STUDIO_SITE_SWITCHER_RELEASE_V304;
  wrapper.innerHTML = `
    <button class="sn-site-switcher-v304-backdrop" type="button" aria-label="Tutup Ganti situs"></button>
    <section class="sn-site-switcher-v304" role="dialog" aria-modal="true" aria-labelledby="sn-site-switcher-v304-title">
      <header>
        <div><small>WORKSPACE</small><h2 id="sn-site-switcher-v304-title">Ganti situs</h2><p>Pilih situs yang ingin Anda kelola. Daftar ini dibaca ulang dari membership akun setiap kali dibuka.</p></div>
        <button type="button" data-site-switcher-close aria-label="Tutup">×</button>
      </header>
      <div class="sn-site-switcher-v304-toolbar">
        <label><span class="sr-only">Cari situs</span><input type="search" data-site-switcher-search placeholder="Cari nama atau subdomain…" autocomplete="off"></label>
        <button type="button" class="primary" data-site-switcher-add>+ Tambah situs gratis</button>
      </div>
      <div class="sn-site-switcher-v304-list" data-site-switcher-list aria-live="polite"></div>
      <footer><p data-site-switcher-status data-state="loading">Memuat daftar situs…</p><button type="button" data-site-switcher-refresh>Muat ulang</button></footer>
    </section>`;

  document.body.append(wrapper);
  layer = wrapper;
  document.documentElement.classList.add("site-switcher-v304-open");
  document.documentElement.dataset.studioSiteSwitcherV304 = STUDIO_SITE_SWITCHER_RELEASE_V304;

  wrapper.querySelectorAll("[data-site-switcher-close],.sn-site-switcher-v304-backdrop")
    .forEach((node) => node.addEventListener("click", closeSiteSwitcherV304));
  wrapper.querySelector("[data-site-switcher-refresh]")?.addEventListener("click", loadSites);
  wrapper.querySelector("[data-site-switcher-add]")?.addEventListener("click", () => {
    closeSiteSwitcherV304();
    openCreateSiteV303();
  });
  const search = wrapper.querySelector("[data-site-switcher-search]");
  search?.addEventListener("input", (event) => {
    query = event.target.value || "";
    renderSites();
  });
  search?.focus({ preventScroll: true });
  loadSites();
}

function isAddSiteAction(target) {
  return target?.closest?.(
    ".sn-add-site-v298,.sn-profile-menu-v298 button[data-profile-action='add-site'],.sn-profile-menu-v295 button[data-profile-action='add-site']",
  );
}

function isSwitchSiteAction(target) {
  return target?.closest?.(
    ".sn-workspace,.sn-profile-menu-v298 button[data-profile-action='switch-site'],.sn-profile-menu-v295 button[data-profile-action='switch-site']",
  );
}

function capturedSiteAction(event) {
  const add = isAddSiteAction(event.target);
  if (add) {
    event.preventDefault();
    event.stopPropagation();
    closeSiteSwitcherV304();
    openCreateSiteV303();
    return;
  }
  const switchSite = isSwitchSiteAction(event.target);
  if (!switchSite) return;
  event.preventDefault();
  event.stopPropagation();
  openSiteSwitcherV304();
}

function onKeydown(event) {
  if (event.key === "Escape" && layer) closeSiteSwitcherV304();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.__ngebloggingOpenSiteSwitcherV304 = openSiteSwitcherV304;
  window.addEventListener("click", capturedSiteAction, true);
  window.addEventListener("ngeblogging:open-site-switcher", openSiteSwitcherV304);
  document.addEventListener("keydown", onKeydown, true);
  document.documentElement.dataset.studioSiteSwitcherV304 = STUDIO_SITE_SWITCHER_RELEASE_V304;
}
