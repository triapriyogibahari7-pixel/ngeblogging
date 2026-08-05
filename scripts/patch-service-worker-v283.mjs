import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/Studio.jsx", import.meta.url);
const runtimeFile = new URL("../src/studio-native-recovery-v283.js", import.meta.url);
const cssFile = new URL("../src/studio-native-recovery-v283.css", import.meta.url);
const testFile = new URL("../tests/studio-native-recovery-v283.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v283.json", import.meta.url);

const RELEASE = "studio-native-recovery-v283-20260805";
const VERSION = "ngeblogging-app-v283-native-recovery-20260805";
const CACHE = "studio-native-recovery-cache-v283";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V283_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [entry, runtime, css, tests, release] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(testFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  'import "./studio-native-recovery-v283.js";',
  'import "./studio-native-recovery-v283.css";',
]) if (!entry.includes(marker)) throw new Error(`V283_ENTRY_MISSING:${marker}`);

if (entry.indexOf('import "./studio-native-recovery-v283.css";') <= entry.indexOf('import "./studio-native-controls-v281.css";')) {
  throw new Error("V283_IMPORT_ORDER_INVALID");
}

for (const marker of [
  RELEASE,
  "function activateLogo",
  "function restoreProductionAnalytics",
  "MAX_CODE_LINES = 10000",
  "SIDEBAR_STORAGE_KEY",
  "loadAnalytics(view, 30, false)",
]) if (!runtime.includes(marker)) throw new Error(`V283_RUNTIME_MISSING:${marker}`);

if (/new MutationObserver/.test(runtime) || /addEventListener\("scroll"/.test(runtime) || /setInterval\s*\(/.test(runtime)) {
  throw new Error("V283_RUNTIME_CHURN_REGRESSION");
}

for (const marker of [
  '--v283-side-rail:72px',
  '.nara-floating-button{position:fixed!important;right:',
  'data-nara-interaction="nonmodal"',
  '.tn-layout-map-v264',
  'grid-template-areas:"code preview"!important',
  'grid-template-areas:"preview" "code"!important',
  '.v283-code-lines',
  '.op41-line',
  '.sv124-free-domain>aside :is(button,a)',
]) if (!css.includes(marker)) throw new Error(`V283_CSS_MISSING:${marker}`);

if (!tests.includes("v283 is the last Studio shell authority")) throw new Error("V283_REGRESSION_TEST_MISSING");
if (!release.includes(RELEASE) || !release.includes(CACHE)) throw new Error("V283_RELEASE_MANIFEST_INVALID");
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(runtime)) {
  throw new Error("V283_DESTRUCTIVE_RUNTIME");
}

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_NATIVE_RECOVERY_RELEASE_V283", `"${RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V283", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V283", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V283", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V283}-${ACTIVE_CACHE_RELEASE_V283}-${STUDIO_NATIVE_RECOVERY_RELEASE_V283}-${UI_CACHE_RELEASE_V283}-${STUDIO_NATIVE_CONTROLS_RELEASE_V281}-${UI_CACHE_RELEASE_V281}-${STUDIO_NATIVE_SHELL_RELEASE_V280}-${UI_CACHE_RELEASE_V280}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V283}-${ACTIVE_CACHE_RELEASE_V283}-${STUDIO_NATIVE_RECOVERY_RELEASE_V283}-${UI_CACHE_RELEASE_V283}-${STUDIO_NATIVE_CONTROLS_RELEASE_V281}-${UI_CACHE_RELEASE_V281}-${STUDIO_NATIVE_SHELL_RELEASE_V280}-${UI_CACHE_RELEASE_V280}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V281", "NGE_BLOGGING_UPDATE_AVAILABLE_V283")
  .replaceAll("service-worker-activated-native-controls-v281", "service-worker-activated-native-recovery-v283");

if (!source.includes(RELEASE) || !source.includes(CACHE)) throw new Error("V283_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(source)) {
  throw new Error("V283_DESTRUCTIVE_SW_BEHAVIOR");
}

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);
