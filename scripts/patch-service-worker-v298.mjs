import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeFile = new URL("../src/studio-shell-authority-v298.js", import.meta.url);
const cssFile = new URL("../src/studio-shell-authority-v298.css", import.meta.url);
const nativeFile = new URL("../src/studio-native-controls-v290.js", import.meta.url);
const authFile = new URL("../src/lib/supabase.js", import.meta.url);
const releaseFile = new URL("../public/release-v298.json", import.meta.url);
const testFile = new URL("../tests/studio-shell-authority-v298.test.mjs", import.meta.url);

const RELEASE = "studio-shell-authority-v298-20260805";
const VERSION = "ngeblogging-app-v298-shell-authority-20260805";
const CACHE = "studio-shell-cache-v298";
const V297_RELEASE = "studio-mode-startup-authority-v297-20260805";
const V296_RELEASE = "studio-theme-catalog-100-v296-20260805";
const V292_AUTH = "auth-session-handoff-v292-20260805";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V298_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [runtime, css, native, auth, release, tests] = await Promise.all([
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(nativeFile, "utf8"),
  readFile(authFile, "utf8"),
  readFile(releaseFile, "utf8"),
  readFile(testFile, "utf8"),
]);

for (const marker of [RELEASE, "studio-single-n-owner-v298-20260805", "function toggleN(event)", "sn-profile-menu-v298", "normalizeNaraState"])
  if (!runtime.includes(marker)) throw new Error(`V298_RUNTIME_MISSING:${marker}`);
for (const marker of [
  "--v298-side-open:220px",
  "--v298-side-rail:70px",
  '.sn-shell[data-device-mode="small"]',
  '.sn-shell[data-device-mode="large"]',
  "width:min(78vw,336px)!important",
  ".nara-floating-button{position:fixed!important",
  'grid-template-areas:"code preview"',
  'grid-template-areas:"code" "preview"',
]) if (!css.includes(marker)) throw new Error(`V298_CSS_MISSING:${marker}`);
if (!native.includes("studio-native-capture-retired-v298-20260805")) throw new Error("V298_OLD_NATIVE_OWNER_NOT_RETIRED");
if (!native.includes('import("./studio-shell-authority-v298.js")')) throw new Error("V298_ENTRY_MISSING");
if (/function nativeToggle\s*\(|document\.addEventListener\("click",\s*nativeToggle/.test(native)) throw new Error("V298_V290_CAPTURE_REACTIVATED");
for (const marker of ["persistSession: true", "autoRefreshToken: true", 'appUrl("/?auth=callback")'])
  if (!auth.includes(marker)) throw new Error(`V298_AUTH_PERSISTENCE_MISSING:${marker}`);
if (!release.includes(RELEASE) || !release.includes(CACHE) || !release.includes('"themeCatalogCount": 100')) throw new Error("V298_RELEASE_INVALID");
if (!tests.includes("v298 is the single lightweight n/profile shell authority")) throw new Error("V298_TEST_MISSING");
for (const sourceText of [runtime, native]) {
  if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(sourceText)) throw new Error("V298_RUNTIME_CHURN_OR_BLOCKING_REGRESSION");
  if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(sourceText)) throw new Error("V298_DESTRUCTIVE_RUNTIME");
}

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_SHELL_AUTHORITY_RELEASE_V298", `"${RELEASE}"`);
source = upsert(source, "STUDIO_MODE_STARTUP_COMPAT_RELEASE_V297", `"${V297_RELEASE}"`);
source = upsert(source, "STUDIO_THEME_CATALOG_COMPAT_RELEASE_V296", `"${V296_RELEASE}"`);
source = upsert(source, "AUTH_SESSION_HANDOFF_COMPAT_RELEASE_V292", `"${V292_AUTH}"`);
source = upsert(source, "UI_CACHE_RELEASE_V298", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V298", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V298", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V298}-${ACTIVE_CACHE_RELEASE_V298}-${STUDIO_SHELL_AUTHORITY_RELEASE_V298}-${STUDIO_MODE_STARTUP_COMPAT_RELEASE_V297}-${STUDIO_THEME_CATALOG_COMPAT_RELEASE_V296}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V298}-${ACTIVE_CACHE_RELEASE_V298}-${STUDIO_SHELL_AUTHORITY_RELEASE_V298}-${STUDIO_MODE_STARTUP_COMPAT_RELEASE_V297}-${STUDIO_THEME_CATALOG_COMPAT_RELEASE_V296}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V297", "NGE_BLOGGING_UPDATE_AVAILABLE_V298")
  .replaceAll("service-worker-activated-mode-startup-authority-v297", "service-worker-activated-shell-authority-v298");

if (!source.includes(RELEASE) || !source.includes(CACHE) || !source.includes(VERSION) || !source.includes(V297_RELEASE))
  throw new Error("V298_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
  throw new Error("V298_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);
