import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY, setActiveSiteId } from "./lib/studio-data.js";

const RELEASE = "studio-site-switcher-v52-20260726-stable";
const SITE_LIMIT = 12;
const PANEL_ID = "sp52-site-switcher-panel";
const ROLE_LABEL = {
  owner: "Pemilik",
  admin: "Admin",
  editor: "Editor",
  author: "Penulis",
  contributor: "Kontributor",
  viewer: "Pengamat",
};

document.documentElement.dataset.studioSiteSwitcherV52 = RELEASE;

let frame = 0;
let sitesPromise = null;
let renderPromise = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function activeSiteId() {
  try {
    return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function siteAddress(site) {
  return String(site?.custom_domain || (site?.slug ? `${site.slug}.ngeblogging.com` : "ngeblogging.com"))
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
}

function siteUrl(site) {
  try {
    return new URL(`https://${siteAddress(site)}`).href;
  } catch {
    return "https://ngeblogging.com";
  }
}

function siteInitials(name) {
  const words = String(name || "Situs").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "S";
}

function siteHue(siteId) {
  let hash = 0;
  for (const character of String(siteId || "site")) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return Math.abs(hash) % 360;
}

function statusLabel(site) {
  return site?.status === "active" && site?.is_public ? "Publik" : "Draf";
}

function findHome() {
  const welcome = document.querySelector(".sn-main > .sn-view-pad > .sn-welcome");
  return welcome?.parentElement ? { welcome, container: welcome.parentElement } : null;
}

function quarantineLegacyCards(home) {
  const legacyCards = [...home.container.querySelectorAll(":scope > .sp37-active-site")];
  legacyCards.forEach((card, index) => {
    card.hidden = true;
    card.setAttribute("aria-hidden", "true");
    card.dataset.sp52LegacyHidden = "true";
    if (index > 0) card.remove();
  });
}

function ensureSingleHost() {
  const home = findHome();
  if (!home) return null;

  quarantineLegacyCards(home);

  let host = home.container.querySelector(":scope > .sp52-site-switcher");
  if (!host) {
    host = document.createElement("section");
    host.className = "sp52-site-switcher";
    home.welcome.insertAdjacentElement("afterend", host);
  } else if (home.welcome.nextElementSibling !== host) {
    home.welcome.insertAdjacentElement("afterend", host);
  }

  host.dataset.sp52Release = RELEASE;
  return host;
}

async function loadSites() {
  if (sitesPromise) return sitesPromise;
  sitesPromise = (async () => {
    if (!supabaseConfigured || !supabase) return [];
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return [];

    const { data, error } = await supabase
      .from("site_members")
      .select("site_id,role,joined_at,sites(id,name,slug,description,status,is_public,blueprint,custom_domain,updated_at)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: true })
      .limit(100);

    if (error) throw error;

    const unique = new Map();
    for (const record of data || []) {
      if (!record?.sites?.id || unique.has(record.sites.id)) continue;
      unique.set(record.sites.id, { ...record.sites, role: record.role || "viewer" });
    }
    return [...unique.values()].slice(0, SITE_LIMIT);
  })().catch((error) => {
    sitesPromise = null;
    throw error;
  });
  return sitesPromise;
}

function siteRow(site, selectedId) {
  const active = site.id === selectedId;
  const hue = siteHue(site.id);
  return `<button type="button" class="sp52-site-row" data-site-id="${escapeHtml(site.id)}" data-active="${active}" role="option" aria-selected="${active}">
    <span class="sp52-site-avatar" style="--sp52-hue:${hue}">${escapeHtml(siteInitials(site.name))}</span>
    <span class="sp52-site-copy">
      <b>${escapeHtml(site.name || "Situs tanpa nama")}</b>
      <small>${escapeHtml(siteAddress(site))}</small>
      <span><i>${escapeHtml(site.blueprint || "website")}</i><i>${escapeHtml(statusLabel(site))}</i><i>${escapeHtml(ROLE_LABEL[site.role] || site.role || "Anggota")}</i></span>
    </span>
    <span class="sp52-site-state">${active ? "✓<small>Aktif</small>" : "Pilih"}</span>
  </button>`;
}

function markup(sites, selected) {
  const address = siteAddress(selected);
  const currentIndex = Math.max(0, sites.findIndex((site) => site.id === selected.id)) + 1;
  const hue = siteHue(selected.id);
  return `<div class="sp52-current-site">
      <span class="sp52-current-avatar" style="--sp52-hue:${hue}">${escapeHtml(siteInitials(selected.name))}</span>
      <div class="sp52-current-copy">
        <div class="sp52-eyebrow"><span><i></i> SITUS AKTIF SEKARANG</span><em>${currentIndex}/${SITE_LIMIT} situs</em></div>
        <h2>${escapeHtml(selected.name || "Situs tanpa nama")}</h2>
        <p>${escapeHtml(address)}</p>
      </div>
    </div>
    <dl class="sp52-site-meta">
      <div><dt>Jenis</dt><dd>${escapeHtml(selected.blueprint || "website")}</dd></div>
      <div><dt>Status</dt><dd><span class="sp52-status-dot"></span>${escapeHtml(statusLabel(selected))}</dd></div>
      <div><dt>Peran</dt><dd>${escapeHtml(ROLE_LABEL[selected.role] || selected.role || "Anggota")}</dd></div>
    </dl>
    <div class="sp52-site-actions">
      <a href="${escapeHtml(siteUrl(selected))}" target="_blank" rel="noreferrer">Lihat situs</a>
      <button type="button" class="sp52-toggle" aria-expanded="false" aria-controls="${PANEL_ID}"><span>Ganti situs</span><i>⌄</i></button>
    </div>
    <button type="button" class="sp52-backdrop" aria-label="Tutup pemilih situs" tabindex="-1" hidden></button>
    <section class="sp52-panel" id="${PANEL_ID}" aria-label="Pilih situs yang dikelola" hidden>
      <header><div><small>WORKSPACE</small><h3>Pilih situs yang dikelola</h3><p>Satu akun dapat mengelola maksimal ${SITE_LIMIT} situs.</p></div><span>${sites.length}/${SITE_LIMIT}</span></header>
      <label class="sp52-search"><span>⌕</span><input type="search" autocomplete="off" placeholder="Cari nama atau alamat situs" aria-label="Cari situs"></label>
      <div class="sp52-site-list" role="listbox">${sites.map((site) => siteRow(site, selected.id)).join("")}</div>
      <footer><button type="button" data-action="manage">Kelola semua situs</button><button type="button" data-action="add" ${sites.length >= SITE_LIMIT ? "disabled" : ""}>+ Tambah situs</button></footer>
    </section>`;
}

function openPanel(card, open) {
  const toggle = card.querySelector(".sp52-toggle");
  const panel = card.querySelector(".sp52-panel");
  const backdrop = card.querySelector(".sp52-backdrop");
  if (!toggle || !panel || !backdrop) return;
  toggle.setAttribute("aria-expanded", String(open));
  panel.hidden = !open;
  backdrop.hidden = !open;
  card.dataset.open = String(open);
  if (open) card.querySelector(".sp52-search input")?.focus();
}

function openExistingWorkspace(card, action = "manage") {
  const textPattern = action === "add" ? /^\+?\s*Tambah situs$/i : /Kelola\s*&?\s*ganti situs|Ganti situs aktif/i;
  const existingButton = [...document.querySelectorAll("button")]
    .find((button) => !card.contains(button) && textPattern.test(button.textContent?.trim() || ""));
  if (existingButton) {
    existingButton.click();
    return;
  }
  document.querySelector(".sn-workspace")?.click();
}

function bind(card, sites) {
  card.querySelector(".sp52-toggle")?.addEventListener("click", () => {
    openPanel(card, card.dataset.open !== "true");
  });
  card.querySelector(".sp52-backdrop")?.addEventListener("click", () => openPanel(card, false));

  const search = card.querySelector(".sp52-search input");
  search?.addEventListener("input", () => {
    const query = search.value.trim().toLocaleLowerCase("id-ID");
    card.querySelectorAll(".sp52-site-row").forEach((row) => {
      row.hidden = Boolean(query) && !row.textContent.toLocaleLowerCase("id-ID").includes(query);
    });
  });

  card.querySelectorAll(".sp52-site-row").forEach((row) => row.addEventListener("click", () => {
    const siteId = row.dataset.siteId || "";
    if (!siteId || siteId === activeSiteId()) {
      openPanel(card, false);
      return;
    }
    row.classList.add("is-loading");
    setActiveSiteId(siteId);
    window.dispatchEvent(new CustomEvent("ngeblogging:active-site-changed", { detail: { siteId } }));
    location.reload();
  }));

  card.querySelector('[data-action="manage"]')?.addEventListener("click", () => {
    openPanel(card, false);
    openExistingWorkspace(card, "manage");
  });
  card.querySelector('[data-action="add"]')?.addEventListener("click", () => {
    openPanel(card, false);
    openExistingWorkspace(card, "add");
  });

  const closeOutside = (event) => {
    if (card.dataset.open === "true" && !card.contains(event.target)) openPanel(card, false);
  };
  const closeEscape = (event) => {
    if (event.key === "Escape" && card.dataset.open === "true") openPanel(card, false);
  };
  document.addEventListener("pointerdown", closeOutside, { signal: card.sp52Controller.signal });
  document.addEventListener("keydown", closeEscape, { signal: card.sp52Controller.signal });

  card.querySelector(".sp52-panel")?.addEventListener("click", (event) => event.stopPropagation());
  card.dataset.sp52BoundSites = sites.map((site) => site.id).join(",");
}

async function render() {
  const card = ensureSingleHost();
  if (!card || renderPromise) return renderPromise;

  renderPromise = (async () => {
    try {
      const sites = await loadSites();
      if (!card.isConnected) return;
      if (!sites.length) {
        if (!card.querySelector(".sp52-empty")) {
          card.innerHTML = `<div class="sp52-empty"><small>SITUS YANG DIKELOLA</small><h2>Belum ada situs aktif</h2><p>Buat situs pertama untuk memulai workspace Ngeblogging.</p><button type="button">+ Tambah situs</button></div>`;
          card.querySelector("button")?.addEventListener("click", () => openExistingWorkspace(card, "add"));
        }
        return;
      }

      const selected = sites.find((site) => site.id === activeSiteId()) || sites[0];
      if (selected.id !== activeSiteId()) setActiveSiteId(selected.id);
      const signature = `${selected.id}:${sites.map((site) => site.id).join("|")}`;
      if (card.dataset.sp52Signature === signature && card.querySelector(".sp52-current-site")) return;

      card.sp52Controller?.abort();
      card.sp52Controller = new AbortController();
      card.innerHTML = markup(sites, selected);
      card.dataset.sp52Signature = signature;
      card.dataset.open = "false";
      bind(card, sites);
    } catch (error) {
      if (!card.querySelector(".sp52-error")) {
        card.innerHTML = `<div class="sp52-empty sp52-error"><small>WORKSPACE</small><h2>Daftar situs belum dapat dimuat</h2><p>${escapeHtml(error.message || "Terjadi gangguan sementara.")}</p><button type="button">Coba lagi</button></div>`;
        card.querySelector("button")?.addEventListener("click", () => {
          sitesPromise = null;
          card.dataset.sp52Signature = "";
          schedule();
        });
      }
    }
  })().finally(() => {
    renderPromise = null;
  });

  return renderPromise;
}

function reconcile() {
  const card = ensureSingleHost();
  if (!card) return;
  render();
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(reconcile);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("storage", (event) => {
  if (event.key !== ACTIVE_SITE_STORAGE_KEY) return;
  sitesPromise = null;
  const card = ensureSingleHost();
  if (card) card.dataset.sp52Signature = "";
  schedule();
});

window.addEventListener("ngeblogging:active-site-changed", () => {
  sitesPromise = null;
});

if (supabase) {
  supabase.auth.onAuthStateChange(() => {
    sitesPromise = null;
    schedule();
  });
}

schedule();
