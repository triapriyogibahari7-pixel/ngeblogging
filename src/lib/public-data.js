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

function domainCandidates(hostname = "") {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return [];
  return [...new Set([normalized, `www.${normalized}`])];
}

function legacyCustomDomainCandidates(hostname = "") {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return [];
  const hostnames = domainCandidates(normalized);
  return [...new Set(hostnames.flatMap((value) => [
    value,
    `${value}/`,
    `https://${value}`,
    `https://${value}/`,
    `http://${value}`,
    `http://${value}/`,
  ]))];
}

function domainIsPubliclyRoutable(domain) {
  const status = String(domain?.status || "").trim().toLowerCase();
  if (["active", "verified"].includes(status)) return true;

  // During the full-zone migration some already-attached legacy domains retain a
  // stale row status while Cloudflare and TLS are already active. Treat that
  // combination as routable instead of making a working custom hostname resolve
  // to a blank public site solely because the migration has not rewritten status.
  const providerStatus = String(domain?.provider_status || "").trim().toLowerCase();
  const sslStatus = String(domain?.ssl_status || "").trim().toLowerCase();
  return providerStatus === "active" && ["active", "issued", "verified"].includes(sslStatus);
}

async function resolveLegacyCustomDomainSite(db, hostname = "") {
  const candidates = legacyCustomDomainCandidates(hostname);
  if (!candidates.length) return null;
  try {
    const { data, error } = await withTimeout(
      db.from("sites")
        .select("id,custom_domain")
        .in("custom_domain", candidates)
        .eq("status", "active")
        .eq("is_public", true)
        .limit(20),
      "Memulihkan routing domain situs",
    );
    if (error) throw error;

    // Exact normalized comparison keeps root/www preference deterministic even
    // when older records stored a scheme or trailing slash.
    const normalized = normalizeHostname(hostname);
    const rows = data || [];
    return rows.find((site) => normalizeHostname(site.custom_domain) === normalized)?.id || rows[0]?.id || null;
  } catch (error) {
    // Some deployments are still migrating the legacy column or its public RLS
    // policy. Do not let that secondary recovery path blank an otherwise valid
    // request; the caller will return the normal not-found result instead.
    console.warn("Legacy custom-domain fallback unavailable", error);
    return null;
  }
}

export async function resolvePublishedSite({ slug = "", hostname = "" }) {
  const db = client();
  const normalizedHostname = normalizeHostname(hostname);
  const isNgebloggingHost = !normalizedHostname || normalizedHostname === "ngeblogging.com" || normalizedHostname.endsWith(".ngeblogging.com");
  let siteId = null;

  if (!isNgebloggingHost) {
    const candidates = domainCandidates(normalizedHostname);
    let domains = [];
    try {
      const result = await withTimeout(
        db.from("site_domains")
          .select("site_id,hostname,status,provider_status,ssl_status,is_primary,updated_at")
          .in("hostname", candidates)
          .order("updated_at", { ascending: false, nullsFirst: false })
          .limit(10),
        "Memeriksa domain situs",
      );
      if (result.error) throw result.error;
      domains = result.data || [];
    } catch (domainError) {
      // site_domains is authoritative when available, but an older deployment,
      // partially applied migration, or public RLS failure must not prevent the
      // legacy sites.custom_domain recovery path from serving an already attached
      // custom hostname.
      console.warn("site_domains public lookup unavailable; trying legacy custom-domain recovery", domainError);
    }

    const matchingDomains = domains.filter(domain => domainIsPubliclyRoutable(domain));
    const exactDomain = matchingDomains.find((domain) => normalizeHostname(domain.hostname) === normalizedHostname);
    siteId = exactDomain?.site_id || matchingDomains[0]?.site_id || null;

    // Backward-compatible recovery for sites created before the site_domains
    // migration. A custom domain that is already attached in Cloudflare must not
    // become a blank page solely because the migration has not rewritten status
    // or the public site_domains query is temporarily unavailable.
    if (!siteId) siteId = await resolveLegacyCustomDomainSite(db, normalizedHostname);
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
  if (cursor?.publishedAt && cursor?.id) request = request.or(`published_at.lt.${cursor.publishedAt},and(published_at.eq.${cursor.publishedAt},id.lt.${cursor.id})`);
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
