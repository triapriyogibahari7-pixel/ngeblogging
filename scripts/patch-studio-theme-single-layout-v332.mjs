import { readFile, writeFile } from "node:fs/promises";

const entryFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-layout-single-v332.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-layout-single-v332.css", import.meta.url);
const releaseFile = new URL("../public/release-v332.json", import.meta.url);
const swFile = new URL("../public/sw.js", import.meta.url);

const RELEASE = "studio-theme-layout-single-v332-20260807";
const VERSION = "ngeblogging-app-v332-theme-layout-single-20260807";
const CACHE = "studio-theme-layout-single-cache-v332";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V332_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [entry, runtime, css, release] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  'import "./studio-theme-layout-single-v332.js"',
  "STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332",
]) if (!entry.includes(marker)) throw new Error(`V332_ENTRY_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  "THEME_LAYOUT_AREA_COUNT_V332 = 26",
  "SLOT_KEYS",
  '"left-4"',
  '"right-4"',
  "buildMainRow",
  "Kotak postingan / Page",
  "source.click()",
  'dataset.v332SourceMap = "hidden"',
  'dataset.v332SingleLayout = "ready"',
]) if (!runtime.includes(marker)) throw new Error(`V332_RUNTIME_MISSING:${marker}`);

for (const marker of [
  "--studio-theme-layout-single-v332",
  '.tn-layout-studio[data-v332-single-layout="ready"]',
  '[data-v332-source-map="hidden"]',
  ".tn-layout-single-v332",
  ".tn-v332-main-row",
  "grid-template-columns:minmax(150px,.9fr) minmax(330px,2fr) minmax(150px,.9fr)",
  ".tn-v332-side-stack",
  ".tn-v332-slot-label",
  "min-width:720px",
]) if (!css.includes(marker)) throw new Error(`V332_CSS_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  '"visibleLayoutMaps": 1',
  '"sourceAuthority": "v312-26-area-widget-actions"',
  '"renderedAsSingleReferenceMap": true',
  '"duplicateSourceMapsHidden": true',
  '"leftWidgetSlots": 4',
  '"rightWidgetSlots": 4',
  '"areaCount": 26',
  '"slotClickDelegatesToRealWidgetArea": true',
  '"layoutAreas": 26',
  '"themes": 100',
]) if (!release.includes(marker)) throw new Error(`V332_RELEASE_INVALID:${marker}`);

for (const source of [runtime, css]) {
  if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(source))
    throw new Error("V332_RUNTIME_CHURN_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
    throw new Error("V332_DESTRUCTIVE_RUNTIME");
}

let sw = await readFile(swFile, "utf8");
if (!sw.includes("STUDIO_THEME_CODE_DEVICE_RELEASE_V330"))
  throw new Error("V332_V330_MATERIALIZATION_MISSING");

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replace(/NGE_BLOGGING_UPDATE_AVAILABLE_V\d+/g, "NGE_BLOGGING_UPDATE_AVAILABLE_V332")
  .replace(/service-worker-activated-[a-z0-9-]+/g, "service-worker-activated-theme-layout-single-v332");
sw = upsert(sw, "STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V332", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V332", "CACHE_RELEASE");
sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V332}-${ACTIVE_CACHE_RELEASE_V332}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V332}-${ACTIVE_CACHE_RELEASE_V332}-${STUDIO_THEME_LAYOUT_SINGLE_RELEASE_V332}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "STUDIO_THEME_CODE_DEVICE_RELEASE_V330", "STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325"])
  if (!sw.includes(marker)) throw new Error(`V332_SW_MARKER_MISSING:${marker}`);

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE}: one screenshot-matched 26-area Theme map is active and cache rotated to ${CACHE}.`);
