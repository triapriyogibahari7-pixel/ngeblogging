import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v229-layout-editor-sidebar-nara-20260803";
const ACTIVE_VERSION = "ngeblogging-app-v229-layout-editor-sidebar-nara-20260803";
const ACTIVE_CACHE = "layout-editor-sidebar-nara-cache-v229";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V229_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const line = 'import "./studio-production-v229.js";';
  if (!source.includes(line)) {
    const anchor = 'import "./studio-production-v228.js";';
    if (!source.includes(anchor)) throw new Error("V229_STUDIO_ENTRY_V228_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${line}`);
  }
  if (source.indexOf('studio-production-v229.js') < source.indexOf('studio-production-v228.js')) {
    throw new Error("V229_ENTRY_ORDER_INVALID");
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  const lines = [
    `const ACTIVE_VERSION_V229 = "${ACTIVE_VERSION}";`,
    `const ACTIVE_CACHE_RELEASE_V229 = "${ACTIVE_CACHE}";`,
    `const STUDIO_PRODUCTION_RELEASE_V229 = "${RELEASE}";`,
  ];
  for (const line of lines) source = insertAfterVersion(source, line);

  const oldShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V228}-${ACTIVE_CACHE_RELEASE_V228}-${AUTH_HANDOFF_RELEASE}-shell`;';
  const nextShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V229}-${ACTIVE_CACHE_RELEASE_V229}-${AUTH_HANDOFF_RELEASE}-shell`;';
  if (!source.includes(nextShell)) {
    if (!source.includes(oldShell)) throw new Error("V229_SHELL_CACHE_V228_ANCHOR_MISSING");
    source = source.replace(oldShell, nextShell);
  }

  const oldAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V228}-${ACTIVE_CACHE_RELEASE_V228}-${AUTH_HANDOFF_RELEASE}-assets`;';
  const nextAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V229}-${ACTIVE_CACHE_RELEASE_V229}-${AUTH_HANDOFF_RELEASE}-assets`;';
  if (!source.includes(nextAsset)) {
    if (!source.includes(oldAsset)) throw new Error("V229_ASSET_CACHE_V228_ANCHOR_MISSING");
    source = source.replace(oldAsset, nextAsset);
  }

  source = source
    .replace("    version: ACTIVE_VERSION_V228,", "    version: ACTIVE_VERSION_V229,")
    .replace("    release: ACTIVE_CACHE_RELEASE_V228,", "    release: ACTIVE_CACHE_RELEASE_V229,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V228", "NGE_BLOGGING_UPDATE_AVAILABLE_V229")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v229 announces the new shell without force-navigation; authenticated sessions and drafts remain intact.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V229_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V229_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  for (const marker of [ACTIVE_VERSION,ACTIVE_CACHE,RELEASE,nextShell,nextAsset]) {
    if (!source.includes(marker)) throw new Error(`V229_ACTIVE_CACHE_MISSING:${marker}`);
  }
  await write(path, source);
}

async function verify() {
  const [entry,runtime,css,theme,nara,auth,analytics,worker,release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v229.js"),
    read("src/studio-production-v229.css"),
    read("src/ThemeStudio.jsx"),
    read("src/NaraAssistant.jsx"),
    read("src/lib/supabase.js"),
    read("src/studio-analytics-v41.js"),
    read("public/sw.js"),
    read("public/release-v229.json"),
  ]);

  const checks = [
    [entry,"studio-production-v229.js"],
    [runtime,RELEASE],
    [runtime,"reference-blueprint-interactive"],
    [runtime,"actual-1-to-10000"],
    [runtime,"five-action-dropdown"],
    [runtime,"camera-photo-file"],
    [css,'data-v229-layout-canvas="scaled-reference-small"'],
    [css,'data-v229-workspace="preview-top-code-bottom"'],
    [css,'data-v229-workspace="code-left-preview-right"'],
    [css,'data-v229-sidebar="desktop-icons"'],
    [css,'data-v229-attachment-menu="fixed-visible"'],
    [theme,'data-v226-layout-source="native-green-reference"'],
    [theme,"preferredArea={widgetArea}"],
    [theme,"tn-widget-custom-code-v209"],
    [nara,"Kamera"],[nara,"Foto"],[nara,"File teks"],[nara,"Nara Vision"],[nara,"Maksimal"],
    [auth,"persistSession: true"],[auth,"autoRefreshToken: true"],
    [analytics,"get_site_analytics_dashboard"],
    [worker,ACTIVE_VERSION],[worker,ACTIVE_CACHE],[worker,RELEASE],
    [release,RELEASE],
  ];
  for (const [source,marker] of checks) if (!source.includes(marker)) throw new Error(`V229_VERIFY_FAILED:${marker}`);

  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((themeItem) => themeItem.id)).size !== 100) {
    throw new Error("V229_THEME_COUNT_REGRESSION");
  }
  if (WIDGET_COUNT !== 26 || BUILT_IN_WIDGETS.at(-1)?.id !== "custom-html") throw new Error("V229_WIDGET_COUNT_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V229_DESTRUCTIVE_SESSION_ACTION");
}

await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}; active cache rotated to v229 while v228 remains a compatibility authority.`);
