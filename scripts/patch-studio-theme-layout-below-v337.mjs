import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-layout-below-v337.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-layout-below-v337.css", import.meta.url);
const releaseFile = new URL("../public/release-v337.json", import.meta.url);

const RELEASE = "studio-theme-layout-below-v337-20260807";
const VERSION = "ngeblogging-app-v337-theme-layout-below-20260807";
const CACHE = "studio-theme-layout-below-cache-v337";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V337_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [entry, runtime, css, release] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

if (!/^import "\.\/studio-theme-layout-below-v337\.js";$/m.test(entry))
  throw new Error("V337_RUNTIME_ENTRY_MISSING");
for (const retired of [
  "studio-theme-layout-single-v332.js",
  "studio-theme-layout-single-v334.js",
  "studio-theme-layout-single-v335.js",
  "studio-theme-layout-one-v336.js",
]) {
  const active = new RegExp(`^import \\\"\\.\\/${retired.replaceAll(".", "\\.")}\\\";$`, "m");
  if (active.test(entry)) throw new Error(`V337_OLD_LAYOUT_RUNTIME_STILL_ACTIVE:${retired}`);
}
for (const marker of [
  'STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337 = "studio-theme-layout-below-v337-20260807"',
  "studioThemeLayoutBelowV337",
]) if (!entry.includes(marker)) throw new Error(`V337_ENTRY_MARKER_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  "semanticSecondary",
  "placeSecondaryBelow",
  "showSecondaryBelow",
  'setDataset(node, "v337SecondaryLayout", "below")',
  'setDataset(studio, "v337LayoutOrder", "primary-then-secondary")',
  'removeAttribute(node, "data-v336-duplicate-layout")',
  'removeAttribute(node, "data-v335-duplicate-layout")',
  "MutationObserver",
  'attributeFilter: [',
]) if (!runtime.includes(marker)) throw new Error(`V337_RUNTIME_MISSING:${marker}`);
if (/setImportant\([^\n]+"display",\s*"none"/.test(runtime)) throw new Error("V337_SECONDARY_HIDE_RUNTIME_REGRESSION");
if (/setInterval\s*\(/.test(runtime)) throw new Error("V337_UNBOUNDED_INTERVAL");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(runtime))
  throw new Error("V337_DESTRUCTIVE_RUNTIME");

for (const marker of [
  "--studio-theme-layout-below-v337",
  '[data-v337-secondary-below="ready"]',
  '[data-v337-canonical-layout="primary-v264"]',
  '[data-v337-secondary-layout="below"]',
  'grid-template-columns:minmax(0,1fr)!important',
  "writing-mode:horizontal-tb!important",
  'grid-template-columns:minmax(150px,.88fr) minmax(330px,2fr) minmax(150px,.88fr)!important',
  '[data-v337-widget-summary="below-layouts"]',
]) if (!css.includes(marker)) throw new Error(`V337_CSS_MISSING:${marker}`);
if (/#ngeblogging-studio-sidebar|\.nara-assistant|\.sv124-domain-page|\.ce-app|\.sn-side/.test(css))
  throw new Error("V337_UNRELATED_SURFACE_CSS");

for (const marker of [
  RELEASE,
  '"secondaryEditorialMagazineSurfacePreserved": true',
  '"secondarySurfacePosition": "below-primary-map"',
  '"secondarySurfaceFullWidth": true',
  '"rightHandCompressedColumnRemoved": true',
  '"v332V334V335V336RuntimeRetired": true',
  '"historicalFilesKeptInGit": true',
  '"themes": 100',
  '"layoutAreas": 26',
  '"widgets": 26',
  '"previewModes": 8',
  '"postsPagesWordLimit": 30000',
  '"sidebar": true',
  '"nara": true',
]) if (!release.includes(marker)) throw new Error(`V337_RELEASE_INVALID:${marker}`);

let sw = await readFile(swFile, "utf8");
for (const inherited of [
  "STUDIO_THEME_CODE_DEVICE_RELEASE_V330",
  "STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325",
  "POSTS_PAGES_30000_RELEASE_V322",
  "STUDIO_THEME_DOMAIN_RELEASE_V321",
  "AUTH_CALLBACK_RECOVERY_RELEASE_V315",
  "STUDIO_NARA_NONMODAL_RELEASE_V313",
  "AUTH_SESSION_HANDOFF_RELEASE_V292",
]) if (!sw.includes(inherited)) throw new Error(`V337_SW_INHERITANCE_MISSING:${inherited}`);

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V330", "NGE_BLOGGING_UPDATE_AVAILABLE_V337")
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V336", "NGE_BLOGGING_UPDATE_AVAILABLE_V337")
  .replaceAll("service-worker-activated-theme-code-device-v330", "service-worker-activated-theme-layout-below-v337")
  .replaceAll("service-worker-activated-theme-layout-one-v336", "service-worker-activated-theme-layout-below-v337");

sw = upsert(sw, "STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V337", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V337", "CACHE_RELEASE");

sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V337}-${ACTIVE_CACHE_RELEASE_V337}-${STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V337}-${ACTIVE_CACHE_RELEASE_V337}-${STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "ACTIVE_VERSION_V337", "ACTIVE_CACHE_RELEASE_V337"])
  if (!sw.includes(marker)) throw new Error(`V337_SW_MARKER_MISSING:${marker}`);

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE}: the secondary Editorial/Majalah layout is preserved below the primary map and cache rotated to ${CACHE}.`);
