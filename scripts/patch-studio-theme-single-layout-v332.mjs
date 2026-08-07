import { readFile, writeFile } from "node:fs/promises";

const entryFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-single-layout-v332.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-single-layout-v332.css", import.meta.url);
const releaseFile = new URL("../public/release-v332.json", import.meta.url);
const swFile = new URL("../public/sw.js", import.meta.url);

const RELEASE = "studio-theme-single-layout-v332-20260806";
const VERSION = "ngeblogging-app-v332-theme-single-layout-20260806";
const CACHE = "studio-theme-single-layout-cache-v332";

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
  'import "./studio-theme-single-layout-v332.js"',
  "STUDIO_THEME_SINGLE_LAYOUT_RELEASE_V332",
]) if (!entry.includes(marker)) throw new Error(`V332_ENTRY_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  "LEGACY_MAP_SELECTOR",
  "V312_MAP_SELECTOR",
  "single-v264-reference",
  "single-v312-editorial",
  'dataset.v332SingleLayout = "hidden"',
  'dataset.v332SingleLayout = "primary"',
]) if (!runtime.includes(marker)) throw new Error(`V332_RUNTIME_MISSING:${marker}`);

for (const marker of [
  "--studio-theme-single-layout-v332",
  'data-v332-single-layout="hidden"',
  'data-theme-map-authority-v332="single-v264-reference"',
  ".tn-layout-content-v264",
  ".tn-layout-post-v264",
]) if (!css.includes(marker)) throw new Error(`V332_CSS_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  '"visibleLayoutMaps": 1',
  '"preferredAuthority": "v264-reference-map"',
  '"duplicateV312ModelSurfaceHidden": true',
  '"modelMajalahHidden": true',
  '"leftWidgetSlots": 4',
  '"rightWidgetSlots": 4',
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
  .replace(/service-worker-activated-[a-z0-9-]+/g, "service-worker-activated-theme-single-layout-v332");
sw = upsert(sw, "STUDIO_THEME_SINGLE_LAYOUT_RELEASE_V332", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V332", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V332", "CACHE_RELEASE");
sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V332}-${ACTIVE_CACHE_RELEASE_V332}-${STUDIO_THEME_SINGLE_LAYOUT_RELEASE_V332}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V332}-${ACTIVE_CACHE_RELEASE_V332}-${STUDIO_THEME_SINGLE_LAYOUT_RELEASE_V332}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "STUDIO_THEME_CODE_DEVICE_RELEASE_V330", "STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325"])
  if (!sw.includes(marker)) throw new Error(`V332_SW_MARKER_MISSING:${marker}`);

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE}: one canonical Theme layout map is visible and cache rotated to ${CACHE}.`);
