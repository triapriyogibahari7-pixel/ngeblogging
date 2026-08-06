import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const cssFile = new URL("../src/studio-hotfix-v318.css", import.meta.url);
const releaseFile = new URL("../public/release-v318.json", import.meta.url);
const migrationFile = new URL("../supabase/migrations/20260806053000_api_keys_pgcrypto_search_path_v318.sql", import.meta.url);

const RELEASE = "studio-screenshot-hotfix-v318-20260806";
const VERSION = "ngeblogging-app-v318-screenshot-hotfix-20260806";
const CACHE = "studio-screenshot-hotfix-cache-v318";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V318_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [runtime, css, release, migration] = await Promise.all([
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(releaseFile, "utf8"),
  readFile(migrationFile, "utf8"),
]);

for (const marker of [
  'import "./studio-hotfix-v318.css"',
  `STUDIO_SCREENSHOT_HOTFIX_RELEASE_V318 = "${RELEASE}"`,
  "studioFinalResponsiveV317",
]) if (!runtime.includes(marker)) throw new Error(`V318_RUNTIME_MISSING:${marker}`);

for (const marker of [
  "--studio-v318-release",
  ".tn-modal-layer{position:fixed!important;inset:0!important",
  'grid-template-areas:"preview" "code"',
  'data-theme-code-v312="line-numbers-10000"',
  "tn-layout-models-v312",
  ".sn-api-modal-layer{position:fixed!important;inset:0!important",
  ".sv124-domain-page",
]) if (!css.includes(marker)) throw new Error(`V318_CSS_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  '"themeModalViewportSafe": true',
  '"themeMapModelsPreserved": 2',
  '"themeCountPreserved": 100',
  '"apiKeyCryptoSearchPathFixed": true',
  '"fakeDomainActiveStatusAllowed": false',
]) if (!release.includes(marker)) throw new Error(`V318_RELEASE_INVALID:${marker}`);

if (!migration.includes("search_path = public, extensions, pg_temp")) throw new Error("V318_API_KEY_MIGRATION_INVALID");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(css)) throw new Error("V318_DESTRUCTIVE_STYLE_MARKER");

let sw = await readFile(swFile, "utf8");
sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V317", "NGE_BLOGGING_UPDATE_AVAILABLE_V318")
  .replaceAll("service-worker-activated-studio-final-responsive-v317", "service-worker-activated-studio-screenshot-hotfix-v318");
sw = upsert(sw, "STUDIO_SCREENSHOT_HOTFIX_RELEASE_V318", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V318", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V318", "CACHE_RELEASE");
sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V318}-${ACTIVE_CACHE_RELEASE_V318}-${STUDIO_SCREENSHOT_HOTFIX_RELEASE_V318}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_DOMAIN_FULLZONE_RELEASE_V314}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V318}-${ACTIVE_CACHE_RELEASE_V318}-${STUDIO_SCREENSHOT_HOTFIX_RELEASE_V318}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_DOMAIN_FULLZONE_RELEASE_V314}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "STUDIO_FINAL_RESPONSIVE_RELEASE_V317", "STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316", "STUDIO_DOMAIN_FULLZONE_RELEASE_V314", "STUDIO_NARA_NONMODAL_RELEASE_V313", "STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312"])
  if (!sw.includes(marker)) throw new Error(`V318_SW_MARKER_MISSING:${marker}`);

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);
await import("../tests/studio-screenshot-hotfix-v318.test.mjs");
await import("./patch-studio-regression-v319.mjs");
