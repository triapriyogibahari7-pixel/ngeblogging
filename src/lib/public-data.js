import { supabase, supabaseConfigured } from "./supabase.js";

export const PUBLIC_QUERY_TIMEOUT_MS = 12_000;

function client() {
  if (!supabaseConfigured || !supabase) throw new Error("Penyimpanan publik belum dikonfigurasi.");
  return supabase;
}

function withTimeout(promise, label = "Permintaan publik") {
  let timer = 0;
  const timeout = new Promise((_, reject) => {
    timer = globalThis.setTimeout(() => reject(new Error(`${label} terlalu lama. Silakan muat ulang halaman.`)), PUBLIC_QUERY_TIMEOUT_MS);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => globalThis.clearTimeout(timer));
}

function normalizeHostname(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .split("/")[0]
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

export async function resolvePublishedSite({ slug = "", hostname = "" }) {
  const db = client();
  const normalizedHostname = normalizeHostname(hostname);
  const isNgebloggingHost = !normalizedHostname || normalizedHostname === "ngeblogging.com" || normalizedHostname.endsWith(".ngeblogging.com");
  let siteId = null;

  if (!isNgebloggingHost) {
    const { data: domain, error: domainError } = await withTimeout(
      db.from("site_domains")
        .select("site_id,hostname,status")
        .in("hostname", [normalizedHostname, `www.${normalizedHostname}`])
        .in("status", ["active", "verified"])
        .limit(1)
        .maybeSingle(),
      "Memeriksa domain situs",
    );
    if (domainError) throw domainError;
    siteId = domain?.site_id || null;
    if (!siteId) return null;
  }

  let request = db.from("sites")
    .select("id,name,slug,description,status,blueprint,theme_key,settings,locale,timezone,published_at,updated_at")
    .eq("status", "active")
    .eq("is_public", true);
  request = siteId ? request.eq("id", siteId) : request.eq("slug", slug);

  const { data: site, error: siteError } = await withTimeout(request.maybeSingle(), "Memuat situs");
  if (siteError) throw siteError;
  if (!site) return null;

  // Tema bukan syarat agar Post/Page yang sudah terbit dapat dibuka.
  // Jika tabel/konfigurasi tema bermasalah, gunakan fallback tema aplikasi.
  let theme = null;
  try {
    const { data, error } = await withTimeout(
      db.from("site_theme_settings")
        .select("active_theme_id,published_config,code,widgets,updated_at")
        .eq("site_id", site.id)
        .maybeSingle(),
      "Memuat tema situs",
    );
    if (error) console.warn("Public theme load failed; using fallback theme", error);
    else theme = data || null;
  } catch (themeError) {
    console.warn("Public theme load timed out; using fallback theme", themeError);
  }

  return { ...site, theme };
}

export async function listPublishedContent({ siteId, kind = null, cursor = null, pageSize = 18 }) {
  const limit = Math.min(50, Math.max(1, Number(pageSize) || 18));
  let request = client().from("contents").select("id,kind,title,slug,excerpt,featured_image_path,metadata,seo,published_at,updated_at").eq("site_id", siteId).eq("status", "published").eq("visibility", "public").order("published_at", { ascending: false, nullsFirst: false }).order("id", { ascending: false }).limit(limit + 1);
  if (kind) request = request.eq("kind", kind);
  if (cursor?.publishedAt && cursor?.id) request = request.or(`published_at.lt.${cursor.publishedAt},and(published_at.eq.${cursor.publishedAt},id.lt.${cursor.publishedAt},id.lt.${cursor.id})`);
  const { data, error } = await withTimeout(request, "Memuat daftar post");
  if (error) throw error;
  const rows = data || [];
  const hasMore = rows.length > limit, contents = rows.slice(0, limit), last = contents.at(-1);
  return { contents, hasMore, cursor: hasMore && last ? { publishedAt: last.published_at, id: last.id } : null };
}

export async function listPublishedPages(siteId) {
  const { data, error } = await withTimeout(
    client().from("contents").select("id,title,slug,excerpt,metadata,published_at,updated_at").eq("site_id", siteId).eq("kind", "page").eq("status", "published").eq("visibility", "public").order("title").limit(100),
    "Memuat daftar page",
  );
  if (error) throw error;
  return data || [];
}

export async function getPublishedContent(siteId, slug) {
  const normalizedSlug = decodeURIComponent(String(slug || "")).replace(/^\/+|\/+$/g, "");
  if (!normalizedSlug) return null;
  const db = client();
  const { data, error } = await withTimeout(
    db.from("contents")
      .select("id,kind,title,slug,body_html,excerpt,featured_image_path,metadata,seo,published_at,updated_at,created_at")
      .eq("site_id", siteId)
      .eq("slug", normalizedSlug)
      .eq("status", "published")
      .eq("visibility", "public")
      .maybeSingle(),
    "Membuka post atau page",
  );
  if (error) throw error;
  return data || null;
}
