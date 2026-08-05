import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/Studio.jsx", import.meta.url);
const runtimeFile = new URL("../src/studio-native-polish-v284.js", import.meta.url);
const cssFile = new URL("../src/studio-native-polish-v284.css", import.meta.url);
const testFile = new URL("../tests/studio-native-polish-v284.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v284.json", import.meta.url);

const RELEASE = "studio-native-polish-v284-20260805";
const VERSION = "ngeblogging-app-v284-native-polish-20260805";
const CACHE = "studio-native-polish-cache-v284";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V284_SW_ANCHOR_MISSING:${name}`);
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
  'import "./studio-native-polish-v284.js";',
  'import "./studio-native-polish-v284.css";',
]) if (!entry.includes(marker)) throw new Error(`V284_ENTRY_MISSING:${marker}`);

const activeImports = new Set(entry.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("import ")));
if (activeImports.has('import "./studio-native-recovery-v283.js";')) throw new Error("V284_V283_CAPTURE_RUNTIME_STILL_ACTIVE");
if (entry.indexOf('import "./studio-native-polish-v284.css";') <= entry.indexOf('import "./studio-native-polish-v284.js";')) throw new Error("V284_IMPORT_ORDER_INVALID");

for (const marker of [
  RELEASE,
  "mark.addEventListener(\"click\", onLogoClick)",
  "reactToggle()?.click()",
  "MAX_CODE_LINES = 10000",
  "loadAnalytics(view, 30, false)",
]) if (!runtime.includes(marker)) throw new Error(`V284_RUNTIME_MISSING:${marker}`);

if (/window\.addEventListener\("click"/.test(runtime) || /stopImmediatePropagation/.test(runtime) || /new MutationObserver/.test(runtime) || /document\.addEventListener\("input"/.test(runtime) || /setInterval\s*\(/.test(runtime)) {
  throw new Error("V284_RUNTIME_CHURN_OR_CAPTURE_REGRESSION");
}

for (const marker of [
  "--v284-side-open:248px",
  ".sn-shell{font-size:14px!important",
  ".nara-floating-button{position:fixed!important;right:",
  'data-nara-interaction="nonmodal"',
  '.tn-layout-map-v264{width:660px!important',
  'grid-template-areas:"code preview"!important',
  'grid-template-areas:"preview" "code"!important',
  ".v284-code-lines",
  ".op41-line{min-height:360px!important",
]) if (!css.includes(marker)) throw new Error(`V284_CSS_MISSING:${marker}`);

if (!tests.includes("v284 is the active final Studio shell")) throw new Error("V284_REGRESSION_TEST_MISSING");
if (!release.includes(RELEASE) || !release.includes(CACHE)) throw new Error("V284_RELEASE_MANIFEST_INVALID");
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(runtime)) throw new Error("V284_DESTRUCTIVE_RUNTIME");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_NATIVE_POLISH_RELEASE_V284", `"${RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V284", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V284", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V284", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V284}-${ACTIVE_CACHE_RELEASE_V284}-${STUDIO_NATIVE_POLISH_RELEASE_V284}-${UI_CACHE_RELEASE_V284}-${STUDIO_NATIVE_RECOVERY_RELEASE_V283}-${UI_CACHE_RELEASE_V283}-${STUDIO_NATIVE_CONTROLS_RELEASE_V281}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V284}-${ACTIVE_CACHE_RELEASE_V284}-${STUDIO_NATIVE_POLISH_RELEASE_V284}-${UI_CACHE_RELEASE_V284}-${STUDIO_NATIVE_RECOVERY_RELEASE_V283}-${UI_CACHE_RELEASE_V283}-${STUDIO_NATIVE_CONTROLS_RELEASE_V281}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V283", "NGE_BLOGGING_UPDATE_AVAILABLE_V284")
  .replaceAll("service-worker-activated-native-recovery-v283", "service-worker-activated-native-polish-v284");

if (!source.includes(RELEASE) || !source.includes(CACHE)) throw new Error("V284_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(source)) throw new Error("V284_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);
