import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const directEntryFile = new URL("../src/studio-sidebar-direct-v300.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-final-v340.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-final-v340.css", import.meta.url);
const releaseFile = new URL("../public/release-v340.json", import.meta.url);

const RELEASE = "studio-theme-final-v340-20260807";
const VERSION = "ngeblogging-app-v340-theme-final-20260807";
const CACHE = "studio-theme-final-cache-v340";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V340_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [entry, runtime, css, release] = await Promise.all([
  readFile(directEntryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  'import "./studio-theme-final-v340.js"',
  "STUDIO_SIDEBAR_DIRECT_RELEASE_V300",
]) if (!entry.includes(marker)) throw new Error(`V340_DIRECT_ENTRY_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  'import "./studio-theme-layout-below-v337.js"',
  'import "./studio-theme-layout-mobile-v338.js"',
  'import "./studio-theme-surface-v339.js"',
  "currentDevice",
  "semanticSecondary",
  "forceBelow",
  "v340ThemeFamily",
  "v340LayoutRole",
  "requestAnimationFrame",
]) if (!runtime.includes(marker)) throw new Error(`V340_RUNTIME_MISSING:${marker}`);

if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(|setInterval\s*\(|stopImmediatePropagation/.test(runtime))
  throw new Error("V340_DESTRUCTIVE_OR_CHURN_RUNTIME");

for (const marker of [
  "--studio-theme-final-v340",
  'data-v340-theme-family="compact"',
  'data-v340-theme-family="large"',
  ".tn-layout-studio[data-v340-layout=\"ready\"]",
  'data-v340-layout-role="secondary-below"',
  ".tn-active-stage",
  ".tn-category-tabs",
  "grid-template-columns:repeat(2,minmax(0,1fr))!important",
  ".tn-layout-map-v264",
  "overflow-x:clip!important",
]) if (!css.includes(marker)) throw new Error(`V340_CSS_MISSING:${marker}`);

if (/#ngeblogging-studio-sidebar|\.nara-assistant|\.sv124-domain-page|\.ce-app|\.sn-side/.test(css))
  throw new Error("V340_UNRELATED_SURFACE_CSS");

for (const marker of [
  RELEASE,
  '"secondaryEditorialMagazineBelow": true',
  '"compactStageContained": true',
  '"compactCategoriesGrid": true',
  '"themes": 100',
  '"layoutAreas": 26',
  '"widgets": 26',
  '"previewModes": 8',
  '"serviceWorkerCacheRotated": true',
  '"realDeviceCertificationClaimed": false',
]) if (!release.includes(marker)) throw new Error(`V340_RELEASE_INVALID:${marker}`);

let sw = await readFile(swFile, "utf8");
for (const inherited of [
  "STUDIO_THEME_SURFACE_RELEASE_V339",
  "STUDIO_THEME_LAYOUT_MOBILE_RELEASE_V338",
  "STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337",
  "STUDIO_THEME_CODE_DEVICE_RELEASE_V330",
  "STUDIO_NARA_NONMODAL_RELEASE_V313",
  "AUTH_SESSION_HANDOFF_RELEASE_V292",
]) if (!sw.includes(inherited)) throw new Error(`V340_SW_INHERITANCE_MISSING:${inherited}`);

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V339", "NGE_BLOGGING_UPDATE_AVAILABLE_V340")
  .replaceAll("service-worker-activated-theme-surface-v339", "service-worker-activated-theme-final-v340");

sw = upsert(sw, "STUDIO_THEME_FINAL_RELEASE_V340", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V340", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V340", "CACHE_RELEASE");

sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V340}-${ACTIVE_CACHE_RELEASE_V340}-${STUDIO_THEME_FINAL_RELEASE_V340}-${STUDIO_THEME_SURFACE_RELEASE_V339}-${STUDIO_THEME_LAYOUT_MOBILE_RELEASE_V338}-${STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V340}-${ACTIVE_CACHE_RELEASE_V340}-${STUDIO_THEME_FINAL_RELEASE_V340}-${STUDIO_THEME_SURFACE_RELEASE_V339}-${STUDIO_THEME_LAYOUT_MOBILE_RELEASE_V338}-${STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "ACTIVE_VERSION_V340", "ACTIVE_CACHE_RELEASE_V340"])
  if (!sw.includes(marker)) throw new Error(`V340_SW_MARKER_MISSING:${marker}`);
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(sw))
  throw new Error("V340_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE}: Theme authority is direct, secondary layout is below, compact surfaces are contained, cache=${CACHE}.`);
await import("./patch-studio-theme-surface-final-v341.mjs");
