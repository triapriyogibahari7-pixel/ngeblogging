import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeEntryFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const runtimeFile = new URL("../src/studio-production-polish-v323.js", import.meta.url);
const cssFile = new URL("../src/studio-production-polish-v323.css", import.meta.url);
const wordGuardFile = new URL("../src/studio-content-editor-final-v316.js", import.meta.url);
const themeFile = new URL("../src/ThemeStudio.jsx", import.meta.url);
const domainProviderFile = new URL("../server/cloudflare-full-zone-provider.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v323.json", import.meta.url);

const RELEASE = "studio-production-polish-v323-20260806";
const VERSION = "ngeblogging-app-v323-production-polish-20260806";
const CACHE = "studio-production-polish-cache-v323";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V323_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [runtimeEntry, runtime, css, guard, theme, provider, release] = await Promise.all([
  readFile(runtimeEntryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(wordGuardFile, "utf8"),
  readFile(themeFile, "utf8"),
  readFile(domainProviderFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  'import "./studio-production-polish-v323.js"',
  "STUDIO_PRODUCTION_POLISH_RELEASE_V323",
]) if (!runtimeEntry.includes(marker)) throw new Error(`V323_RUNTIME_ENTRY_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  "productionPolishV323",
  "productionModelRowsV323",
  "productionMapV323",
  "productionCodeV323",
  "productionEditorV323",
  "productionDomainV323",
]) if (!runtime.includes(marker)) throw new Error(`V323_RUNTIME_MISSING:${marker}`);

for (const marker of [
  "--studio-production-polish-v323",
  'data-production-polish-v323="ready"',
  'data-production-code-v323="ready"',
  'data-production-editor-v323="ready"',
  'data-production-domain-v323="ready"',
  'grid-template-areas:"code preview"',
  'grid-template-areas:"preview" "code"',
  'width:680px!important',
]) if (!css.includes(marker)) throw new Error(`V323_CSS_MISSING:${marker}`);

if (/#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.nara-assistant|\.nara-floating-button/.test(css))
  throw new Error("V323_SCOPED_CSS_TOUCHED_PROTECTED_SIDEBAR_OR_NARA");

for (const marker of [
  'CONTENT_WORD_LIMIT_RELEASE_V322 = "posts-pages-30000-v322-20260806"',
  "CONTENT_WORD_LIMIT_V316 = 30000",
  "CONTENT_WORD_WARNING_V316 = 27000",
  "30.000 kata",
  "publishButton.disabled = over",
]) if (!guard.includes(marker)) throw new Error(`V323_30K_EDITOR_REGRESSION:${marker}`);

for (const marker of [
  "theme-map-code-editor-v312-20260806",
  "Model editorial",
  "Model majalah",
  "Array.from({ length: 10000 }",
]) if (!theme.includes(marker)) throw new Error(`V323_THEME_AUTHORITY_REGRESSION:${marker}`);

for (const marker of [
  "PUBLIC_DNS_VERIFY_RELEASE_V321",
  "publicDnsResolvesV321",
  "PUBLIC_DNS_NOT_READY",
  '["A", "AAAA"]',
]) if (!provider.includes(marker)) throw new Error(`V323_DOMAIN_DNS_REGRESSION:${marker}`);

for (const marker of [
  RELEASE,
  '"themesPreserved": 100',
  '"layoutAreasPreserved": 26',
  '"layoutModelsPreserved": 2',
  '"previewModesPreserved": 8',
  '"codeLineGuidePreserved": 10000',
  '"publicationWordLimit": 30000',
  '"registrarNameserverDelegationAutomated": false',
  '"sidebarUntouched": true',
]) if (!release.includes(marker)) throw new Error(`V323_RELEASE_INVALID:${marker}`);

for (const source of [runtime, css]) {
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(|setInterval\s*\(|new MutationObserver/.test(source))
    throw new Error("V323_DESTRUCTIVE_OR_CHURN_RUNTIME");
}

let sw = await readFile(swFile, "utf8");
for (const inherited of [
  "POSTS_PAGES_30000_RELEASE_V322",
  "STUDIO_THEME_DOMAIN_RELEASE_V321",
  "STUDIO_PRODUCTION_CUTOVER_RELEASE_V320",
  "STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319",
  "STUDIO_FINAL_RESPONSIVE_RELEASE_V317",
  "STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316",
  "AUTH_CALLBACK_RECOVERY_RELEASE_V315",
  "STUDIO_NARA_NONMODAL_RELEASE_V313",
  "STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312",
  "AUTH_SESSION_HANDOFF_RELEASE_V292",
]) if (!sw.includes(inherited)) throw new Error(`V323_SW_INHERITANCE_MISSING:${inherited}`);

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V322", "NGE_BLOGGING_UPDATE_AVAILABLE_V323")
  .replaceAll("service-worker-activated-posts-pages-30000-v322", "service-worker-activated-production-polish-v323");
sw = upsert(sw, "STUDIO_PRODUCTION_POLISH_RELEASE_V323", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V323", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V323", "CACHE_RELEASE");
sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V323}-${ACTIVE_CACHE_RELEASE_V323}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V323}-${ACTIVE_CACHE_RELEASE_V323}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "POSTS_PAGES_30000_RELEASE_V322", "STUDIO_THEME_DOMAIN_RELEASE_V321"])
  if (!sw.includes(marker)) throw new Error(`V323_SW_MARKER_MISSING:${marker}`);

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE} and rotated production cache to ${CACHE}.`);
await import("../tests/studio-production-polish-v323.test.mjs");
