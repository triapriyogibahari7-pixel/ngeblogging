import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-layout-one-v336.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-layout-one-v336.css", import.meta.url);
const releaseFile = new URL("../public/release-v336.json", import.meta.url);

const RELEASE = "studio-theme-layout-one-v336-20260807";
const VERSION = "ngeblogging-app-v336-theme-layout-one-20260807";
const CACHE = "studio-theme-layout-one-cache-v336";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V336_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [entry, runtime, css, release] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  'import "./studio-theme-layout-one-v336.js"',
  'STUDIO_THEME_LAYOUT_ONE_RELEASE_V336 = "studio-theme-layout-one-v336-20260807"',
  "studioThemeLayoutOneV336",
]) if (!entry.includes(marker)) throw new Error(`V336_ENTRY_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  "enforceOneThemeLayoutV336",
  "forceHidden",
  "forceCanonical",
  "collectDuplicates",
  "semanticDuplicate",
  'setImportant(node, "display", "none")',
  'setDataset(studio, "themeMapAuthorityV319", "v264-canonical")',
  'setDataset(studio, "themeLayoutV321", "v264-canonical")',
  'setDataset(studio, "v325ThemeLayout", "v264-canonical")',
  '.tn-layout-canvas',
  "MutationObserver",
  'attributeFilter: [',
]) if (!runtime.includes(marker)) throw new Error(`V336_RUNTIME_MISSING:${marker}`);

if (/setInterval\s*\(/.test(runtime)) throw new Error("V336_UNBOUNDED_INTERVAL");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(runtime))
  throw new Error("V336_DESTRUCTIVE_RUNTIME");
if (/#ngeblogging-studio-sidebar|\.nara-assistant|\.sv124-domain-page|\.ce-app/.test(css))
  throw new Error("V336_UNRELATED_SURFACE_CSS");

for (const marker of [
  "--studio-theme-layout-one-v336",
  '[data-v336-one-layout="ready"]',
  '[data-v336-duplicate-layout="hidden"]',
  '[data-v336-canonical-layout="single-reference-v264"]',
  '[data-v336-widget-summary="below-map"]',
  "writing-mode:horizontal-tb!important",
  "grid-template-columns:minmax(150px,.88fr) minmax(330px,2fr) minmax(150px,.88fr)!important",
]) if (!css.includes(marker)) throw new Error(`V336_CSS_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  '"canonicalMap": "tn-layout-map-v264"',
  '"visibleLayoutMaps": 1',
  '"inlineImportantAuthority": true',
  '"v312EditorialMagazineSurfaceHidden": true',
  '"bootstrapFourAreaCanvasHiddenWhenCanonicalExists": true',
  '"widgetSummaryKeptBelowMap": true',
  '"attributeAndChildListRemountGuard": true',
  '"sidebar": true',
  '"nara": true',
]) if (!release.includes(marker)) throw new Error(`V336_RELEASE_INVALID:${marker}`);

let sw = await readFile(swFile, "utf8");
for (const inherited of [
  "STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V335",
  "STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V334",
  "STUDIO_THEME_LAYOUT_SINGLE_CACHE_RELEASE_V333",
  "STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332",
  "STUDIO_THEME_CODE_DEVICE_RELEASE_V330",
  "STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325",
  "POSTS_PAGES_30000_RELEASE_V322",
  "STUDIO_THEME_DOMAIN_RELEASE_V321",
  "AUTH_CALLBACK_RECOVERY_RELEASE_V315",
  "STUDIO_NARA_NONMODAL_RELEASE_V313",
  "AUTH_SESSION_HANDOFF_RELEASE_V292",
]) if (!sw.includes(inherited)) throw new Error(`V336_SW_INHERITANCE_MISSING:${inherited}`);

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V335", "NGE_BLOGGING_UPDATE_AVAILABLE_V336")
  .replaceAll("service-worker-activated-theme-layout-single-v335", "service-worker-activated-theme-layout-one-v336");

sw = upsert(sw, "STUDIO_THEME_LAYOUT_ONE_RELEASE_V336", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V336", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V336", "CACHE_RELEASE");

sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V336}-${ACTIVE_CACHE_RELEASE_V336}-${STUDIO_THEME_LAYOUT_ONE_RELEASE_V336}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V335}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V334}-${STUDIO_THEME_LAYOUT_SINGLE_CACHE_RELEASE_V333}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V336}-${ACTIVE_CACHE_RELEASE_V336}-${STUDIO_THEME_LAYOUT_ONE_RELEASE_V336}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V335}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V334}-${STUDIO_THEME_LAYOUT_SINGLE_CACHE_RELEASE_V333}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "ACTIVE_VERSION_V336", "ACTIVE_CACHE_RELEASE_V336"])
  if (!sw.includes(marker)) throw new Error(`V336_SW_MARKER_MISSING:${marker}`);

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE}: the v264 26-area map is the sole Theme layout surface and cache rotated to ${CACHE}.`);
