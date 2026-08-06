import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const v319RuntimeFile = new URL("../src/studio-screenshot-regression-v319.js", import.meta.url);
const v319CssFile = new URL("../src/studio-screenshot-regression-v319.css", import.meta.url);
const releaseFile = new URL("../public/release-v319.json", import.meta.url);
const themeStudioFile = new URL("../src/ThemeStudio.jsx", import.meta.url);
const widgetSystemFile = new URL("../src/widget-system.js", import.meta.url);
const domainProviderFile = new URL("../server/cloudflare-full-zone-provider.mjs", import.meta.url);
const domainPanelFile = new URL("../src/DomainPanelV124.jsx", import.meta.url);

const RELEASE = "studio-screenshot-regression-v319-20260806";
const VERSION = "ngeblogging-app-v319-screenshot-regression-20260806";
const CACHE = "studio-screenshot-regression-cache-v319";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V319_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [runtime, v319Runtime, v319Css, release, themeStudio, widgetSystem, domainProvider, domainPanel] = await Promise.all([
  readFile(runtimeFile, "utf8"),
  readFile(v319RuntimeFile, "utf8"),
  readFile(v319CssFile, "utf8"),
  readFile(releaseFile, "utf8"),
  readFile(themeStudioFile, "utf8"),
  readFile(widgetSystemFile, "utf8"),
  readFile(domainProviderFile, "utf8"),
  readFile(domainPanelFile, "utf8"),
]);

for (const marker of [
  'import "./studio-screenshot-regression-v319.js"',
  `STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319 = "${RELEASE}"`,
]) if (!runtime.includes(marker)) throw new Error(`V319_RUNTIME_CHAIN_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  "themeMapAuthorityV319",
  "v312-native",
  "v264-fallback",
  "THEME_CODE_LINE_GUIDE_V319 = 10000",
  "HTML / CSS / JavaScript",
]) if (!v319Runtime.includes(marker)) throw new Error(`V319_RUNTIME_MISSING:${marker}`);

for (const marker of [
  "--studio-v319-release",
  'data-theme-map-authority-v319="v312-native"',
  "tn-layout-models-v312",
  'grid-template-areas:"code preview"',
  'grid-template-areas:"preview" "code"',
  "tn-code-gutter-v319",
  "nara-floating-button[data-fixed-corner-v319",
]) if (!v319Css.includes(marker)) throw new Error(`V319_CSS_MISSING:${marker}`);

for (const marker of [
  "theme-map-code-editor-v312-20260806",
  "Model editorial",
  "Model majalah",
  "Array.from({ length: 10000 }",
  'data-theme-code-v312="line-numbers-10000"',
]) if (!themeStudio.includes(marker)) throw new Error(`V319_V312_THEME_REGRESSION:${marker}`);

if (!widgetSystem.includes("HTML / CSS / JavaScript")) throw new Error("V319_CUSTOM_WIDGET_CSS_REGRESSION");
for (const marker of ["PUBLIC_DNS_VERIFY_RELEASE_V318", "publicDnsResolvesV318", "application/dns-json"])
  if (!domainProvider.includes(marker)) throw new Error(`V319_DOMAIN_DNS_REGRESSION:${marker}`);
for (const marker of ["public_dns_verified === true", "worker-domain-dns-verified"])
  if (!domainPanel.includes(marker)) throw new Error(`V319_DOMAIN_PANEL_REGRESSION:${marker}`);

for (const marker of [
  RELEASE,
  '"themeMapSingleVisibleAuthority": true',
  '"themeMapModelsPreserved": 2',
  '"themeLayoutAreasPreserved": 26',
  '"themeCountPreserved": 100',
  '"themeCodeLineGuidePreserved": 10000',
  '"onboardingRecoveryWindowMsPreserved": 100000',
  '"fakeDomainActiveStatusAllowed": false',
]) if (!release.includes(marker)) throw new Error(`V319_RELEASE_INVALID:${marker}`);

for (const source of [v319Runtime, v319Css]) {
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
    throw new Error("V319_DESTRUCTIVE_RUNTIME");
}

let sw = await readFile(swFile, "utf8");
sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V318", "NGE_BLOGGING_UPDATE_AVAILABLE_V319")
  .replaceAll("service-worker-activated-studio-screenshot-hotfix-v318", "service-worker-activated-studio-screenshot-regression-v319");
sw = upsert(sw, "STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V319", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V319", "CACHE_RELEASE");
sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V319}-${ACTIVE_CACHE_RELEASE_V319}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_SCREENSHOT_HOTFIX_RELEASE_V318}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_DOMAIN_FULLZONE_RELEASE_V314}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V319}-${ACTIVE_CACHE_RELEASE_V319}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_SCREENSHOT_HOTFIX_RELEASE_V318}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_DOMAIN_FULLZONE_RELEASE_V314}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "STUDIO_SCREENSHOT_HOTFIX_RELEASE_V318", "STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312"])
  if (!sw.includes(marker)) throw new Error(`V319_SW_MARKER_MISSING:${marker}`);

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);
await import("../tests/studio-screenshot-regression-v319.test.mjs");
