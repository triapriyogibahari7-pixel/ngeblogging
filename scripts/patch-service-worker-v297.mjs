import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeFile = new URL("../src/studio-mode-authority-v297.js", import.meta.url);
const cssFile = new URL("../src/studio-mode-authority-v297.css", import.meta.url);
const nativeFile = new URL("../src/studio-native-controls-v290.js", import.meta.url);
const naraSizeFile = new URL("../src/nara-size-authority-v144.js", import.meta.url);
const naraNonmodalFile = new URL("../src/nara-nonmodal-v151.js", import.meta.url);
const authBootstrapFile = new URL("../src/auth-studio-bootstrap-v106.js", import.meta.url);
const authFile = new URL("../src/lib/supabase.js", import.meta.url);
const releaseFile = new URL("../public/release-v297.json", import.meta.url);
const testFile = new URL("../tests/studio-mode-startup-v297.test.mjs", import.meta.url);

const RELEASE = "studio-mode-startup-authority-v297-20260805";
const VERSION = "ngeblogging-app-v297-mode-startup-authority-20260805";
const CACHE = "studio-mode-startup-cache-v297";
const V296_RELEASE = "studio-theme-catalog-100-v296-20260805";
const V295_RELEASE = "studio-polish-v295-20260805";
const V292_AUTH = "auth-session-handoff-v292-20260805";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V297_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [runtime, css, native, naraSize, naraNonmodal, authBootstrap, auth, release, tests] = await Promise.all([
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(nativeFile, "utf8"),
  readFile(naraSizeFile, "utf8"),
  readFile(naraNonmodalFile, "utf8"),
  readFile(authBootstrapFile, "utf8"),
  readFile(authFile, "utf8"),
  readFile(releaseFile, "utf8"),
  readFile(testFile, "utf8"),
]);

for (const marker of [RELEASE, "syncStudioModeAuthorityV297", "history.replaceState", "nara-react-single-owner-v297-20260805"])
  if (!runtime.includes(marker)) throw new Error(`V297_RUNTIME_MISSING:${marker}`);
for (const marker of [
  '--v297-side-open:220px',
  '--v297-side-rail:70px',
  'html[data-studio-device-mode="small"] .sn-shell>.sn-main',
  'grid-template-areas:"code" "preview"',
  'grid-template-areas:"code preview"',
  '.nara-assistant-layer[data-nara-interaction="nonmodal"]',
]) if (!css.includes(marker)) throw new Error(`V297_CSS_MISSING:${marker}`);
if (!native.includes('import("./studio-mode-authority-v297.js")')) throw new Error("V297_ENTRY_MISSING");
for (const legacy of [naraSize, naraNonmodal]) {
  if (!legacy.includes("retired-v297")) throw new Error("V297_NARA_LEGACY_NOT_RETIRED");
  if (/new MutationObserver|setInterval\s*\(/.test(legacy)) throw new Error("V297_NARA_OBSERVER_REGRESSION");
}
if (!authBootstrap.includes("auth-studio-bootstrap-retired-v297-20260805")) throw new Error("V297_AUTH_BOOTSTRAP_NOT_RETIRED");
if (/location\.(?:replace|reload)\s*\(/.test(authBootstrap)) throw new Error("V297_AUTH_REDIRECT_REGRESSION");
for (const marker of ["persistSession: true", "autoRefreshToken: true", 'appUrl("/?auth=callback")'])
  if (!auth.includes(marker)) throw new Error(`V297_AUTH_PERSISTENCE_MISSING:${marker}`);
if (!release.includes(RELEASE) || !release.includes(CACHE) || !release.includes('"themeCatalogCount": 100')) throw new Error("V297_RELEASE_INVALID");
if (!tests.includes("data-small authoritative")) throw new Error("V297_TEST_MISSING");
if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(runtime))
  throw new Error("V297_DESTRUCTIVE_OR_CHURN_RUNTIME");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_MODE_STARTUP_AUTHORITY_RELEASE_V297", `"${RELEASE}"`);
source = upsert(source, "STUDIO_THEME_CATALOG_COMPAT_RELEASE_V296", `"${V296_RELEASE}"`);
source = upsert(source, "STUDIO_POLISH_COMPAT_RELEASE_V295", `"${V295_RELEASE}"`);
source = upsert(source, "AUTH_SESSION_HANDOFF_COMPAT_RELEASE_V292", `"${V292_AUTH}"`);
source = upsert(source, "UI_CACHE_RELEASE_V297", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V297", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V297", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V297}-${ACTIVE_CACHE_RELEASE_V297}-${STUDIO_MODE_STARTUP_AUTHORITY_RELEASE_V297}-${STUDIO_THEME_CATALOG_COMPAT_RELEASE_V296}-${STUDIO_POLISH_COMPAT_RELEASE_V295}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V297}-${ACTIVE_CACHE_RELEASE_V297}-${STUDIO_MODE_STARTUP_AUTHORITY_RELEASE_V297}-${STUDIO_THEME_CATALOG_COMPAT_RELEASE_V296}-${STUDIO_POLISH_COMPAT_RELEASE_V295}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V296", "NGE_BLOGGING_UPDATE_AVAILABLE_V297")
  .replaceAll("service-worker-activated-theme-catalog-v296", "service-worker-activated-mode-startup-authority-v297");

if (!source.includes(RELEASE) || !source.includes(CACHE) || !source.includes(VERSION) || !source.includes(V296_RELEASE))
  throw new Error("V297_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
  throw new Error("V297_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);
