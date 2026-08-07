import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-layout-mobile-v338.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-layout-mobile-v338.css", import.meta.url);
const releaseFile = new URL("../public/release-v338.json", import.meta.url);

const RELEASE = "studio-theme-layout-mobile-v338-20260807";
const VERSION = "ngeblogging-app-v338-theme-layout-mobile-20260807";
const CACHE = "studio-theme-layout-mobile-cache-v338";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V338_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [entry, runtime, css, release] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  'import "./studio-theme-layout-below-v337.js"',
  'import "./studio-theme-layout-mobile-v338.js"',
  'STUDIO_THEME_LAYOUT_MOBILE_RELEASE_V338 = "studio-theme-layout-mobile-v338-20260807"',
  "studioThemeLayoutMobileV338",
]) if (!entry.includes(marker)) throw new Error(`V338_ENTRY_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  'new Set(["application", "phone", "mobile", "compact", "tablet"])',
  'new Set(["laptop", "desktop", "computer"])',
  "currentStudioDevice",
  "v338LayoutFamily",
  'v338LayoutRole = "secondary-below"',
  "MutationObserver",
]) if (!runtime.includes(marker)) throw new Error(`V338_RUNTIME_MISSING:${marker}`);
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(|setInterval\s*\(/.test(runtime))
  throw new Error("V338_DESTRUCTIVE_OR_CHURN_RUNTIME");

for (const marker of [
  "--studio-theme-layout-mobile-v338",
  'data-v338-layout-family="compact"',
  'data-v338-layout-role="secondary-below"',
  ".tn-layout-map-v264",
  "grid-template-columns:minmax(0,1fr)!important",
  "writing-mode:horizontal-tb!important",
  "Widget chooser stays a small sheet",
]) if (!css.includes(marker)) throw new Error(`V338_CSS_MISSING:${marker}`);
if (/min-width:720px!important|width:720px!important/.test(css)) throw new Error("V338_FIXED_COMPACT_CANVAS_REGRESSION");
if (/#ngeblogging-studio-sidebar|\.nara-assistant|\.sv124-domain-page|\.ce-app|\.sn-side/.test(css))
  throw new Error("V338_UNRELATED_SURFACE_CSS");

for (const marker of [
  RELEASE,
  '"secondaryEditorialMagazineBelow": true',
  '"secondaryFullWidth": true',
  '"fixed720CompactCanvasRemoved": true',
  '"themes": 100',
  '"layoutAreas": 26',
  '"widgets": 26',
  '"previewModes": 8',
  '"sidebar": true',
  '"nara": true',
  '"authSession": true',
]) if (!release.includes(marker)) throw new Error(`V338_RELEASE_INVALID:${marker}`);

let sw = await readFile(swFile, "utf8");
for (const inherited of [
  "STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337",
  "STUDIO_THEME_CODE_DEVICE_RELEASE_V330",
  "STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325",
  "POSTS_PAGES_30000_RELEASE_V322",
  "STUDIO_THEME_DOMAIN_RELEASE_V321",
  "AUTH_CALLBACK_RECOVERY_RELEASE_V315",
  "STUDIO_NARA_NONMODAL_RELEASE_V313",
  "AUTH_SESSION_HANDOFF_RELEASE_V292",
]) if (!sw.includes(inherited)) throw new Error(`V338_SW_INHERITANCE_MISSING:${inherited}`);

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V337", "NGE_BLOGGING_UPDATE_AVAILABLE_V338")
  .replaceAll("service-worker-activated-theme-layout-below-v337", "service-worker-activated-theme-layout-mobile-v338");

sw = upsert(sw, "STUDIO_THEME_LAYOUT_MOBILE_RELEASE_V338", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V338", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V338", "CACHE_RELEASE");

sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V338}-${ACTIVE_CACHE_RELEASE_V338}-${STUDIO_THEME_LAYOUT_MOBILE_RELEASE_V338}-${STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V338}-${ACTIVE_CACHE_RELEASE_V338}-${STUDIO_THEME_LAYOUT_MOBILE_RELEASE_V338}-${STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "ACTIVE_VERSION_V338", "ACTIVE_CACHE_RELEASE_V338"])
  if (!sw.includes(marker)) throw new Error(`V338_SW_MARKER_MISSING:${marker}`);

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE}: compact Theme maps are full-width, the secondary design remains below, and cache rotated to ${CACHE}.`);
await import("./patch-studio-theme-surface-v339.mjs");
