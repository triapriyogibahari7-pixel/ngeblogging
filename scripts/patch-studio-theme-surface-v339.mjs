import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-surface-v339.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-surface-v339.css", import.meta.url);
const themeFile = new URL("../src/ThemeStudio.jsx", import.meta.url);
const releaseFile = new URL("../public/release-v339.json", import.meta.url);

const RELEASE = "studio-theme-surface-v339-20260807";
const VERSION = "ngeblogging-app-v339-theme-surface-20260807";
const CACHE = "studio-theme-surface-cache-v339";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V339_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [entry, runtime, css, theme, release] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(themeFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  'import "./studio-theme-layout-mobile-v338.js"',
  'import "./studio-theme-surface-v339.js"',
  'STUDIO_THEME_SURFACE_RELEASE_V339 = "studio-theme-surface-v339-20260807"',
  "studioThemeSurfaceV339",
]) if (!entry.includes(marker)) throw new Error(`V339_ENTRY_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  'new Set(["application", "phone", "mobile", "compact", "tablet"])',
  'new Set(["laptop", "desktop", "computer"])',
  "currentThemeDevice",
  "v339ThemeFamily",
  'querySelectorAll(".tn-studio")',
  "MutationObserver",
]) if (!runtime.includes(marker)) throw new Error(`V339_RUNTIME_MISSING:${marker}`);
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(|setInterval\s*\(|stopImmediatePropagation/.test(runtime))
  throw new Error("V339_DESTRUCTIVE_OR_CHURN_RUNTIME");

for (const marker of [
  "--studio-theme-surface-v339",
  'data-v339-theme-family="compact"',
  'data-v339-theme-family="large"',
  ".tn-active-stage",
  "box-shadow:none!important",
  ".tn-category-tabs",
  "scrollbar-width:none!important",
  ".tn-device-switch span",
  "display:inline!important",
  'data-v337-secondary-below="ready"',
  "grid-template-columns:minmax(0,1fr)!important",
]) if (!css.includes(marker)) throw new Error(`V339_CSS_MISSING:${marker}`);
if (/#ngeblogging-studio-sidebar|\.nara-assistant|\.sv124-domain-page|\.ce-app|\.sn-side/.test(css))
  throw new Error("V339_UNRELATED_SURFACE_CSS");

for (const marker of [
  "const DEVICES = [",
  "Aplikasi",
  "Handphone",
  "Perangkat kecil",
  "Situs desktop",
  "Komputer",
  "THEME_COUNT",
  "tn-active-stage",
  "tn-category-tabs",
]) if (!theme.includes(marker)) throw new Error(`V339_THEME_SOURCE_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  '"secondaryEditorialMagazineBelow": true',
  '"secondaryFullWidth": true',
  '"compactStageNoElongatedBackdrop": true',
  '"compactCategoriesNoVisibleHorizontalTrack": true',
  '"compactDeviceLabelsReachable": true',
  '"themes": 100',
  '"layoutAreas": 26',
  '"widgets": 26',
  '"previewModes": 8',
  '"sidebarUntouched": true',
  '"naraUntouched": true',
  '"authSessionUntouched": true',
  '"domainUntouched": true',
  '"postsPagesUntouched": true',
  '"realDeviceCertificationClaimed": false',
]) if (!release.includes(marker)) throw new Error(`V339_RELEASE_INVALID:${marker}`);

let sw = await readFile(swFile, "utf8");
for (const inherited of [
  "STUDIO_THEME_LAYOUT_MOBILE_RELEASE_V338",
  "STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337",
  "STUDIO_THEME_CODE_DEVICE_RELEASE_V330",
  "STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325",
  "POSTS_PAGES_30000_RELEASE_V322",
  "STUDIO_NARA_NONMODAL_RELEASE_V313",
  "AUTH_SESSION_HANDOFF_RELEASE_V292",
]) if (!sw.includes(inherited)) throw new Error(`V339_SW_INHERITANCE_MISSING:${inherited}`);

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V338", "NGE_BLOGGING_UPDATE_AVAILABLE_V339")
  .replaceAll("service-worker-activated-theme-layout-mobile-v338", "service-worker-activated-theme-surface-v339");

sw = upsert(sw, "STUDIO_THEME_SURFACE_RELEASE_V339", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V339", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V339", "CACHE_RELEASE");

sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V339}-${ACTIVE_CACHE_RELEASE_V339}-${STUDIO_THEME_SURFACE_RELEASE_V339}-${STUDIO_THEME_LAYOUT_MOBILE_RELEASE_V338}-${STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V339}-${ACTIVE_CACHE_RELEASE_V339}-${STUDIO_THEME_SURFACE_RELEASE_V339}-${STUDIO_THEME_LAYOUT_MOBILE_RELEASE_V338}-${STUDIO_THEME_LAYOUT_BELOW_RELEASE_V337}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "ACTIVE_VERSION_V339", "ACTIVE_CACHE_RELEASE_V339"])
  if (!sw.includes(marker)) throw new Error(`V339_SW_MARKER_MISSING:${marker}`);
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(sw))
  throw new Error("V339_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE}: Theme Studio compact surface is contained, the secondary layout stays below, and cache rotated to ${CACHE}.`);
