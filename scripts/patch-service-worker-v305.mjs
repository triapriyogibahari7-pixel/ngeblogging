import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const nativeFile = new URL("../src/studio-native-controls-v290.js", import.meta.url);
const startupFile = new URL("../src/studio-startup-v292.js", import.meta.url);
const onboardingFile = new URL("../src/StudioOnboardingGate.jsx", import.meta.url);
const switcherFile = new URL("../src/studio-site-switcher-v305.js", import.meta.url);
const switcherCssFile = new URL("../src/studio-site-switcher-v305.css", import.meta.url);
const testFile = new URL("../tests/studio-workspaces-members-v304.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v305.json", import.meta.url);

const RELEASE = "studio-site-switch-first-site-v305-20260805";
const SWITCHER_RELEASE = "studio-real-site-switcher-v305-20260805";
const FIRST_SITE_RELEASE = "studio-first-site-required-v305-20260805";
const STARTUP_UNION_RELEASE = "startup-membership-plus-owned-sites-v305-20260805";
const VERSION = "ngeblogging-app-v305-site-switch-first-site-20260805";
const CACHE = "studio-site-switch-first-site-cache-v305";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V305_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [native, startup, onboarding, switcher, switcherCss, tests, release] = await Promise.all([
  readFile(nativeFile, "utf8"),
  readFile(startupFile, "utf8"),
  readFile(onboardingFile, "utf8"),
  readFile(switcherFile, "utf8"),
  readFile(switcherCssFile, "utf8"),
  readFile(testFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  SWITCHER_RELEASE,
  FIRST_SITE_RELEASE,
  'import("./studio-site-switcher-v305.js")',
  'import("./studio-members-v304.js")',
]) if (!native.includes(marker)) throw new Error(`V305_NATIVE_CHAIN_MISSING:${marker}`);

for (const marker of [
  STARTUP_UNION_RELEASE,
  "/rest/v1/site_members",
  "/rest/v1/sites",
  "owner_id",
  "mergeSiteCollections",
]) if (!startup.includes(marker)) throw new Error(`V305_STARTUP_SITE_UNION_MISSING:${marker}`);

for (const marker of [
  "FIRST_SITE_GUARD_RELEASE_V305",
  "ngeblogging:first-site-required-v305",
  "Buat situs pertama",
  "Subdomain gratis",
  "Tema awal",
  "Bahasa",
  "Zona waktu",
  "snapshot.__userId !== userId",
]) if (!onboarding.includes(marker)) throw new Error(`V305_FIRST_SITE_GUARD_MISSING:${marker}`);

for (const marker of [
  SWITCHER_RELEASE,
  "listUserSitesStartupV292",
  "Ganti situs",
  "data-site-switcher-list",
  "Kelola situs ini",
  "Sedang dikelola",
  "setActiveSiteId",
  "ngeblogging:active-site-change",
  "ngeblogging:first-site-required-v305",
]) if (!switcher.includes(marker)) throw new Error(`V305_SWITCHER_MISSING:${marker}`);

if (!switcherCss.includes("width:min(800px,calc(100vw - 28px))") || !switcherCss.includes("@media(max-width:680px)"))
  throw new Error("V305_SWITCHER_RESPONSIVE_CSS_MISSING");
if (!tests.includes("Ganti situs v305 shows every real site") || !tests.includes("first login without a real site is forced"))
  throw new Error("V305_TEST_MARKERS_MISSING");
if (!release.includes(RELEASE) || !release.includes(CACHE) || !release.includes('"membershipAndOwnedSitesUnion": true') || !release.includes('"requiredWhenAccountHasNoRealSite": true'))
  throw new Error("V305_RELEASE_INVALID");

for (const sourceText of [startup, onboarding, switcher]) {
  if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(sourceText)) throw new Error("V305_RUNTIME_CHURN_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(sourceText))
    throw new Error("V305_DESTRUCTIVE_RUNTIME");
}

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305", `"${RELEASE}"`);
source = upsert(source, "STUDIO_SITE_SWITCHER_RELEASE_V305", `"${SWITCHER_RELEASE}"`);
source = upsert(source, "STUDIO_FIRST_SITE_REQUIRED_RELEASE_V305", `"${FIRST_SITE_RELEASE}"`);
source = upsert(source, "STUDIO_STARTUP_SITE_UNION_RELEASE_V305", `"${STARTUP_UNION_RELEASE}"`);
source = upsert(source, "ACTIVE_VERSION_V305", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V305", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V305}-${ACTIVE_CACHE_RELEASE_V305}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${STUDIO_SITE_SWITCHER_RELEASE_V305}-${STUDIO_FIRST_SITE_REQUIRED_RELEASE_V305}-${STUDIO_STARTUP_SITE_UNION_RELEASE_V305}-${STUDIO_MEMBERS_RELEASE_V304}-${STUDIO_ADD_SITE_RELEASE_V303}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V305}-${ACTIVE_CACHE_RELEASE_V305}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${STUDIO_SITE_SWITCHER_RELEASE_V305}-${STUDIO_FIRST_SITE_REQUIRED_RELEASE_V305}-${STUDIO_STARTUP_SITE_UNION_RELEASE_V305}-${STUDIO_MEMBERS_RELEASE_V304}-${STUDIO_ADD_SITE_RELEASE_V303}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V304", "NGE_BLOGGING_UPDATE_AVAILABLE_V305")
  .replaceAll("service-worker-activated-workspaces-members-v304", "service-worker-activated-site-switch-first-site-v305");

if (!source.includes(RELEASE) || !source.includes(CACHE) || !source.includes(VERSION)) throw new Error("V305_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
  throw new Error("V305_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);