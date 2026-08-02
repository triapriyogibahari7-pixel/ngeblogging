import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v207-20260802";
const SW_VERSION = "ngeblogging-app-v207-mobile-layout-nara-live-20260802";
const SW_CACHE = "mobile-layout-nara-live-cache-v207";
const SW_REFRESH = "mobile-layout-nara-live-v207";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V207_SW_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-production-v207.js";')) {
    const anchor = 'import "./studio-production-v206.js";';
    if (!source.includes(anchor)) throw new Error("V207_V206_ENTRY_MISSING");
    source = source.replace(anchor, `${anchor}\nimport "./studio-production-v207.js";`);
    await write(path, source);
  }
}

async function patchThemePreview() {
  const path = "src/ThemeStudio.jsx";
  let source = await read(path);
  if (source.includes("tn-preview-loading-v207")) return;

  const oldPreview = '<ThemeFrame theme={previewTheme} code={previewTheme.id === activeTheme.id ? themeState.code : previewTheme.code} config={previewTheme.id === activeTheme.id ? themeState.publishedConfig : undefined} widgets={previewTheme.id === activeTheme.id ? themeState.widgets : createDefaultWidgetState(previewTheme.defaultWidgetIds)} device={device}/>';
  const newPreview = '{syncStatus === "loading" ? <div className="tn-preview-loading-v207" role="status" aria-live="polite"><div><b>Menyiapkan pratinjau tema…</b><small>Memuat konfigurasi tema tersinkron sebelum memasang preview agar situs tidak terlihat memuat dua kali.</small></div></div> : <ThemeFrame theme={previewTheme} code={previewTheme.id === activeTheme.id ? themeState.code : previewTheme.code} config={previewTheme.id === activeTheme.id ? themeState.publishedConfig : undefined} widgets={previewTheme.id === activeTheme.id ? themeState.widgets : createDefaultWidgetState(previewTheme.defaultWidgetIds)} device={device}/>}' ;

  if (!source.includes(oldPreview)) throw new Error("V207_THEME_PREVIEW_ANCHOR_MISSING");
  source = source.replace(oldPreview, newPreview);
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${SW_VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${SW_CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${SW_REFRESH}";`);
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V206", "NGE_BLOGGING_UPDATE_AVAILABLE_V207");
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V205_HOTFIX", "NGE_BLOGGING_UPDATE_AVAILABLE_V207");
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V205", "NGE_BLOGGING_UPDATE_AVAILABLE_V207");

  for (const marker of [
    `const STUDIO_PRODUCTION_RELEASE_V207 = "${RELEASE}";`,
    'const STUDIO_PRODUCTION_COMPAT_RELEASE_V206 = "studio-production-v206-20260802";',
    'const STUDIO_PRODUCTION_COMPAT_VERSION_V206 = "ngeblogging-app-v206-native-theme-nara-session-20260802";',
    'const STUDIO_PRODUCTION_COMPAT_CACHE_V206 = "native-theme-nara-session-cache-v206";',
  ]) source = insertAfterVersion(source, marker);

  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v207 update notification only; never force navigation through auth/editor state.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V207_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V207_DESTRUCTIVE_SESSION_ACTION_FOUND");
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", 'import "./studio-production-v207.js";'],
    ["src/studio-production-v207.js", RELEASE],
    ["src/studio-production-v207.js", "normalizeLayoutMap"],
    ["src/studio-production-v207.css", 'grid-template-areas: none !important'],
    ["src/studio-production-v207.css", 'writing-mode: horizontal-tb !important'],
    ["src/studio-production-v207.css", 'grid-template-areas: "attach mic spacer send" "intel intel model model" !important'],
    ["src/ThemeStudio.jsx", "tn-preview-loading-v207"],
    ["src/NaraAssistant.jsx", "nara-attachment-menu-wrap"],
    ["src/lib/supabase.js", "persistSession: true"],
    ["src/lib/supabase.js", "autoRefreshToken: true"],
    ["public/release-v207.json", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V207_VERIFY_FAILED:${path}:${marker}`);
  }
  const runtime = await read("src/studio-production-v207.js");
  if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|createUserSite|getOrCreatePrimarySite/.test(runtime)) {
    throw new Error("V207_RUNTIME_MUST_NOT_MUTATE_SESSION_OR_CREATE_SITE");
  }
}

await patchStudioEntry();
await patchThemePreview();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
