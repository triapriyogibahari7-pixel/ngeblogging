import { supabase, supabaseConfigured } from "./supabase.js";

function client() {
  if (!supabaseConfigured || !supabase) throw new Error("Penyimpanan cloud belum dikonfigurasi.");
  return supabase;
}

export async function loadSiteThemeState(siteId) {
  const db = client();
  const [settingsResult, versionsResult] = await Promise.all([
    db.from("site_theme_settings").select("active_theme_id,preview_theme_id,draft_config,published_config,code,widgets,updated_at").eq("site_id", siteId).maybeSingle(),
    db.from("site_theme_versions").select("client_version_id,note,active_theme_id,published_config,code,widgets,created_at").eq("site_id", siteId).order("created_at", { ascending: false }).limit(50),
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
    widgets: current.widgets,
    updatedAt: current.updated_at,
    history: (versionsResult.data || []).map((version) => ({
      id: version.client_version_id,
      note: version.note,
      activeThemeId: version.active_theme_id,
      publishedConfig: version.published_config,
      code: version.code,
      widgets: version.widgets,
      createdAt: version.created_at,
    })),
  };
}

export async function saveSiteThemeState(siteId, userId, state) {
  const db = client();
  const currentVersion = state.history?.[0];
  const { error: settingsError } = await db.from("site_theme_settings").upsert({
    site_id: siteId,
    active_theme_id: state.activeThemeId,
    preview_theme_id: state.previewThemeId,
    draft_config: state.draftConfig,
    published_config: state.publishedConfig,
    code: state.code,
    widgets: state.widgets,
    updated_by: userId,
  }, { onConflict: "site_id" });
  if (settingsError) throw settingsError;

  if (currentVersion?.id) {
    const { error: versionError } = await db.from("site_theme_versions").upsert({
      site_id: siteId,
      client_version_id: currentVersion.id,
      created_by: userId,
      note: currentVersion.note,
      active_theme_id: currentVersion.activeThemeId,
      published_config: currentVersion.publishedConfig,
      code: currentVersion.code,
      widgets: currentVersion.widgets,
      created_at: currentVersion.createdAt,
    }, { onConflict: "site_id,client_version_id", ignoreDuplicates: true });
    if (versionError) throw versionError;
  }
}

export async function saveSiteBlueprint(siteId, blueprint) {
  const { error } = await client().from("sites").update({ blueprint }).eq("id", siteId);
  if (error) throw error;
}
