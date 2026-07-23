import { supabase, supabaseConfigured } from "./supabase.js";
import { normalizeMetadata, normalizeSeo, slugify } from "./content-data.js";

export const BACKUP_FORMAT = "ngeblogging.portable-backup";
export const BACKUP_VERSION = 1;
export const MAX_RESTORE_DOCUMENTS = 20_000;
const PAGE_SIZE = 500;

function db() {
  if (!supabaseConfigured || !supabase) throw new Error("Penyimpanan cloud belum dikonfigurasi.");
  return supabase;
}

function safeArray(value, max = Number.MAX_SAFE_INTEGER) {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cleanFilename(value) {
  return String(value || "ngeblogging")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "ngeblogging";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function archiveSafeHtml(value) {
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, "")
    .replace(/javascript\s*:/gi, "blocked:");
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function collectRows(buildQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

export function normalizeBackup(raw) {
  const source = safeObject(raw);
  if (source.format !== BACKUP_FORMAT) throw new Error("File bukan cadangan Ngeblogging yang valid.");
  if (Number(source.version) !== BACKUP_VERSION) throw new Error("Versi file cadangan belum didukung.");
  const contents = safeArray(source.contents, MAX_RESTORE_DOCUMENTS + 1);
  if (contents.length > MAX_RESTORE_DOCUMENTS) throw new Error(`Cadangan melebihi batas aman ${MAX_RESTORE_DOCUMENTS.toLocaleString("id-ID")} konten per proses.`);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: String(source.exportedAt || ""),
    source: safeObject(source.source),
    site: safeObject(source.site),
    profile: safeObject(source.profile),
    contents: contents.map((item) => ({
      kind: item?.kind === "page" ? "page" : "article",
      title: String(item?.title || "Tanpa judul").slice(0, 300),
      slug: slugify(item?.slug || item?.title || "konten"),
      status: ["draft", "review", "scheduled", "published", "archived"].includes(item?.status) ? item.status : "draft",
      visibility: ["public", "members", "private"].includes(item?.visibility) ? item.visibility : "public",
      body_html: String(item?.body_html || item?.content || "").slice(0, 5_000_000),
      excerpt: String(item?.excerpt || "").slice(0, 1000),
      featured_image_path: String(item?.featured_image_path || item?.featuredImagePath || "").slice(0, 2000),
      metadata: normalizeMetadata(item?.metadata, item?.kind),
      seo: normalizeSeo(item?.seo, item?.metadata),
      scheduled_at: item?.scheduled_at || item?.scheduledAt || null,
      published_at: item?.published_at || item?.publishedAt || null,
      created_at: item?.created_at || item?.createdAt || null,
      updated_at: item?.updated_at || item?.updatedAt || null,
    })),
    media: safeArray(source.media, 100_000),
    theme: source.theme ? safeObject(source.theme) : null,
    domains: safeArray(source.domains, 1000),
    integrity: safeObject(source.integrity),
  };
}

export async function exportCloudBackup({ siteId, userId }) {
  if (!siteId || !userId) throw new Error("Situs dan pengguna wajib tersedia.");
  const client = db();
  const [{ data: site, error: siteError }, { data: profile, error: profileError }, contents, media, domains, themeResult] = await Promise.all([
    client.from("sites").select("id,name,slug,description,blueprint,status,is_public,locale,timezone,theme_key,settings,created_at,updated_at").eq("id", siteId).single(),
    client.from("profiles").select("display_name,bio,website,avatar_url,locale,timezone").eq("id", userId).maybeSingle(),
    collectRows(() => client.from("contents").select("kind,title,slug,status,visibility,body_html,excerpt,featured_image_path,metadata,seo,scheduled_at,published_at,created_at,updated_at").eq("site_id", siteId).order("created_at", { ascending: true }).order("id", { ascending: true })),
    collectRows(() => client.from("media_assets").select("id,name,path,bucket,mime_type,size_bytes,width,height,duration_seconds,alt_text,metadata,created_at").eq("site_id", siteId).order("created_at", { ascending: true })),
    collectRows(() => client.from("site_domains").select("hostname,status,is_primary,verified_at,created_at").eq("site_id", siteId).order("created_at", { ascending: true })),
    client.from("site_theme_settings").select("*").eq("site_id", siteId).maybeSingle(),
  ]);
  if (siteError) throw siteError;
  if (profileError) throw profileError;
  if (themeResult.error && themeResult.error.code !== "PGRST116") throw themeResult.error;

  const payload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    source: { product: "Ngeblogging", hostname: globalThis.location?.hostname || "", userId },
    site,
    profile: profile || {},
    contents,
    media,
    theme: themeResult.data || null,
    domains,
  };
  const canonical = JSON.stringify(payload);
  return { ...payload, integrity: { algorithm: "SHA-256", checksum: await sha256(canonical) } };
}

export async function verifyBackupIntegrity(raw) {
  const normalized = normalizeBackup(raw);
  const expected = String(raw?.integrity?.checksum || "");
  if (!expected) return { valid: true, legacy: true, backup: normalized };
  const { integrity: _integrity, ...payload } = raw;
  const actual = await sha256(JSON.stringify(payload));
  if (actual !== expected) throw new Error("Checksum cadangan tidak cocok. File mungkin berubah atau rusak.");
  return { valid: true, legacy: false, backup: normalized };
}

export function exportLocalBackup(documents = []) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    source: { product: "Ngeblogging", mode: "local-device" },
    site: { name: "Cadangan perangkat", slug: "local" },
    profile: {},
    contents: safeArray(documents, MAX_RESTORE_DOCUMENTS).map((doc) => ({
      kind: doc.type === "page" ? "page" : "article",
      title: doc.title,
      slug: doc.slug,
      status: doc.status,
      visibility: doc.visibility,
      body_html: doc.content,
      excerpt: doc.excerpt,
      featured_image_path: doc.featuredImagePath,
      metadata: doc.metadata,
      seo: doc.seo,
      scheduled_at: doc.scheduledAt,
      published_at: doc.publishedAt,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
    })),
    media: [],
    theme: null,
    domains: [],
    integrity: {},
  };
}

export async function finalizeLocalBackup(payload) {
  const { integrity: _integrity, ...base } = payload;
  return { ...base, integrity: { algorithm: "SHA-256", checksum: await sha256(JSON.stringify(base)) } };
}

export function downloadJsonBackup(backup) {
  const filename = `${cleanFilename(backup.site?.slug || backup.site?.name)}-${new Date().toISOString().slice(0, 10)}.ngeblogging-backup.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, filename);
}

export function downloadReadableArchive(backup) {
  const sections = backup.contents.map((item, index) => `
    <article id="content-${index + 1}">
      <header><small>${escapeHtml(item.kind === "page" ? "PAGE" : "POST")} · ${escapeHtml(item.status)}</small><h2>${escapeHtml(item.title)}</h2><p>/${escapeHtml(item.slug)} · ${escapeHtml(item.updated_at || item.created_at || "")}</p></header>
      <div class="content">${archiveSafeHtml(item.body_html)}</div>
      <details><summary>Metadata dan SEO</summary><pre>${escapeHtml(JSON.stringify({ metadata: item.metadata, seo: item.seo }, null, 2))}</pre></details>
    </article>`).join("\n");
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Cadangan ${escapeHtml(backup.site?.name || "Ngeblogging")}</title><style>body{max-width:920px;margin:auto;padding:40px 20px;font:16px/1.7 system-ui;color:#172033}header{border-bottom:1px solid #dce3ed;margin-bottom:24px}article{margin:56px 0;padding:30px;border:1px solid #dce3ed;border-radius:18px}article h2{font-size:32px}.content img,.content video{max-width:100%;height:auto}pre{white-space:pre-wrap;background:#f5f7fa;padding:16px;border-radius:10px}small{font-weight:800;color:#2767ce}</style></head><body><header><h1>Cadangan ${escapeHtml(backup.site?.name || "Ngeblogging")}</h1><p>Diekspor ${escapeHtml(backup.exportedAt)} · ${backup.contents.length} Posts/Pages · ${backup.media.length} referensi media.</p></header>${sections || "<p>Tidak ada konten.</p>"}</body></html>`;
  downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${cleanFilename(backup.site?.slug || backup.site?.name)}-arsip-konten.html`);
}

export async function parseBackupFile(file) {
  if (!file || file.size > 250 * 1024 * 1024) throw new Error("File cadangan terlalu besar untuk diproses aman di browser.");
  const raw = JSON.parse(await file.text());
  return (await verifyBackupIntegrity(raw)).backup;
}

function uniqueRestoreSlug(base, used) {
  let candidate = slugify(base);
  let counter = 1;
  while (used.has(candidate)) candidate = `${slugify(base).slice(0, 88)}-restore-${counter++}`;
  used.add(candidate);
  return candidate;
}

export async function restoreCloudBackup({ backup, siteId, userId, preserveStatuses = false }) {
  const normalized = normalizeBackup(backup);
  if (!normalized.contents.length) return { restored: 0, mediaReferences: normalized.media.length };
  const client = db();
  const { data: existingRows, error: existingError } = await client.from("contents").select("slug").eq("site_id", siteId).limit(100_000);
  if (existingError) throw existingError;
  const used = new Set((existingRows || []).map((item) => item.slug));
  const rows = normalized.contents.map((item) => {
    const status = preserveStatuses ? item.status : "draft";
    return {
      site_id: siteId,
      author_id: userId,
      kind: item.kind,
      title: item.title,
      slug: uniqueRestoreSlug(item.slug, used),
      status,
      visibility: item.visibility,
      body_json: { type: "html", version: 2, restoredFromBackup: true },
      body_html: item.body_html,
      excerpt: item.excerpt,
      featured_image_path: item.featured_image_path || null,
      metadata: normalizeMetadata(item.metadata, item.kind),
      seo: normalizeSeo(item.seo, item.metadata),
      scheduled_at: status === "scheduled" ? item.scheduled_at : null,
      published_at: status === "published" ? (item.published_at || new Date().toISOString()) : null,
    };
  });
  for (let index = 0; index < rows.length; index += 100) {
    const { error } = await client.from("contents").insert(rows.slice(index, index + 100));
    if (error) throw error;
  }
  await recordBackupEvent({ siteId, userId, action: "restore", documentCount: rows.length, metadata: { preserveStatuses, sourceSite: normalized.site?.slug || "" } });
  return { restored: rows.length, mediaReferences: normalized.media.length };
}

export async function recordBackupEvent({ siteId, userId, action, documentCount, metadata = {} }) {
  if (!supabaseConfigured || !supabase || !siteId || !userId) return;
  const { error } = await supabase.from("site_backup_events").insert({ site_id: siteId, user_id: userId, action, document_count: documentCount, metadata });
  if (error && error.code !== "42P01") console.warn("Backup audit event was not stored", error);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
