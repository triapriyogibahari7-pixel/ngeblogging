import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeEntryFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-domain-final-v325.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-domain-final-v325.css", import.meta.url);
const guardFile = new URL("../src/studio-content-editor-final-v316.js", import.meta.url);
const themeFile = new URL("../src/ThemeStudio.jsx", import.meta.url);
const providerFile = new URL("../server/cloudflare-full-zone-provider.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v325.json", import.meta.url);
const release324File = new URL("../public/release-v324.json", import.meta.url);

const RELEASE = "studio-theme-domain-final-v325-20260806";
const VERSION = "ngeblogging-app-v325-theme-domain-final-20260806";
const CACHE = "studio-theme-domain-final-cache-v325";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V325_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [entry, runtime, css, guard, theme, provider, release, release324] = await Promise.all([
  readFile(runtimeEntryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(guardFile, "utf8"),
  readFile(themeFile, "utf8"),
  readFile(providerFile, "utf8"),
  readFile(releaseFile, "utf8"),
  readFile(release324File, "utf8"),
]);

for (const marker of [
  'import "./studio-theme-domain-final-v325.js"',
  "STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325",
]) if (!entry.includes(marker)) throw new Error(`V325_RUNTIME_ENTRY_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  "THEME_CODE_LINE_GUIDE_V325 = 10000",
  "v325ThemeLayout",
  "v325ModelStack",
  "v325LegacyMap",
  "v325CodeModal",
  "v325EditorReady",
  "v325DomainReady",
]) if (!runtime.includes(marker)) throw new Error(`V325_RUNTIME_MISSING:${marker}`);

for (const marker of [
  "--studio-theme-domain-final-v325",
  'data-v325-theme-layout="ready"',
  'data-v325-model-stack="ready"',
  'data-v325-legacy-map="hidden"',
  'data-v325-code-modal="ready"',
  'data-v325-editor-ready="true"',
  'data-v325-domain-ready="true"',
  'grid-template-areas:"code preview"',
  'grid-template-areas:"preview" "code"',
  "tn-code-gutter-v325",
  "width:720px!important",
]) if (!css.includes(marker)) throw new Error(`V325_CSS_MISSING:${marker}`);

if (/#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.nara-assistant|\.nara-floating-button/.test(css))
  throw new Error("V325_TOUCHED_PROTECTED_NAVIGATION_OR_ASSISTANT_GEOMETRY");

for (const marker of [
  "theme-map-code-editor-v312-20260806",
  "Model editorial",
  "Model majalah",
  "Array.from({ length: 10000 }",
]) if (!theme.includes(marker)) throw new Error(`V325_THEME_V312_REGRESSION:${marker}`);

for (const marker of [
  'CONTENT_WORD_LIMIT_RELEASE_V322 = "posts-pages-30000-v322-20260806"',
  "CONTENT_WORD_LIMIT_V316 = 30000",
  "CONTENT_WORD_WARNING_V316 = 27000",
  "publishButton.disabled = over",
  "publishedOption.disabled = over",
]) if (!guard.includes(marker)) throw new Error(`V325_30K_EDITOR_REGRESSION:${marker}`);

for (const marker of [
  "PUBLIC_DNS_VERIFY_RELEASE_V321",
  "publicDnsResolvesV321",
  "PUBLIC_DNS_NOT_READY",
  '["A", "AAAA"]',
]) if (!provider.includes(marker)) throw new Error(`V325_DOMAIN_DNS_REGRESSION:${marker}`);

if (!release324.includes("prebuild-v322-compat-v324-20260806"))
  throw new Error("V325_V324_PREBUILD_COMPAT_MISSING");

for (const marker of [
  RELEASE,
  '"themesPreserved": 100',
  '"layoutAreasPreserved": 26',
  '"layoutModelsPreserved": 2',
  '"previewModesPreserved": 8',
  '"codeLineGuidePreserved": 10000',
  '"publicationWordLimit": 30000',
  '"nxdomainNeverReportedActive": true',
  '"registrarNameserverDelegationAutomated": false',
  '"sidebarUntouched": true',
]) if (!release.includes(marker)) throw new Error(`V325_RELEASE_INVALID:${marker}`);

for (const source of [runtime, css]) {
  if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(source))
    throw new Error("V325_RUNTIME_CHURN_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
    throw new Error("V325_DESTRUCTIVE_RUNTIME");
}

let sw = await readFile(swFile, "utf8");
for (const inherited of [
  "STUDIO_PRODUCTION_POLISH_RELEASE_V323",
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
]) if (!sw.includes(inherited)) throw new Error(`V325_SW_INHERITANCE_MISSING:${inherited}`);

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V323", "NGE_BLOGGING_UPDATE_AVAILABLE_V325")
  .replaceAll("service-worker-activated-production-polish-v323", "service-worker-activated-theme-domain-final-v325");
sw = upsert(sw, "STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V325", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V325", "CACHE_RELEASE");
sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V325}-${ACTIVE_CACHE_RELEASE_V325}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V325}-${ACTIVE_CACHE_RELEASE_V325}-${STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325}-${STUDIO_PRODUCTION_POLISH_RELEASE_V323}-${POSTS_PAGES_30000_RELEASE_V322}-${STUDIO_THEME_DOMAIN_RELEASE_V321}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "STUDIO_PRODUCTION_POLISH_RELEASE_V323", "POSTS_PAGES_30000_RELEASE_V322", "STUDIO_THEME_DOMAIN_RELEASE_V321"])
  if (!sw.includes(marker)) throw new Error(`V325_SW_MARKER_MISSING:${marker}`);

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE} and rotated production cache to ${CACHE}.`);
await import("../tests/studio-theme-domain-final-v325.test.mjs");