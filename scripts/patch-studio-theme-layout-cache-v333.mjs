import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-layout-single-v332.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-layout-single-v332.css", import.meta.url);
const release332File = new URL("../public/release-v332.json", import.meta.url);
const release333File = new URL("../public/release-v333.json", import.meta.url);

const RELEASE = "studio-theme-layout-single-cache-v333-20260807";
const LAYOUT_RELEASE = "studio-theme-layout-single-v332-20260807";
const VERSION = "ngeblogging-app-v333-theme-layout-single-20260807";
const CACHE = "studio-theme-layout-single-cache-v333";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V333_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [entry, runtime, css, release332, release333] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(release332File, "utf8"),
  readFile(release333File, "utf8"),
]);

for (const marker of [
  'import "./studio-theme-layout-single-v332.js"',
  "STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332",
]) if (!entry.includes(marker)) throw new Error(`V333_ENTRY_MISSING:${marker}`);

for (const marker of [
  LAYOUT_RELEASE,
  'const LEGACY_MAP_SELECTOR = ".tn-layout-map-v264"',
  '"single-v264-reference"',
  '"single-v312-editorial-fallback"',
  'modelGroups.forEach(hideNode)',
  'v312Maps.forEach((map) => hideNode',
]) if (!runtime.includes(marker)) throw new Error(`V333_SINGLE_MAP_RUNTIME_MISSING:${marker}`);

for (const marker of [
  "--studio-theme-layout-single-v332",
  '[data-v332-layout-state="hidden"]',
  'data-theme-map-authority-v332="single-v264-reference"',
  "grid-template-columns:minmax(150px,.9fr) minmax(330px,2fr) minmax(150px,.9fr)",
  "writing-mode:horizontal-tb!important",
]) if (!css.includes(marker)) throw new Error(`V333_SINGLE_MAP_CSS_MISSING:${marker}`);

for (const marker of [
  LAYOUT_RELEASE,
  '"visibleLayoutMaps": 1',
  '"preferredAuthority": "v264-reference-map"',
  '"postPageCentered": true',
  '"leftWidgetSlots": 4',
  '"rightWidgetSlots": 4',
]) if (!release332.includes(marker)) throw new Error(`V333_RELEASE332_INVALID:${marker}`);

for (const marker of [
  RELEASE,
  '"serviceWorkerCacheRotated": true',
  '"reason": "v332 runtime was deployed while the service-worker cache authority was still v330"',
  '"layoutMapsVisible": 1',
  '"runtimeUiScope": "Theme layout map only"',
]) if (!release333.includes(marker)) throw new Error(`V333_RELEASE_INVALID:${marker}`);

let sw = await readFile(swFile, "utf8");
for (const inherited of [
  "STUDIO_THEME_CODE_DEVICE_RELEASE_V330",
  "STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325",
  "POSTS_PAGES_30000_RELEASE_V322",
  "STUDIO_THEME_DOMAIN_RELEASE_V321",
  "AUTH_CALLBACK_RECOVERY_RELEASE_V315",
  "STUDIO_NARA_NONMODAL_RELEASE_V313",
  "AUTH_SESSION_HANDOFF_RELEASE_V292",
]) if (!sw.includes(inherited)) throw new Error(`V333_SW_INHERITANCE_MISSING:${inherited}`);

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V330", "NGE_BLOGGING_UPDATE_AVAILABLE_V333")
  .replaceAll("service-worker-activated-theme-code-device-v330", "service-worker-activated-theme-layout-single-v333");

sw = upsert(sw, "STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332", `"${LAYOUT_RELEASE}"`);
sw = upsert(sw, "STUDIO_THEME_LAYOUT_SINGLE_CACHE_RELEASE_V333", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V333", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V333", "CACHE_RELEASE");

sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V333}-${ACTIVE_CACHE_RELEASE_V333}-${STUDIO_THEME_LAYOUT_SINGLE_CACHE_RELEASE_V333}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V333}-${ACTIVE_CACHE_RELEASE_V333}-${STUDIO_THEME_LAYOUT_SINGLE_CACHE_RELEASE_V333}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, LAYOUT_RELEASE, VERSION, CACHE, "ACTIVE_VERSION_V333", "ACTIVE_CACHE_RELEASE_V333"])
  if (!sw.includes(marker)) throw new Error(`V333_SW_MARKER_MISSING:${marker}`);

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE}: v332 single Theme layout is authoritative and production cache rotated to ${CACHE}.`);
