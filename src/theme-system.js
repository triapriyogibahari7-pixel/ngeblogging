import { BUILT_IN_THEMES, THEME_COUNT, themeCodeFor } from "./theme-catalog.js";
import { createDefaultWidgetState, normalizeWidgetState, widgetsMarkup } from "./widget-system.js";

export { BUILT_IN_THEMES, THEME_COUNT };
export const THEME_FILE_VERSION = 2;
export const THEME_STORAGE_KEY = "ngeblogging-theme-studio-v3";

export const SITE_BLUEPRINTS = [
  { id: "blog", label: "Blog", description: "Posts, kategori, penulis, dan arsip." },
  { id: "website", label: "Website", description: "Pages bisnis dan informasi profesional." },
  { id: "news", label: "Portal berita", description: "Breaking news, desk redaksi, dan rubrik." },
  { id: "community", label: "Komunitas", description: "Keanggotaan, ruang diskusi, dan aktivitas." },
  { id: "forum", label: "Forum", description: "Topik, balasan, moderasi, dan reputasi." },
  { id: "landing", label: "Landing page", description: "Kampanye fokus dengan konversi tinggi." },
  { id: "profile", label: "Profil", description: "Bio, tautan, karya, dan identitas digital." },
  { id: "diary", label: "Diary", description: "Catatan personal dengan privasi fleksibel." },
  { id: "portfolio", label: "Portofolio", description: "Karya, studi kasus, layanan, dan kontak." },
  { id: "knowledge", label: "Knowledge base", description: "Dokumentasi, panduan, dan pencarian." },
];

export const DEFAULT_THEME_CONFIG = {
  brandName: "Ngeblogging Utama",
  primary: "hsl(218 64% 38%)",
  accent: "hsl(38 78% 48%)",
  surface: "hsl(226 34% 97%)",
  ink: "hsl(222 34% 14%)",
  font: "DM Sans",
  radius: 10,
  density: "comfortable",
  navigation: "centered",
  darkMode: false,
  mobileMenu: "drawer",
  customCss: "",
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const validString = (value, fallback, max = 10000) => typeof value === "string" ? value.slice(0, max) : fallback;
const validColor = (value, fallback) => typeof value === "string" && (/^#[0-9a-f]{6}$/i.test(value) || /^hsl\([^)]+\)$/i.test(value)) ? value : fallback;

export function getTheme(themeId) {
  return BUILT_IN_THEMES.find((theme) => theme.id === themeId) || BUILT_IN_THEMES[0];
}

export function configFromTheme(theme, previous = DEFAULT_THEME_CONFIG) {
  return {
    ...DEFAULT_THEME_CONFIG,
    ...previous,
    primary: theme.colors.primary,
    accent: theme.colors.accent,
    surface: theme.colors.surface,
    ink: theme.colors.ink,
    font: theme.font,
    radius: theme.radius,
  };
}

function normalizeCode(code, fallbackTheme) {
  const fallback = themeCodeFor(fallbackTheme);
  return {
    enabled: Boolean(code?.enabled),
    html: validString(code?.html, fallback.html, 350000),
    css: validString(code?.css, fallback.css, 350000),
    javascript: validString(code?.javascript, fallback.javascript, 120000),
  };
}

function normalizeConfig(config, base) {
  const source = config && typeof config === "object" && !Array.isArray(config) ? config : {};
  return {
    ...base,
    ...source,
    brandName: validString(source.brandName, base.brandName, 100),
    primary: validColor(source.primary, base.primary),
    accent: validColor(source.accent, base.accent),
    surface: validColor(source.surface, base.surface),
    ink: validColor(source.ink, base.ink),
    radius: Math.min(40, Math.max(0, Number(source.radius) || base.radius)),
    customCss: validString(source.customCss, "", 80000),
    density: ["compact", "comfortable", "spacious"].includes(source.density) ? source.density : base.density,
    navigation: ["centered", "split", "sidebar"].includes(source.navigation) ? source.navigation : base.navigation,
    mobileMenu: ["bottom-sheet", "drawer", "fullscreen"].includes(source.mobileMenu) ? source.mobileMenu : base.mobileMenu,
    darkMode: Boolean(source.darkMode),
  };
}

function createHistoryEntry(state, note = "Versi tersimpan") {
  return {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    createdAt: new Date().toISOString(),
    note: validString(note, "Versi tersimpan", 120),
    activeThemeId: state.activeThemeId,
    publishedConfig: clone(state.publishedConfig),
    code: clone(state.code),
    widgets: clone(state.widgets),
  };
}

export function createDefaultThemeState() {
  const theme = BUILT_IN_THEMES[0];
  const config = configFromTheme(theme);
  const state = {
    activeThemeId: theme.id,
    previewThemeId: theme.id,
    draftConfig: clone(config),
    publishedConfig: clone(config),
    code: clone(theme.code),
    widgets: createDefaultWidgetState(theme.defaultWidgetIds),
    history: [],
    updatedAt: new Date().toISOString(),
  };
  state.history = [createHistoryEntry(state, "Versi awal")];
  return state;
}

export function normalizeThemeState(input) {
  const fallback = createDefaultThemeState();
  if (!input || typeof input !== "object" || Array.isArray(input)) return fallback;
  const activeTheme = getTheme(input.activeThemeId);
  const base = configFromTheme(activeTheme);
  const normalized = {
    activeThemeId: activeTheme.id,
    previewThemeId: getTheme(input.previewThemeId || activeTheme.id).id,
    draftConfig: normalizeConfig(input.draftConfig, base),
    publishedConfig: normalizeConfig(input.publishedConfig, base),
    code: normalizeCode(input.code, activeTheme),
    widgets: normalizeWidgetState(input.widgets, activeTheme.defaultWidgetIds),
    history: [],
    updatedAt: validString(input.updatedAt, new Date().toISOString(), 60),
  };
  normalized.history = Array.isArray(input.history) ? input.history.filter(Boolean).slice(0, 50).map((item) => {
    const versionTheme = getTheme(item.activeThemeId || activeTheme.id);
    const versionBase = configFromTheme(versionTheme);
    return {
      id: validString(item.id, `${Date.now()}-${Math.random()}`, 120),
      createdAt: validString(item.createdAt, new Date().toISOString(), 60),
      note: validString(item.note, "Versi tersimpan", 120),
      activeThemeId: versionTheme.id,
      publishedConfig: normalizeConfig(item.publishedConfig, versionBase),
      code: normalizeCode(item.code, versionTheme),
      widgets: normalizeWidgetState(item.widgets, versionTheme.defaultWidgetIds),
    };
  }) : fallback.history;
  if (!normalized.history.length) normalized.history = [createHistoryEntry(normalized, "Versi dipulihkan")];
  return normalized;
}

export function loadThemeState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(THEME_STORAGE_KEY);
    return raw ? normalizeThemeState(JSON.parse(raw)) : createDefaultThemeState();
  } catch {
    return createDefaultThemeState();
  }
}

export function saveThemeState(state, storage = globalThis.localStorage) {
  const normalized = normalizeThemeState(state);
  storage?.setItem?.(THEME_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function activateTheme(state, themeId) {
  const normalized = normalizeThemeState(state);
  const theme = getTheme(themeId);
  const publishedConfig = configFromTheme(theme, normalized.publishedConfig);
  const next = {
    ...normalized,
    activeThemeId: theme.id,
    previewThemeId: theme.id,
    draftConfig: clone(publishedConfig),
    publishedConfig,
    code: clone(theme.code),
    widgets: createDefaultWidgetState(theme.defaultWidgetIds),
    updatedAt: new Date().toISOString(),
  };
  next.history = [createHistoryEntry(next, `Mengaktifkan ${theme.name}`), ...normalized.history].slice(0, 50);
  return next;
}

export function publishThemeDraft(state, draftConfig, widgets = state.widgets, note = "Kustomisasi diterbitkan") {
  const normalized = normalizeThemeState(state);
  const next = normalizeThemeState({ ...normalized, draftConfig, publishedConfig: draftConfig, widgets, updatedAt: new Date().toISOString() });
  next.history = [createHistoryEntry(next, note), ...normalized.history].slice(0, 50);
  return next;
}

export function saveThemeCode(state, code) {
  const normalized = normalizeThemeState({ ...state, code: { ...code, enabled: true }, updatedAt: new Date().toISOString() });
  normalized.history = [createHistoryEntry(normalized, "Kode tema diperbarui"), ...normalizeThemeState(state).history].slice(0, 50);
  return normalized;
}

export function saveThemeWidgets(state, widgets) {
  const normalized = normalizeThemeState({ ...state, widgets, updatedAt: new Date().toISOString() });
  normalized.history = [createHistoryEntry(normalized, "Widget tema diperbarui"), ...normalizeThemeState(state).history].slice(0, 50);
  return normalized;
}

export function restoreThemeVersion(state, versionId) {
  const normalized = normalizeThemeState(state);
  const version = normalized.history.find((item) => item.id === versionId);
  if (!version) throw new Error("Versi tema tidak ditemukan.");
  const next = normalizeThemeState({
    ...normalized,
    activeThemeId: version.activeThemeId,
    previewThemeId: version.activeThemeId,
    draftConfig: version.publishedConfig,
    publishedConfig: version.publishedConfig,
    code: version.code,
    widgets: version.widgets,
    updatedAt: new Date().toISOString(),
  });
  next.history = [createHistoryEntry(next, `Pulihkan: ${version.note}`), ...normalized.history].slice(0, 50);
  return next;
}

export function serializeThemeBackup(state) {
  return JSON.stringify({ type: "ngeblogging-theme", version: THEME_FILE_VERSION, exportedAt: new Date().toISOString(), theme: normalizeThemeState(state) }, null, 2);
}

export function parseThemeFile(text) {
  let payload;
  try { payload = JSON.parse(text); } catch { throw new Error("File tema bukan JSON yang valid."); }
  if (payload?.type !== "ngeblogging-theme") throw new Error("Format file bukan tema Ngeblogging.");
  if (![1, THEME_FILE_VERSION].includes(payload?.version)) throw new Error("Versi file tema belum didukung.");
  if (!payload.theme || typeof payload.theme !== "object") throw new Error("Isi tema tidak ditemukan.");
  const imported = normalizeThemeState(payload.theme);
  imported.history = [createHistoryEntry(imported, "Tema diimpor"), ...imported.history].slice(0, 50);
  imported.updatedAt = new Date().toISOString();
  return imported;
}

export function buildThemeSrcDoc(code, config = DEFAULT_THEME_CONFIG, widgets = []) {
  const safeScript = validString(code?.javascript, "", 120000).replace(/<\/script/gi, "<\\/script");
  const html = validString(code?.html, "", 350000);
  const beforeFooter = widgetsMarkup(widgets, "after-content");
  const footerWidgets = widgetsMarkup(widgets, "footer");
  const sidebarWidgets = widgetsMarkup(widgets, "sidebar");
  const composed = `${sidebarWidgets ? `<aside class="ng-widget-area sidebar">${sidebarWidgets}</aside>` : ""}${html}${beforeFooter ? `<section class="ng-widget-area after-content">${beforeFooter}</section>` : ""}${footerWidgets ? `<section class="ng-widget-area footer">${footerWidgets}</section>` : ""}`;
  const css = `${validString(code?.css, "", 350000)}${validString(config.customCss, "", 80000)}.ng-widget-area{display:grid;gap:16px;padding:24px clamp(18px,5vw,70px)}.ng-widget{padding:20px;border:1px solid color-mix(in srgb,currentColor,transparent 82%);border-radius:14px}.ng-widget form{display:flex;gap:8px;flex-wrap:wrap}.ng-widget input,.ng-widget textarea,.ng-widget select{max-width:100%;padding:10px;border:1px solid #9996;border-radius:8px}.widget-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.widget-gallery i{aspect-ratio:1;background:currentColor;opacity:.12;border-radius:8px}`;
  const csp = "default-src 'none'; img-src https: data: blob:; media-src https: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src https: data:; connect-src https:; form-action https:; base-uri 'none'; frame-ancestors 'none'";
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><style>html,body{margin:0;min-height:100%;font-family:${JSON.stringify(config.font || "DM Sans")},sans-serif}${css}</style></head><body>${composed}<script>${safeScript}<\/script></body></html>`;
}
