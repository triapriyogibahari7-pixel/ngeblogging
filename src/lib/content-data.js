import { supabase, supabaseConfigured } from "./supabase.js";

export const CONTENT_PAGE_SIZE = 25;
export const CONTENT_QUERY_TIMEOUT_MS = 12_000;
const CONTENT_STATUSES = new Set(["draft", "review", "scheduled", "published", "archived"]);

function client() {
  if (!supabaseConfigured || !supabase) throw new Error("Penyimpanan cloud belum dikonfigurasi.");
  return supabase;
}

function withTimeout(promise, label = "Permintaan konten") {
  let timer = 0;
  const timeout = new Promise((_, reject) => {
    timer = globalThis.setTimeout(() => reject(new Error(`${label} terlalu lama. Periksa koneksi lalu coba lagi.`)), CONTENT_QUERY_TIMEOUT_MS);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => globalThis.clearTimeout(timer));
}

export function slugify(value, fallback = "konten") {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 100);
  return normalized || fallback;
}

function shortId() {
  return globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 8)
    || Math.random().toString(36).slice(2, 10);
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function safeArray(value, max = 100) {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

function normalizeContentStatus(value, fallback = "draft") {
  const status = String(value || fallback).toLowerCase();
  return CONTENT_STATUSES.has(status) ? status : fallback;
}

export function normalizeMetadata(value = {}, type = "article") {
  const input = safeObject(value);
  return {
    tags: safeArray(input.tags, 50).map((item) => String(item).trim().slice(0, 80)).filter(Boolean),
    categories: safeArray(input.categories, 20).map((item) => String(item).trim().slice(0, 80)).filter(Boolean),
    eventDate: String(input.eventDate || "").slice(0, 10),
    eventTime: String(input.eventTime || "").slice(0, 8),
    endDate: String(input.endDate || "").slice(0, 10),
    endTime: String(input.endTime || "").slice(0, 8),
    timezone: String(input.timezone || "Asia/Jakarta").slice(0, 80),
    locationName: String(input.locationName || "").slice(0, 200),
    address: String(input.address || "").slice(0, 500),
    latitude: Number.isFinite(Number(input.latitude)) ? Number(input.latitude) : null,
    longitude: Number.isFinite(Number(input.longitude)) ? Number(input.longitude) : null,
    authorName: String(input.authorName || "").slice(0, 160),
    authorUrl: String(input.authorUrl || "").slice(0, 500),
    canonicalUrl: String(input.canonicalUrl || "").slice(0, 1000),
    socialTitle: String(input.socialTitle || "").slice(0, 300),
    socialDescription: String(input.socialDescription || "").slice(0, 500),
    socialImage: String(input.socialImage || "").slice(0, 2000),
    focusKeyword: String(input.focusKeyword || "").slice(0, 160),
    schemaType: String(input.schemaType || (type === "page" ? "WebPage" : "BlogPosting")).slice(0, 80),
    language: String(input.language || "id-ID").slice(0, 20),
    template: String(input.template || (type === "page" ? "default-page" : "default-post")).slice(0, 100),
    parentPageId: input.parentPageId ? String(input.parentPageId).slice(0, 80) : null,
    menuOrder: Math.max(0, Math.min(9999, Number(input.menuOrder) || 0)),
    sticky: Boolean(input.sticky),
    commentsEnabled: input.commentsEnabled !== false,
    showAuthor: input.showAuthor !== false,
    showDate: input.showDate !== false,
    showShare: input.showShare !== false,
    excludeFromSearch: Boolean(input.excludeFromSearch),
    passwordHint: String(input.passwordHint || "").slice(0, 200),
    customFields: safeObject(input.customFields),
  };
}

export function normalizeSeo(value = {}, metadata = {}) {
  const input = safeObject(value);
  return {
    index: input.index !== false && !metadata.excludeFromSearch,
    follow: input.follow !== false,
    noarchive: Boolean(input.noarchive),
    nosnippet: Boolean(input.nosnippet),
    maxImagePreview: String(input.maxImagePreview || "large").slice(0, 20),
    maxSnippet: Number.isFinite(Number(input.maxSnippet)) ? Number(input.maxSnippet) : -1,
    maxVideoPreview: Number.isFinite(Number(input.maxVideoPreview)) ? Number(input.maxVideoPreview) : -1,
  };
}

export function recordToDocument(record, hydrated = true) {
  const metadata = normalizeMetadata(record.metadata, record.kind);
  return {
    id: record.id,
    type: record.kind,
    title: record.title,
    slug: record.slug,
    status: record.status,
    visibility: record.visibility || "public",
    excerpt: record.excerpt || "",
    content: hydrated ? (record.body_html || "") : null,
    featuredImagePath: record.featured_image_path || "",
    metadata,
    seo: normalizeSeo(record.seo, metadata),
    scheduledAt: record.scheduled_at || "",
    publishedAt: record.published_at || "",
    createdAt: record.created_at || "",
    updatedAt: record.updated_at || "",
    updated: new Date(record.updated_at || Date.now()).getTime(),
    hydrated,
  };
}

export async function listContentPage({ siteId, kind = null, search = "", cursor = null, pageSize = CONTENT_PAGE_SIZE, status = null }) {
  const safeLimit = Math.min(100, Math.max(1, Number(pageSize) || CONTENT_PAGE_SIZE));
  let request = client()
    .from("contents")
    .select("id,kind,title,slug,status,visibility,excerpt,featured_image_path,metadata,seo,scheduled_at,published_at,created_at,updated_at")
    .eq("site_id", siteId)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit + 1);
  if (kind) request = request.eq("kind", kind);
  if (status) request = request.eq("status", status);
  if (search.trim()) request = request.ilike("title", `%${search.trim().slice(0, 120)}%`);
  if (cursor?.updatedAt && cursor?.id) {
    request = request.or(`updated_at.lt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.lt.${cursor.id})`);
  }
  const { data, error } = await withTimeout(request, "Memuat daftar konten");
  if (error) throw error;
  const hasMore = data.length > safeLimit;
  const rows = data.slice(0, safeLimit);
  const last = rows.at(-1);
  return {
    documents: rows.map((row) => recordToDocument(row, false)),
    hasMore,
    cursor: hasMore && last ? { updatedAt: last.updated_at, id: last.id } : null,
  };
}

export async function getContentDocument(contentId) {
  const request = client()
    .from("contents")
    .select("id,kind,title,slug,body_html,excerpt,featured_image_path,status,visibility,metadata,seo,scheduled_at,published_at,created_at,updated_at")
    .eq("id", contentId)
    .single();
  const { data, error } = await withTimeout(request, "Membuka konten");
  if (error) throw error;
  return recordToDocument(data, true);
}

export async function createContentDocument({ siteId, userId, type = "article" }) {
  const isPage = type === "page";
  const title = isPage ? "Page tanpa judul" : "Post tanpa judul";
  const metadata = normalizeMetadata({
    timezone: "Asia/Jakarta",
    commentsEnabled: !isPage,
    showAuthor: !isPage,
    showDate: !isPage,
    showShare: !isPage,
  }, type);
  const seo = normalizeSeo({}, metadata);
  const request = client().from("contents").insert({
    site_id: siteId,
    author_id: userId,
    kind: type,
    title,
    slug: `${slugify(title)}-${shortId()}`,
    status: "draft",
    visibility: "public",
    body_json: { type: "html", version: 2 },
    body_html: isPage
      ? "<h1>Judul page</h1><p>Bangun halaman profesional dengan struktur yang jelas.</p>"
      : "<h1>Judul post</h1><p>Mulai menulis gagasan terbaik Anda.</p>",
    excerpt: "",
    metadata,
    seo,
  }).select("id,kind,title,slug,body_html,excerpt,featured_image_path,status,visibility,metadata,seo,scheduled_at,published_at,created_at,updated_at").single();
  const { data, error } = await withTimeout(request, "Membuat konten");
  if (error) throw error;
  return recordToDocument(data, true);
}

export async function updateContentDocument(contentId, values) {
  const payload = {};
  if (values.title !== undefined) payload.title = String(values.title).slice(0, 300);
  if (values.slug !== undefined) payload.slug = slugify(values.slug, `konten-${shortId()}`);
  if (values.content !== undefined) {
    payload.body_html = String(values.content).slice(0, 5_000_000);
    payload.body_json = { type: "html", version: 2 };
  }
  if (values.status !== undefined) {
    const status = normalizeContentStatus(values.status);
    payload.status = status;
    payload.published_at = status === "published" ? (values.publishedAt || new Date().toISOString()) : null;
    payload.scheduled_at = status === "scheduled" ? (values.scheduledAt || null) : values.scheduledAt || null;
  } else if (values.scheduledAt !== undefined) {
    payload.scheduled_at = values.scheduledAt || null;
  }
  if (values.visibility !== undefined) payload.visibility = values.visibility;
  if (values.excerpt !== undefined) payload.excerpt = String(values.excerpt).slice(0, 1000);
  if (values.featuredImagePath !== undefined) payload.featured_image_path = String(values.featuredImagePath || "").slice(0, 2000) || null;
  if (values.metadata !== undefined) payload.metadata = normalizeMetadata(values.metadata, values.type || "article");
  if (values.seo !== undefined) payload.seo = normalizeSeo(values.seo, values.metadata || {});
  if (!Object.keys(payload).length) return null;
  const request = client().from("contents").update(payload).eq("id", contentId).select("updated_at,published_at,scheduled_at,metadata,seo").single();
  const { data, error } = await withTimeout(request, "Menyimpan konten");
  if (error) throw error;
  return data;
}

export async function publishContentDocument(contentId, values = {}) {
  const status = normalizeContentStatus(values.status, "published");
  const publishedAt = status === "published" ? (values.publishedAt || new Date().toISOString()) : "";
  return updateContentDocument(contentId, { ...values, status, publishedAt });
}

export async function deleteContentDocument(contentId) {
  const request = client().from("contents").delete().eq("id", contentId);
  const { error } = await withTimeout(request, "Menghapus konten");
  if (error) throw error;
}