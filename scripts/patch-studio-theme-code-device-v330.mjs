import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeEntryFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-code-device-v330.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-code-device-v330.css", import.meta.url);
const themeFile = new URL("../src/ThemeStudio.jsx", import.meta.url);
const releaseFile = new URL("../public/release-v330.json", import.meta.url);

const RELEASE = "studio-theme-code-device-v330-20260806";
const VERSION = "ngeblogging-app-v330-theme-code-device-20260806";
const CACHE = "studio-theme-code-device-cache-v330";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V330_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [entry, runtime, css, theme, release] = await Promise.all([
  readFile(runtimeEntryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(themeFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  'import "./studio-theme-domain-final-v325.js"',
  'import "./studio-theme-code-device-v330.js"',
  "STUDIO_THEME_CODE_DEVICE_RELEASE_V330",
]) if (!entry.includes(marker)) throw new Error(`V330_RUNTIME_ENTRY_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  "THEME_CODE_LINE_GUIDE_V330 = 10000",
  'new Set(["laptop", "desktop", "computer"])',
  'new Set(["application", "phone", "mobile", "compact", "tablet"])',
  "dataset.v330CodeFamily",
  "data-preview-device",
  "tn-code-gutter-v330",
]) if (!runtime.includes(marker)) throw new Error(`V330_RUNTIME_MISSING:${marker}`);

for (const marker of [
  "--studio-theme-code-device-v330",
  'data-v330-code-family="compact"',
  'data-v330-code-family="large"',
  'grid-template-areas:"preview" "code"',
  'grid-template-areas:"code preview"',
  ".tn-code-gutter-v330",
  "z-index:14000!important",
]) if (!css.includes(marker)) throw new Error(`V330_CSS_MISSING:${marker}`);

if (/@media\s*\(/.test(css)) throw new Error("V330_VIEWPORT_MEDIA_QUERY_REGRESSION");
if (!theme.includes("data-preview-device={device}")) throw new Error("V330_THEME_PREVIEW_DEVICE_SIGNAL_MISSING");

for (const marker of [
  RELEASE,
  '"selectedPreviewDeviceOwnsEditorLayout": true',
  '"compactPreviewAboveCode": true',
  '"largePreviewCode5050": true',
  '"desktopSiteOnPhoneNoLongerForcesDesktopSplit": true',
  '"lineGuide": 10000',
  '"serviceWorkerCacheRotated": true',
  '"sidebarUntouched": true',
  '"naraUntouched": true',
]) if (!release.includes(marker)) throw new Error(`V330_RELEASE_INVALID:${marker}`);

for (const source of [runtime, css]) {
  if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(source))
    throw new Error("V330_RUNTIME_CHURN_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
    throw new Error("V330_DESTRUCTIVE_RUNTIME");
}

let sw = await readFile(swFile, "utf8");
for (const inherited of [
  "STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325",
  "STUDIO_PRODUCTION_POLISH_RELEASE_V323",
  "POSTS_PAGES_30000_RELEASE_V322",
  "STUDIO_THEME_DOMAIN_RELEASE_V321",
  "STUDIO_NARA_NONMODAL_RELEASE_V313",
  "AUTH_SESSION_HANDOFF_RELEASE_V292",
]) if (!sw.includes(inherited)) throw new Error(`V330_SW_INHERITANCE_MISSING:${inherited}`);

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V325", "NGE_BLOGGING_UPDATE_AVAILABLE_V330")
  .replaceAll("service-worker-activated-theme-domain-final-v325", "service-worker-activated-theme-code-device-v330");
sw = upsert(sw, "STUDIO_THEME_CODE_DEVICE_RELEASE_V330", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V330", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V330", "CACHE_RELEASE");
sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V330}-${ACTIVE_CACHE_RELEASE_V330}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V330}-${ACTIVE_CACHE_RELEASE_V330}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325", "POSTS_PAGES_30000_RELEASE_V322"])
  if (!sw.includes(marker)) throw new Error(`V330_SW_MARKER_MISSING:${marker}`);

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE}: Theme code editor now follows the selected preview device and production cache rotated to ${CACHE}.`);
