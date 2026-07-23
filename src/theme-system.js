export const THEME_FILE_VERSION = 1;
export const THEME_STORAGE_KEY = "ngeblogging-theme-studio-v2";

export const SITE_BLUEPRINTS = [
  { id: "blog", label: "Blog", description: "Artikel, kategori, penulis, dan arsip." },
  { id: "website", label: "Website", description: "Halaman bisnis dan informasi profesional." },
  { id: "news", label: "Portal berita", description: "Breaking news, desk redaksi, dan rubrik." },
  { id: "community", label: "Komunitas", description: "Keanggotaan, ruang diskusi, dan aktivitas." },
  { id: "forum", label: "Forum", description: "Topik, balasan, moderasi, dan reputasi." },
  { id: "landing", label: "Landing page", description: "Kampanye fokus dengan konversi tinggi." },
  { id: "profile", label: "Profil", description: "Bio, tautan, karya, dan identitas digital." },
  { id: "diary", label: "Diary", description: "Catatan personal dengan privasi fleksibel." },
  { id: "portfolio", label: "Portofolio", description: "Karya, studi kasus, layanan, dan kontak." },
  { id: "knowledge", label: "Knowledge base", description: "Dokumentasi, panduan, dan pencarian." },
];

export const BUILT_IN_THEMES = [
  {
    id: "editorial-noir",
    name: "Editorial Noir",
    category: "Editorial",
    badge: "Signature",
    description: "Tipografi editorial berkelas untuk tulisan panjang dan media independen.",
    colors: { primary: "#171717", accent: "#d8a84e", surface: "#f7f2e8", ink: "#171717" },
    font: "Playfair Display",
    layout: "editorial",
    blueprints: ["blog", "news", "diary"],
    features: ["Mega menu", "Reading progress", "Rubrik pilihan"],
  },
  {
    id: "aurora-journal",
    name: "Aurora Journal",
    category: "Kreator",
    badge: "Limited",
    description: "Warna aurora halus dan ruang baca lapang untuk kreator modern.",
    colors: { primary: "#6847d9", accent: "#2dd4bf", surface: "#f5f2ff", ink: "#201a3b" },
    font: "DM Sans",
    layout: "journal",
    blueprints: ["blog", "profile", "diary"],
    features: ["Dark mode", "Newsletter", "Seri tulisan"],
  },
  {
    id: "chronicle-pro",
    name: "Chronicle Pro",
    category: "Berita",
    badge: "Newsroom",
    description: "Homepage padat, cepat, dan terstruktur untuk portal berita profesional.",
    colors: { primary: "#b4232c", accent: "#f0b429", surface: "#fffaf5", ink: "#172033" },
    font: "DM Sans",
    layout: "newsroom",
    blueprints: ["news", "blog"],
    features: ["Breaking ticker", "Multi desk", "Live update"],
  },
  {
    id: "obsidian-business",
    name: "Obsidian Business",
    category: "Bisnis",
    badge: "Executive",
    description: "Kesan tegas, eksklusif, dan terpercaya untuk merek serta perusahaan.",
    colors: { primary: "#192638", accent: "#b58b48", surface: "#f3f5f8", ink: "#192638" },
    font: "DM Sans",
    layout: "business",
    blueprints: ["website", "landing", "portfolio"],
    features: ["Service grid", "Case study", "Lead capture"],
  },
  {
    id: "velocity-launch",
    name: "Velocity Launch",
    category: "Landing",
    badge: "Conversion",
    description: "Landing page sinematik dengan hirarki CTA yang sangat jelas.",
    colors: { primary: "#275ee8", accent: "#ff6b47", surface: "#f4f8ff", ink: "#10233f" },
    font: "DM Sans",
    layout: "landing",
    blueprints: ["landing", "website", "profile"],
    features: ["Sticky CTA", "A/B ready", "Social proof"],
  },
  {
    id: "collective-hub",
    name: "Collective Hub",
    category: "Komunitas",
    badge: "Social",
    description: "Ruang hangat untuk komunitas, forum, acara, dan keanggotaan.",
    colors: { primary: "#136f63", accent: "#f29f67", surface: "#f1faf7", ink: "#153a37" },
    font: "DM Sans",
    layout: "community",
    blueprints: ["community", "forum", "knowledge"],
    features: ["Member feed", "Forum spaces", "Events"],
  },
  {
    id: "signal-forum",
    name: "Signal Forum",
    category: "Komunitas",
    badge: "Pro",
    description: "Forum cepat dengan fokus pada topik, jawaban, dan reputasi anggota.",
    colors: { primary: "#3757c5", accent: "#8b5cf6", surface: "#f6f7fc", ink: "#1f2a4a" },
    font: "DM Sans",
    layout: "forum",
    blueprints: ["forum", "community", "knowledge"],
    features: ["Solved topics", "Reputation", "Moderation"],
  },
  {
    id: "canvas-portfolio",
    name: "Canvas Portfolio",
    category: "Portofolio",
    badge: "Gallery",
    description: "Presentasi visual bersih untuk karya, proyek, dan studi kasus.",
    colors: { primary: "#111827", accent: "#ef5b5b", surface: "#fafafa", ink: "#111827" },
    font: "DM Sans",
    layout: "portfolio",
    blueprints: ["portfolio", "profile", "website"],
    features: ["Project gallery", "Case study", "Contact flow"],
  },
  {
    id: "mono-profile",
    name: "Mono Profile",
    category: "Minimal",
    badge: "Minimal",
    description: "Profil personal presisi tinggi yang ringan, cepat, dan berkarakter.",
    colors: { primary: "#111111", accent: "#4f7cff", surface: "#f5f5f3", ink: "#111111" },
    font: "DM Sans",
    layout: "profile",
    blueprints: ["profile", "portfolio", "landing"],
    features: ["Link hub", "Bio blocks", "Instant contact"],
  },
  {
    id: "paper-diary",
    name: "Paper Diary",
    category: "Personal",
    badge: "Calm",
    description: "Nuansa kertas dan catatan pribadi yang intim tanpa terasa kuno.",
    colors: { primary: "#74533b", accent: "#c77d55", surface: "#fbf5e9", ink: "#3f3027" },
    font: "Playfair Display",
    layout: "diary",
    blueprints: ["diary", "blog", "profile"],
    features: ["Private entries", "Mood archive", "Calendar"],
  },
  {
    id: "atlas-knowledge",
    name: "Atlas Knowledge",
    category: "Dokumentasi",
    badge: "Knowledge",
    description: "Dokumentasi berskala besar dengan pencarian dan navigasi bertingkat.",
    colors: { primary: "#0f5f92", accent: "#22a06b", surface: "#f2f8fb", ink: "#18334a" },
    font: "DM Sans",
    layout: "knowledge",
    blueprints: ["knowledge", "website", "community"],
    features: ["Command search", "Version docs", "TOC otomatis"],
  },
  {
    id: "neon-creator",
    name: "Neon Creator",
    category: "Kreator",
    badge: "New",
    description: "Identitas berani untuk kreator digital, newsletter, dan konten premium.",
    colors: { primary: "#17122d", accent: "#c8ff3d", surface: "#f6f5ff", ink: "#17122d" },
    font: "DM Sans",
    layout: "creator",
    blueprints: ["blog", "profile", "landing"],
    features: ["Paid content", "Creator shop", "Video hero"],
  },
];

const DEFAULT_CODE = {
  enabled: false,
  html: `<main class="custom-home">\n  <p class="eyebrow">NGEBlOGGING ORIGINAL</p>\n  <h1>Ruang digital untuk ide yang besar.</h1>\n  <p>Bangun cerita, komunitas, dan kehadiran digital Anda.</p>\n  <a href="#mulai">Mulai menjelajah</a>\n</main>`,
  css: `.custom-home { min-height: 100vh; display: grid; place-content: center; gap: 18px; padding: 8vw; background: #f7f2e8; color: #171717; }\n.custom-home h1 { max-width: 760px; margin: 0; font: 600 clamp(3rem, 8vw, 7rem)/.95 Georgia, serif; letter-spacing: -.06em; }\n.custom-home p { max-width: 560px; line-height: 1.7; }\n.custom-home .eyebrow { font: 700 .72rem/1 sans-serif; letter-spacing: .18em; color: #9a6c1f; }\n.custom-home a { width: max-content; padding: 13px 18px; border-radius: 999px; background: #171717; color: white; text-decoration: none; font: 700 .85rem sans-serif; }`,
  javascript: `document.querySelector('.custom-home a')?.addEventListener('click', (event) => {\n  event.preventDefault();\n  event.currentTarget.textContent = 'Tema siap diluncurkan ✓';\n});`,
};

export const DEFAULT_THEME_CONFIG = {
  brandName: "Ngeblogging Utama",
  primary: "#171717",
  accent: "#d8a84e",
  surface: "#f7f2e8",
  ink: "#171717",
  font: "Playfair Display",
  radius: 16,
  density: "comfortable",
  navigation: "centered",
  darkMode: true,
  mobileMenu: "bottom-sheet",
  customCss: "",
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validHex(value, fallback) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function validString(value, fallback, max = 10000) {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

function createHistoryEntry(state, note = "Versi tersimpan") {
  return {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    createdAt: new Date().toISOString(),
    note: validString(note, "Versi tersimpan", 120),
    activeThemeId: state.activeThemeId,
    publishedConfig: clone(state.publishedConfig),
    code: clone(state.code),
  };
}

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
    code: clone(DEFAULT_CODE),
    history: [],
    updatedAt: new Date().toISOString(),
  };
  state.history = [createHistoryEntry(state, "Versi awal")];
  return state;
}

export function normalizeThemeState(input) {
  const fallback = createDefaultThemeState();
  if (!input || typeof input !== "object" || Array.isArray(input)) return fallback;
  const activeThemeId = getTheme(input.activeThemeId).id;
  const normalizeConfig = (config, base) => ({
    ...base,
    ...(config && typeof config === "object" && !Array.isArray(config) ? config : {}),
    brandName: validString(config?.brandName, base.brandName, 100),
    primary: validHex(config?.primary, base.primary),
    accent: validHex(config?.accent, base.accent),
    surface: validHex(config?.surface, base.surface),
    ink: validHex(config?.ink, base.ink),
    radius: Math.min(32, Math.max(0, Number(config?.radius) || base.radius)),
    customCss: validString(config?.customCss, "", 50000),
  });
  const base = configFromTheme(getTheme(activeThemeId));
  const code = input.code && typeof input.code === "object" ? input.code : {};
  const normalized = {
    activeThemeId,
    previewThemeId: getTheme(input.previewThemeId || activeThemeId).id,
    draftConfig: normalizeConfig(input.draftConfig, base),
    publishedConfig: normalizeConfig(input.publishedConfig, base),
    code: {
      enabled: Boolean(code.enabled),
      html: validString(code.html, DEFAULT_CODE.html, 200000),
      css: validString(code.css, DEFAULT_CODE.css, 200000),
      javascript: validString(code.javascript, DEFAULT_CODE.javascript, 100000),
    },
    history: Array.isArray(input.history)
      ? input.history.filter((item) => item && typeof item === "object").slice(0, 30).map((item) => ({
          id: validString(item.id, `${Date.now()}-${Math.random()}`, 120),
          createdAt: validString(item.createdAt, new Date().toISOString(), 60),
          note: validString(item.note, "Versi tersimpan", 120),
          activeThemeId: getTheme(item.activeThemeId || activeThemeId).id,
          publishedConfig: normalizeConfig(item.publishedConfig, base),
          code: {
            enabled: Boolean(item.code?.enabled),
            html: validString(item.code?.html, DEFAULT_CODE.html, 200000),
            css: validString(item.code?.css, DEFAULT_CODE.css, 200000),
            javascript: validString(item.code?.javascript, DEFAULT_CODE.javascript, 100000),
          },
        }))
      : fallback.history,
    updatedAt: validString(input.updatedAt, new Date().toISOString(), 60),
  };
  if (normalized.history.length === 0) normalized.history = [createHistoryEntry(normalized, "Versi dipulihkan")];
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
    updatedAt: new Date().toISOString(),
  };
  next.history = [createHistoryEntry(next, `Mengaktifkan ${theme.name}`), ...normalized.history].slice(0, 30);
  return next;
}

export function publishThemeDraft(state, draftConfig, note = "Kustomisasi diterbitkan") {
  const normalized = normalizeThemeState(state);
  const next = normalizeThemeState({
    ...normalized,
    draftConfig,
    publishedConfig: draftConfig,
    updatedAt: new Date().toISOString(),
  });
  next.history = [createHistoryEntry(next, note), ...normalized.history].slice(0, 30);
  return next;
}

export function saveThemeCode(state, code) {
  const normalized = normalizeThemeState({ ...state, code: { ...code, enabled: true }, updatedAt: new Date().toISOString() });
  normalized.history = [createHistoryEntry(normalized, "Kode tema diperbarui"), ...state.history].slice(0, 30);
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
    updatedAt: new Date().toISOString(),
  });
  next.history = [createHistoryEntry(next, `Pulihkan: ${version.note}`), ...normalized.history].slice(0, 30);
  return next;
}

export function serializeThemeBackup(state) {
  return JSON.stringify({
    type: "ngeblogging-theme",
    version: THEME_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    theme: normalizeThemeState(state),
  }, null, 2);
}

export function parseThemeFile(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("File tema bukan JSON yang valid.");
  }
  if (payload?.type !== "ngeblogging-theme") throw new Error("Format file bukan tema Ngeblogging.");
  if (payload?.version !== THEME_FILE_VERSION) throw new Error("Versi file tema belum didukung.");
  if (!payload.theme || typeof payload.theme !== "object") throw new Error("Isi tema tidak ditemukan.");
  const imported = normalizeThemeState(payload.theme);
  imported.history = [createHistoryEntry(imported, "Tema diimpor"), ...imported.history].slice(0, 30);
  imported.updatedAt = new Date().toISOString();
  return imported;
}

export function buildThemeSrcDoc(code, config = DEFAULT_THEME_CONFIG) {
  const safeScript = validString(code?.javascript, "", 100000).replace(/<\/script/gi, "<\\/script");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;min-height:100%;font-family:${JSON.stringify(config.font || "DM Sans")},sans-serif}${validString(code?.css, "", 200000)}${validString(config.customCss, "", 50000)}</style></head><body>${validString(code?.html, "", 200000)}<script>${safeScript}<\/script></body></html>`;
}
