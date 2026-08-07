import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-layout-single-v334.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-layout-single-v334.css", import.meta.url);
const releaseFile = new URL("../public/release-v334.json", import.meta.url);

const RELEASE = "studio-theme-layout-single-v334-20260807";
const VERSION = "ngeblogging-app-v334-theme-layout-single-20260807";
const CACHE = "studio-theme-layout-single-cache-v334";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V334_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [entry, runtime, css, release] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  'import "./studio-theme-layout-single-v334.js"',
  'STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V334 = "studio-theme-layout-single-v334-20260807"',
]) if (!entry.includes(marker)) throw new Error(`V334_ENTRY_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  "findSemanticDuplicate",
  "MODEL_EDITORIAL_RE",
  "MODEL_MAGAZINE_RE",
  "findReferenceMap",
  'dataset.v334DuplicateMap = "hidden"',
  'dataset.v334CanonicalMap = "ready"',
  'dataset.v334VisibleMaps = "1"',
]) if (!runtime.includes(marker)) throw new Error(`V334_RUNTIME_MISSING:${marker}`);

if (/MutationObserver|setInterval\s*\(/.test(runtime)) throw new Error("V334_UNBOUNDED_RUNTIME_LOOP");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(runtime)) throw new Error("V334_DESTRUCTIVE_RUNTIME");

for (const marker of [
  "--studio-theme-layout-single-v334",
  '[data-v334-duplicate-map="hidden"]',
  '[data-v334-canonical-map="ready"]',
  'grid-template-columns:minmax(0,1fr)!important',
  "writing-mode:horizontal-tb!important",
]) if (!css.includes(marker)) throw new Error(`V334_CSS_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  '"visibleLayoutMaps": 1',
  '"crossedOutEditorialMagazineSurfaceRemoved": true',
  '"canonicalMapUsesFullThemeWidth": true',
  '"postPageCentered": true',
  '"leftWidgetSlotsPreserved": 4',
  '"rightWidgetSlotsPreserved": 4',
]) if (!release.includes(marker)) throw new Error(`V334_RELEASE_INVALID:${marker}`);

let sw = await readFile(swFile, "utf8");
for (const inherited of [
  "STUDIO_THEME_LAYOUT_SINGLE_CACHE_RELEASE_V333",
  "STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332",
  "STUDIO_THEME_CODE_DEVICE_RELEASE_V330",
  "STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325",
  "POSTS_PAGES_30000_RELEASE_V322",
  "STUDIO_THEME_DOMAIN_RELEASE_V321",
  "AUTH_CALLBACK_RECOVERY_RELEASE_V315",
  "STUDIO_NARA_NONMODAL_RELEASE_V313",
  "AUTH_SESSION_HANDOFF_RELEASE_V292",
]) if (!sw.includes(inherited)) throw new Error(`V334_SW_INHERITANCE_MISSING:${inherited}`);

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V333", "NGE_BLOGGING_UPDATE_AVAILABLE_V334")
  .replaceAll("service-worker-activated-theme-layout-single-v333", "service-worker-activated-theme-layout-single-v334");

sw = upsert(sw, "STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V334", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V334", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V334", "CACHE_RELEASE");

sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V334}-${ACTIVE_CACHE_RELEASE_V334}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V334}-${STUDIO_THEME_LAYOUT_SINGLE_CACHE_RELEASE_V333}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V334}-${ACTIVE_CACHE_RELEASE_V334}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V334}-${STUDIO_THEME_LAYOUT_SINGLE_CACHE_RELEASE_V333}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "ACTIVE_VERSION_V334", "ACTIVE_CACHE_RELEASE_V334"])
  if (!sw.includes(marker)) throw new Error(`V334_SW_MARKER_MISSING:${marker}`);

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE}: only one Theme layout map remains visible and cache rotated to ${CACHE}.`);
