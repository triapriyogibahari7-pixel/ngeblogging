import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-catalog-v296.js", import.meta.url);
const nativeFile = new URL("../src/studio-native-controls-v290.js", import.meta.url);
const catalogFile = new URL("../src/theme-catalog.js", import.meta.url);
const releaseFile = new URL("../public/release-v296.json", import.meta.url);
const testFile = new URL("../tests/studio-theme-catalog-v296.test.mjs", import.meta.url);

const RELEASE = "studio-theme-catalog-100-v296-20260805";
const VERSION = "ngeblogging-app-v296-theme-catalog-100-20260805";
const CACHE = "studio-theme-catalog-cache-v296";
const V295_RELEASE = "studio-polish-v295-20260805";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V296_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [runtime, native, catalog, release, tests] = await Promise.all([
  readFile(runtimeFile, "utf8"),
  readFile(nativeFile, "utf8"),
  readFile(catalogFile, "utf8"),
  readFile(releaseFile, "utf8"),
  readFile(testFile, "utf8"),
]);

for (const marker of [RELEASE, "STUDIO_THEME_TARGET_V296 = 100", "ensureThemeCatalog100V296", "custom-creator-v296", "custom-signal-v296", "custom-venture-v296", "custom-folio-v296", "custom-manual-v296"])
  if (!runtime.includes(marker)) throw new Error(`V296_RUNTIME_MISSING:${marker}`);
if (!native.includes('import("./studio-theme-catalog-v296.js")')) throw new Error("V296_ENTRY_MISSING");
if (!catalog.includes("FAMILIES.flatMap") || !catalog.includes("COMPOSITIONS.map")) throw new Error("V296_BASE_CATALOG_MISSING");
if (!release.includes('"baseCatalogBeforeV296": 95') || !release.includes('"result": 100')) throw new Error("V296_RELEASE_COUNT_INVALID");
if (!tests.includes("exactly 100 themes")) throw new Error("V296_REAL_COUNT_TEST_MISSING");
if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(runtime))
  throw new Error("V296_DESTRUCTIVE_OR_CHURN_RUNTIME");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_THEME_CATALOG_RELEASE_V296", `"${RELEASE}"`);
source = upsert(source, "STUDIO_POLISH_COMPAT_RELEASE_V295", `"${V295_RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V296", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V296", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V296", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V296}-${ACTIVE_CACHE_RELEASE_V296}-${STUDIO_THEME_CATALOG_RELEASE_V296}-${STUDIO_POLISH_COMPAT_RELEASE_V295}-${STUDIO_MOBILE_CLASSIFIER_COMPAT_RELEASE_V294}-${STUDIO_FINAL_AUTHORITY_COMPAT_RELEASE_V293}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V296}-${ACTIVE_CACHE_RELEASE_V296}-${STUDIO_THEME_CATALOG_RELEASE_V296}-${STUDIO_POLISH_COMPAT_RELEASE_V295}-${STUDIO_MOBILE_CLASSIFIER_COMPAT_RELEASE_V294}-${STUDIO_FINAL_AUTHORITY_COMPAT_RELEASE_V293}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V295", "NGE_BLOGGING_UPDATE_AVAILABLE_V296")
  .replaceAll("service-worker-activated-production-recovery-v295", "service-worker-activated-theme-catalog-v296");

if (!source.includes(RELEASE) || !source.includes(CACHE) || !source.includes(VERSION)) throw new Error("V296_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
  throw new Error("V296_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);
