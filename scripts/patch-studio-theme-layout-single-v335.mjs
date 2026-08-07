import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-layout-single-v335.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-layout-single-v335.css", import.meta.url);
const releaseFile = new URL("../public/release-v335.json", import.meta.url);

const RELEASE = "studio-theme-layout-single-v335-20260807";
const VERSION = "ngeblogging-app-v335-theme-layout-single-hardlock-20260807";
const CACHE = "studio-theme-layout-single-hardlock-cache-v335";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V335_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [entry, runtime, css, release] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  'import "./studio-theme-layout-single-v335.js"',
  'STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V335 = "studio-theme-layout-single-v335-20260807"',
]) if (!entry.includes(marker)) throw new Error(`V335_ENTRY_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  "hardLockSingleThemeLayoutV335",
  "normalizeWithLegacy",
  "semanticModelCarrier",
  'dataset.v335DuplicateLayout = "hidden"',
  'dataset.v335CanonicalLayout = authority',
  'dataset.v335VisibleLayoutMaps = "1"',
  "MutationObserver",
  "directChildUnder",
]) if (!runtime.includes(marker)) throw new Error(`V335_RUNTIME_MISSING:${marker}`);

if (/setInterval\s*\(/.test(runtime)) throw new Error("V335_UNBOUNDED_INTERVAL");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(runtime))
  throw new Error("V335_DESTRUCTIVE_RUNTIME");

for (const marker of [
  "--studio-theme-layout-single-v335",
  ':has(.tn-layout-map-v264)',
  '[data-v335-duplicate-layout="hidden"]',
  '[data-v335-canonical-layout]',
  'grid-template-columns:minmax(0,1fr)!important',
  "writing-mode:horizontal-tb!important",
]) if (!css.includes(marker)) throw new Error(`V335_CSS_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  '"visibleLayoutMaps": 1',
  '"editorialMagazineSideSurfaceRemoved": true',
  '"duplicateRemovedAfterReactRerender": true',
  '"canonicalMapUsesFullThemeWidth": true',
  '"postPageCentered": true',
  '"leftWidgetSlotsPreserved": 4',
  '"rightWidgetSlotsPreserved": 4',
]) if (!release.includes(marker)) throw new Error(`V335_RELEASE_INVALID:${marker}`);

let sw = await readFile(swFile, "utf8");
for (const inherited of [
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
]) if (!sw.includes(inherited)) throw new Error(`V335_SW_INHERITANCE_MISSING:${inherited}`);

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V334", "NGE_BLOGGING_UPDATE_AVAILABLE_V335")
  .replaceAll("service-worker-activated-theme-layout-single-v334", "service-worker-activated-theme-layout-single-v335");

sw = upsert(sw, "STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V335", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V335", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V335", "CACHE_RELEASE");

sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V335}-${ACTIVE_CACHE_RELEASE_V335}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V335}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V334}-${STUDIO_THEME_LAYOUT_SINGLE_CACHE_RELEASE_V333}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V335}-${ACTIVE_CACHE_RELEASE_V335}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V335}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V334}-${STUDIO_THEME_LAYOUT_SINGLE_CACHE_RELEASE_V333}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "ACTIVE_VERSION_V335", "ACTIVE_CACHE_RELEASE_V335"])
  if (!sw.includes(marker)) throw new Error(`V335_SW_MARKER_MISSING:${marker}`);

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE}: one Theme layout map is hard-locked and cache rotated to ${CACHE}.`);
