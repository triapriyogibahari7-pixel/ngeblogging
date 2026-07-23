import { supabase, supabaseConfigured } from "./supabase.js";

export const CONTENT_PAGE_SIZE = 25;
export const ACTIVE_SITE_STORAGE_KEY = "ngeblogging-active-site-id";

function requireCloud() {
  if (!supabaseConfigured || !supabase) throw new Error("Penyimpanan cloud belum dikonfigurasi.");
  return supabase;
}

function cleanSlug(value, fallback = "konten") {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
  return normalized || fallback;
}

function shortId() {
  return globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 8)
    || Math.random().toString(36).slice(2, 10);
}

function readActiveSiteId() {
  try {
    return typeof localStorage === "undefined" ? "" : localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function setActiveSiteId(siteId) {
  try {
    if (typeof localStorage !== "undefined") {
      if (siteId) localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, siteId);
      else localStorage.removeItem(ACTIVE_SITE_STORAGE_KEY);
    }
  } catch {
    // Storage may be unavailable in hardened or private browsing contexts.
  }
}

function membershipSite(record) {
  if (!record?.sites) return null;
  return { ...record.sites, role: record.role };
}

export function recordToDocument(record, hydrated = true) {
  return {
    id: record.id,
    type: record.kind,
    title: record.title,
    slug: record.slug,
    status: record.status,
    visibility: record.visibility || "public",
    excerpt: record.excerpt || "",
    content: hydrated ? (record.body_html || "") : null,
    updated: new Date(record.updated_at).getTime(),
    publishedAt: record.published_at,
    hydrated,
  };
}

export async function listUserSites(userId) {
  if (!userId) throw new Error("Akun pengguna tidak ditemukan.");
  const client = requireCloud();
  const { data, error } = await client
    .from("site_members")
    .select("site_id,role,joined_at,sites(id,name,slug,description,status,is_public,blueprint,theme_key,settings,published_at,created_at,updated_at)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data || []).map(membershipSite).filter(Boolean);
}

export async function getUserProfile(userId) {
  if (!userId) throw new Error("Akun pengguna tidak ditemukan.");
  const client = requireCloud();
  const { data, error } = await client
    .from("profiles")
    .select("id,display_name,avatar_url,bio,website,locale,timezone,plan,updated_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId, values) {
  if (!userId) throw new Error("Akun pengguna tidak ditemukan.");
  const client = requireCloud();
  const payload = {
    id: userId,
    display_name: String(values.displayName || values.display_name || "").trim().slice(0, 120),
    bio: String(values.bio || "").trim().slice(0, 2000),
    website: String(values.website || "").trim().slice(0, 500) || null,
    avatar_url: String(values.avatarUrl || values.avatar_url || "").trim().slice(0, 2000) || null,
    locale: String(values.locale || "id-ID").slice(0, 20),
    timezone: String(values.timezone || "Asia/Jakarta").slice(0, 80),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id,display_name,avatar_url,bio,website,locale,timezone,plan,updated_at")
    .single();
  if (error) throw error;
  return data;
}

export async function createUserSite({ userId, name, slug, description = "", blueprint = "blog" }) {
  if (!userId) throw new Error("Akun pengguna tidak ditemukan.");
  const client = requireCloud();
  const cleanName = String(name || "").trim().slice(0, 100);
  if (cleanName.length < 2) throw new Error("Nama situs minimal 2 karakter.");
  const cleanSiteSlug = cleanSlug(slug || cleanName, "situs");
  if (cleanSiteSlug.length < 3) throw new Error("Subdomain minimal 3 karakter.");

  const { data: available, error: availabilityError } = await client.rpc("is_site_slug_available", {
    candidate: cleanSiteSlug,
    excluding_site: null,
  });
  if (availabilityError) throw availabilityError;
  if (!available) throw new Error("Subdomain sudah digunakan atau termasuk nama sistem.");

  const { data, error } = await client
    .from("sites")
    .insert({
      owner_id: userId,
      name: cleanName,
      slug: cleanSiteSlug,
      description: String(description || "").trim().slice(0, 1000),
      status: "draft",
      is_public: false,
      blueprint: String(blueprint || "blog").slice(0, 40),
      settings: { onboarding: "theme-studio", cloudflare: "wildcard-subdomain" },
    })
    .select("id,name,slug,description,status,is_public,blueprint,theme_key,settings,published_at,created_at,updated_at")
    .single();
  if (error) throw error;
  setActiveSiteId(data.id);
  return { ...data, role: "owner" };
}

export async function getOrCreatePrimarySite(user) {
  if (!user?.id) throw new Error("Akun pengguna tidak ditemukan.");
  const sites = await listUserSites(user.id);
  if (sites.length) {
    const preferredId = readActiveSiteId();
    const selected = sites.find((site) => site.id === preferredId) || sites[0];
    setActiveSiteId(selected.id);
    return selected;
  }

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Kreator";
  const baseSlug = cleanSlug(displayName, "situs");
  const created = await createUserSite({
    userId: user.id,
    name: `${displayName} Studio`,
    slug: `${baseSlug}-${shortId()}`,
    description: "Situs dibuat dengan Ngeblogging.",
    blueprint: "blog",
  });
  return created;
}

export async function listContentPage({ siteId, kind = null, search = "", cursor = null, pageSize = CONTENT_PAGE_SIZE }) {
  const client = requireCloud();
  const safeLimit = Math.min(100, Math.max(1, Number(pageSize) || CONTENT_PAGE_SIZE));
  let request = client
    .from("contents")
    .select("id, kind, title, slug, status, visibility, excerpt, updated_at, published_at")
    .eq("site_id", siteId)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit + 1);

  if (kind) request = request.eq("kind", kind);
  if (search.trim()) request = request.ilike("title", `%${search.trim().slice(0, 120)}%`);
  if (cursor?.updatedAt && cursor?.id) {
    request = request.or(`updated_at.lt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.lt.${cursor.id})`);
  }

  const { data, error } = await request;
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
  const client = requireCloud();
  const { data, error } = await client
    .from("contents")
    .select("id, kind, title, slug, body_html, excerpt, status, visibility, updated_at, published_at")
    .eq("id", contentId)
    .single();
  if (error) throw error;
  return recordToDocument(data, true);
}

export async function createContentDocument({ siteId, userId, type = "article" }) {
  const client = requireCloud();
  const title = type === "page" ? "Halaman tanpa judul" : "Artikel tanpa judul";
  const { data, error } = await client.from("contents").insert({
    site_id: siteId,
    author_id: userId,
    kind: type,
    title,
    slug: `${cleanSlug(title)}-${shortId()}`,
    status: "draft",
    visibility: "public",
    body_json: { type: "doc", version: 1 },
    body_html: "<h1>Mulai menulis…</h1><p>Tuangkan ide Anda di sini.</p>",
    seo: { index: true, follow: true },
  }).select("id, kind, title, slug, body_html, excerpt, status, visibility, updated_at, published_at").single();
  if (error) throw error;
  return recordToDocument(data, true);
}

export async function updateContentDocument(contentId, values) {
  const client = requireCloud();
  const payload = {};
  if (values.title !== undefined) payload.title = String(values.title).slice(0, 300);
  if (values.slug !== undefined) payload.slug = cleanSlug(values.slug, `konten-${shortId()}`);
  if (values.content !== undefined) {
    payload.body_html = String(values.content).slice(0, 5_000_000);
    payload.body_json = { type: "html", version: 1 };
  }
  if (values.status !== undefined) {
    payload.status = values.status;
    payload.published_at = values.status === "published" ? new Date().toISOString() : null;
  }
  if (values.visibility !== undefined) payload.visibility = values.visibility;
  if (values.excerpt !== undefined) payload.excerpt = String(values.excerpt).slice(0, 1000);
  if (Object.keys(payload).length === 0) return null;
  const { data, error } = await client.from("contents").update(payload).eq("id", contentId).select("updated_at, published_at").single();
  if (error) throw error;
  return data;
}

export async function deleteContentDocument(contentId) {
  const client = requireCloud();
  const { error } = await client.from("contents").delete().eq("id", contentId);
  if (error) throw error;
}

export async function loadSiteThemeState(siteId) {
  const client = requireCloud();
  const [settingsResult, versionsResult] = await Promise.all([
    client.from("site_theme_settings").select("active_theme_id, preview_theme_id, draft_config, published_config, code, updated_at").eq("site_id", siteId).maybeSingle(),
    client.from("site_theme_versions").select("client_version_id, note, active_theme_id, published_config, code, created_at").eq("site_id", siteId).order("created_at", { ascending: false }).limit(30),
  ]);
  if (settingsResult.error) throw settingsResult.error;
  if (versionsResult.error) throw versionsResult.error;
  if (!settingsResult.data) return null;
  const current = settingsResult.data;
  return {
    activeThemeId: current.active_theme_id,
    previewThemeId: current.preview_theme_id || current.active_theme_id,
    draftConfig: current.draft_config,
    publishedConfig: current.published_config,
    code: current.code,
    updatedAt: current.updated_at,
    history: (versionsResult.data || []).map((version) => ({
      id: version.client_version_id,
      note: version.note,
      activeThemeId: version.active_theme_id,
      publishedConfig: version.published_config,
      code: version.code,
      createdAt: version.created_at,
    })),
  };
}

export async function saveSiteThemeState(siteId, userId, state) {
  const client = requireCloud();
  const currentVersion = state.history?.[0];
  const { error: settingsError } = await client.from("site_theme_settings").upsert({
    site_id: siteId,
    active_theme_id: state.activeThemeId,
    preview_theme_id: state.previewThemeId,
    draft_config: state.draftConfig,
    published_config: state.publishedConfig,
    code: state.code,
    updated_by: userId,
  }, { onConflict: "site_id" });
  if (settingsError) throw settingsError;

  if (currentVersion?.id) {
    const { error: versionError } = await client.from("site_theme_versions").upsert({
      site_id: siteId,
      client_version_id: currentVersion.id,
      created_by: userId,
      note: currentVersion.note,
      active_theme_id: currentVersion.activeThemeId,
      published_config: currentVersion.publishedConfig,
      code: currentVersion.code,
      created_at: currentVersion.createdAt,
    }, { onConflict: "site_id,client_version_id", ignoreDuplicates: true });
    if (versionError) throw versionError;
  }
}

export async function saveSiteBlueprint(siteId, blueprint) {
  const client = requireCloud();
  const { error } = await client.from("sites").update({ blueprint }).eq("id", siteId);
  if (error) throw error;
}

export async function setSitePublication(siteId, published) {
  const client = requireCloud();
  const payload = {
    status: published ? "active" : "draft",
    is_public: Boolean(published),
    published_at: published ? new Date().toISOString() : null,
  };
  const { data, error } = await client
    .from("sites")
    .update(payload)
    .eq("id", siteId)
    .select("id, name, slug, description, status, blueprint, theme_key, settings, is_public, published_at")
    .single();
  if (error) throw error;
  return data;
}

export async function resolvePublishedSite({ slug = "", hostname = "" }) {
  const client = requireCloud();
  let siteId = null;
  if (hostname) {
    const { data: domain, error: domainError } = await client
      .from("site_domains")
      .select("site_id")
      .eq("hostname", hostname.toLowerCase())
      .eq("status", "active")
      .maybeSingle();
    if (domainError) throw domainError;
    siteId = domain?.site_id || null;
  }

  let siteRequest = client
    .from("sites")
    .select("id, name, slug, description, status, blueprint, theme_key, settings, locale")
    .eq("status", "active")
    .eq("is_public", true);
  siteRequest = siteId ? siteRequest.eq("id", siteId) : siteRequest.eq("slug", slug);
  const { data: site, error: siteError } = await siteRequest.maybeSingle();
  if (siteError) throw siteError;
  if (!site) return null;

  const { data: theme, error: themeError } = await client
    .from("site_theme_settings")
    .select("active_theme_id, published_config, code, updated_at")
    .eq("site_id", site.id)
    .maybeSingle();
  if (themeError) throw themeError;
  return { ...site, theme };
}

export async function listPublishedContent({ siteId, cursor = null, pageSize = 12 }) {
  const client = requireCloud();
  const safeLimit = Math.min(30, Math.max(1, Number(pageSize) || 12));
  let request = client
    .from("contents")
    .select("id, kind, title, slug, excerpt, featured_image_path, published_at, updated_at")
    .eq("site_id", siteId)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(safeLimit + 1);
  if (cursor?.publishedAt && cursor?.id) {
    request = request.or("published_at.lt." + cursor.publishedAt + ",and(published_at.eq." + cursor.publishedAt + ",id.lt." + cursor.id + ")");
  }
  const { data, error } = await request;
  if (error) throw error;
  const hasMore = data.length > safeLimit;
  const rows = data.slice(0, safeLimit);
  const last = rows.at(-1);
  return {
    contents: rows,
    hasMore,
    cursor: hasMore && last ? { publishedAt: last.published_at, id: last.id } : null,
  };
}

export async function getPublishedArticle(siteId, slug) {
  const client = requireCloud();
  const { data, error } = await client
    .from("contents")
    .select("id, kind, title, slug, body_html, excerpt, featured_image_path, published_at, updated_at")
    .eq("site_id", siteId)
    .eq("slug", slug)
    .eq("status", "published")
    .eq("visibility", "public")
    .maybeSingle();
  if (error) throw error;
  return data;
}
