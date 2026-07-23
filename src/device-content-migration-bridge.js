import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";

const LOCAL_STORE = "ngeblogging-studio-v3";
const attachedPages = new WeakSet();
let migrationBusy = false;

function readLocalDocuments() {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_STORE) || "null");
    return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
  } catch {
    return [];
  }
}

function activeSiteId() {
  try { return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; }
  catch { return ""; }
}

function markerKey(siteId) {
  return `ngeblogging-device-import:${siteId}:v1`;
}

function cleanSlug(value, fallback = "konten") {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
  return slug || fallback;
}

function validDate(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) && time > 0 ? new Date(time).toISOString() : null;
}

function sourceId(document, index) {
  return String(document.id || `legacy-${index}-${cleanSlug(document.title, "konten")}`).slice(0, 160);
}

function uniqueSlug(base, used, source) {
  let candidate = cleanSlug(base, "konten");
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }
  const suffix = cleanSlug(source, "import").replaceAll("-", "").slice(-8) || Math.random().toString(36).slice(2, 10);
  candidate = `${candidate.slice(0, Math.max(3, 63 - suffix.length - 1))}-${suffix}`;
  let attempt = candidate;
  let counter = 2;
  while (used.has(attempt)) {
    const tail = `-${counter}`;
    attempt = `${candidate.slice(0, 63 - tail.length)}${tail}`;
    counter += 1;
  }
  used.add(attempt);
  return attempt;
}

function normalizeDocument(document, index, siteId, userId, usedSlugs) {
  const id = sourceId(document, index);
  const kind = document.type === "page" ? "page" : "article";
  const allowedStatuses = new Set(["draft", "review", "scheduled", "published", "archived"]);
  const status = allowedStatuses.has(document.status) ? document.status : "draft";
  const allowedVisibility = new Set(["public", "members", "private"]);
  const visibility = allowedVisibility.has(document.visibility) ? document.visibility : "public";
  const publishedAt = status === "published" ? (validDate(document.publishedAt) || new Date().toISOString()) : null;
  const scheduledAt = status === "scheduled" ? validDate(document.scheduledAt) : null;
  const importedAt = new Date().toISOString();

  return {
    site_id: siteId,
    author_id: userId,
    kind,
    title: String(document.title || (kind === "page" ? "Halaman tanpa judul" : "Artikel tanpa judul")).slice(0, 300),
    slug: uniqueSlug(document.slug || document.title, usedSlugs, id),
    body_json: { type: "html", version: 1, imported_from: "device" },
    body_html: String(document.content || "").slice(0, 5_000_000),
    excerpt: String(document.excerpt || "").slice(0, 1000),
    status,
    visibility,
    seo: document.seo && typeof document.seo === "object" ? document.seo : { index: true, follow: true },
    scheduled_at: scheduledAt,
    published_at: publishedAt,
    created_at: validDate(document.createdAt) || importedAt,
    updated_at: validDate(document.updatedAt || document.updated) || importedAt,
    metadata: {
      ...(document.metadata && typeof document.metadata === "object" ? document.metadata : {}),
      device_import: {
        source_id: id,
        storage_key: LOCAL_STORE,
        imported_at: importedAt,
      },
    },
  };
}

function toast(message) {
  const existing = document.querySelector(".sn-toast");
  if (existing?.lastChild) {
    existing.lastChild.textContent = message;
    return;
  }
  const shell = document.querySelector(".sn-shell");
  if (!shell) return;
  const node = document.createElement("div");
  node.className = "sn-toast dcm-toast";
  node.textContent = message;
  shell.prepend(node);
  window.setTimeout(() => node.remove(), 5200);
}

async function inspectMigration(siteId, localDocuments) {
  const { data, error } = await supabase
    .from("contents")
    .select("slug,metadata")
    .eq("site_id", siteId)
    .limit(1000);
  if (error) throw error;
  const importedIds = new Set(
    (data || [])
      .map((row) => row?.metadata?.device_import?.source_id)
      .filter(Boolean)
      .map(String),
  );
  const missing = localDocuments.filter((document, index) => !importedIds.has(sourceId(document, index)));
  return { rows: data || [], missing };
}

async function migrate(siteId, button, banner) {
  if (migrationBusy) return;
  migrationBusy = true;
  const previous = button.textContent;
  button.disabled = true;
  button.textContent = "Memindahkan ke cloud…";
  try {
    const localDocuments = readLocalDocuments();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) throw new Error("Sesi login tidak ditemukan.");
    if (!siteId) throw new Error("Situs cloud aktif tidak ditemukan.");
    if (!localDocuments.length) throw new Error("Tidak ada konten perangkat untuk dipindahkan.");

    const inspection = await inspectMigration(siteId, localDocuments);
    if (!inspection.missing.length) {
      localStorage.setItem(markerKey(siteId), new Date().toISOString());
      banner.remove();
      toast("Semua konten perangkat sudah ada di cloud.");
      return;
    }

    const usedSlugs = new Set(inspection.rows.map((row) => row.slug).filter(Boolean));
    const payload = inspection.missing.map((document, index) => normalizeDocument(document, index, siteId, userId, usedSlugs));
    const { error } = await supabase.from("contents").insert(payload);
    if (error) throw error;

    localStorage.setItem(markerKey(siteId), JSON.stringify({ imported_at: new Date().toISOString(), count: payload.length }));
    banner.classList.add("success");
    banner.querySelector("h3").textContent = `${payload.length} konten berhasil dipindahkan ke cloud`;
    banner.querySelector("p").textContent = "Salinan perangkat tetap disimpan sebagai cadangan. Studio akan dimuat ulang untuk menampilkan data cloud.";
    button.textContent = "Memuat ulang…";
    toast(`${payload.length} konten perangkat berhasil disinkronkan`);
    window.setTimeout(() => window.location.reload(), 900);
  } catch (error) {
    console.error("Device content migration failed", error);
    toast(error.message || "Konten perangkat belum dapat dipindahkan.");
    button.disabled = false;
    button.textContent = previous;
  } finally {
    migrationBusy = false;
  }
}

async function attach(page) {
  if (attachedPages.has(page) || !supabaseConfigured || !supabase) return;
  attachedPages.add(page);
  const cloudBadge = document.querySelector(".sn-cloud.cloud");
  if (!cloudBadge) return;
  const siteId = activeSiteId();
  const localDocuments = readLocalDocuments();
  if (!siteId || !localDocuments.length || localStorage.getItem(markerKey(siteId))) return;

  try {
    const inspection = await inspectMigration(siteId, localDocuments);
    if (!inspection.missing.length) {
      localStorage.setItem(markerKey(siteId), new Date().toISOString());
      return;
    }

    const banner = document.createElement("section");
    banner.className = "dcm-banner";
    const published = inspection.missing.filter((document) => document.status === "published").length;
    const pages = inspection.missing.filter((document) => document.type === "page").length;
    banner.innerHTML = `<div><small>MIGRASI DATA PERANGKAT</small><h3>${inspection.missing.length} konten perangkat belum ada di cloud</h3><p>${inspection.missing.length - pages} Posts, ${pages} Pages, dan ${published} konten terbit dapat dipindahkan sekali klik. Tidak ada data lokal yang dihapus.</p></div><button type="button">Pindahkan ke Cloud</button>`;
    banner.querySelector("button").addEventListener("click", () => migrate(siteId, banner.querySelector("button"), banner));
    page.prepend(banner);
  } catch (error) {
    console.warn("Unable to inspect device content migration", error);
  }
}

function scan() {
  if (!document.querySelector(".sn-cloud.cloud")) return;
  document.querySelectorAll(".sn-view-pad").forEach(attach);
}

new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
scan();
