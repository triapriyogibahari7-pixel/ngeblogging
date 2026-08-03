import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v232-single-n-theme-actions-20260803";
const ACTIVE_VERSION = "ngeblogging-app-v232-single-n-theme-actions-20260803";
const ACTIVE_CACHE = "single-n-theme-actions-cache-v232";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V232_SW_VERSION_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const v231 = 'import "./studio-production-v231.js";';
  const v232 = 'import "./studio-production-v232.js";';
  if (!source.includes(v231)) {
    const anchor = 'import "./studio-production-v230.js";';
    if (!source.includes(anchor)) throw new Error("V232_ENTRY_V231_AND_V230_MISSING");
    source = source.replace(anchor, `${anchor}\n${v231}`);
  }
  if (!source.includes(v232)) source = source.replace(v231, `${v231}\n${v232}`);
  if (source.indexOf("studio-production-v232.js") < source.indexOf("studio-production-v231.js")) throw new Error("V232_ENTRY_ORDER_INVALID");
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  for (const line of [
    `const ACTIVE_VERSION_V232 = "${ACTIVE_VERSION}";`,
    `const ACTIVE_CACHE_RELEASE_V232 = "${ACTIVE_CACHE}";`,
    `const STUDIO_PRODUCTION_RELEASE_V232 = "${RELEASE}";`,
  ]) source = insertAfterVersion(source, line);

  const oldShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V231}-${ACTIVE_CACHE_RELEASE_V231}-${AUTH_HANDOFF_RELEASE}-shell`;';
  const nextShell = 'const SHELL_CACHE = `${ACTIVE_VERSION_V232}-${ACTIVE_CACHE_RELEASE_V232}-${AUTH_HANDOFF_RELEASE}-shell`;';
  if (!source.includes(nextShell)) {
    if (!source.includes(oldShell)) throw new Error("V232_SHELL_CACHE_V231_ANCHOR_MISSING");
    source = source.replace(oldShell, nextShell);
  }
  const oldAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V231}-${ACTIVE_CACHE_RELEASE_V231}-${AUTH_HANDOFF_RELEASE}-assets`;';
  const nextAsset = 'const ASSET_CACHE = `${ACTIVE_VERSION_V232}-${ACTIVE_CACHE_RELEASE_V232}-${AUTH_HANDOFF_RELEASE}-assets`;';
  if (!source.includes(nextAsset)) {
    if (!source.includes(oldAsset)) throw new Error("V232_ASSET_CACHE_V231_ANCHOR_MISSING");
    source = source.replace(oldAsset, nextAsset);
  }

  source = source
    .replace("    version: ACTIVE_VERSION_V231,", "    version: ACTIVE_VERSION_V232,")
    .replace("    release: ACTIVE_CACHE_RELEASE_V231,", "    release: ACTIVE_CACHE_RELEASE_V232,")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V231", "NGE_BLOGGING_UPDATE_AVAILABLE_V232")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v232 announces the fresh shell without force-navigation or logout.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V232_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V232_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  for (const marker of [ACTIVE_VERSION, ACTIVE_CACHE, RELEASE, nextShell, nextAsset]) if (!source.includes(marker)) throw new Error(`V232_SW_MARKER_MISSING:${marker}`);
  await write(path, source);
}

async function verify() {
  const [entry,runtime,css,auth,nara,theme,analytics,release] = await Promise.all([
    read("src/Studio.jsx"), read("src/studio-production-v232.js"), read("src/studio-production-v232.css"),
    read("src/lib/supabase.js"), read("src/NaraAssistant.jsx"), read("src/ThemeStudio.jsx"),
    read("src/studio-analytics-v41.js"), read("public/release-v232.json"),
  ]);
  const checks = [
    [entry,"studio-production-v231.js"],[entry,"studio-production-v232.js"],[runtime,RELEASE],
    [runtime,"desktop-site-large"],[runtime,"tight-under-create"],[runtime,"v232-theme-code-actions"],
    [runtime,"Edit JavaScript"],[runtime,"camera-photo-file"],[runtime,"full-row"],
    [css,'data-v232-family="large"'],[css,'data-v232-family="small"'],[css,"code-left-preview-right"],
    [css,"preview-top-code-bottom"],[css,"nara-attachment-menu"],[css,"v232-theme-code-actions"],
    [auth,"persistSession: true"],[auth,"autoRefreshToken: true"],
    [nara,"Kamera"],[nara,"Foto"],[nara,"File teks"],[nara,"Pertanyaan suara"],[nara,"Tingkat kecerdasan"],[nara,"Model Nara"],
    [theme,'data-v226-layout-source="native-green-reference"'],[theme,'data-v226-green-map="four-left-post-four-right"'],
    [analytics,"get_site_analytics_dashboard"],[release,RELEASE],
  ];
  for (const [source,marker] of checks) if (!source.includes(marker)) throw new Error(`V232_VERIFY_FAILED:${marker}`);
  if (entry.indexOf("studio-production-v231.js") > entry.indexOf("studio-production-v232.js")) throw new Error("V232_ENTRY_NOT_FINAL");
  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((item) => item.id)).size !== 100) throw new Error("V232_THEME_COUNT_REGRESSION");
  if (WIDGET_COUNT !== 26 || BUILT_IN_WIDGETS.length !== 26 || BUILT_IN_WIDGETS.at(-1)?.id !== "custom-html") throw new Error("V232_WIDGET_COUNT_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V232_DESTRUCTIVE_SESSION_ACTION");
}

await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}; v231 remains compatibility authority and v232 owns the current screenshot behavior.`);
