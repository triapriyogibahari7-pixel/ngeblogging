import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/Studio.jsx", import.meta.url);
const runtimeFile = new URL("../src/studio-native-controls-v281.js", import.meta.url);
const cssFile = new URL("../src/studio-native-controls-v281.css", import.meta.url);
const clickOwnerFile = new URL("../src/studio-shell-precision-v278.js", import.meta.url);
const testFile = new URL("../tests/studio-native-controls-v281.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v281.json", import.meta.url);

const RELEASE = "studio-native-controls-v281-20260805";
const VERSION = "ngeblogging-app-v281-native-controls-20260805";
const CACHE = "studio-native-controls-cache-v281";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V281_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [entry, runtime, css, clickOwner, tests, release] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(clickOwnerFile, "utf8"),
  readFile(testFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  'import "./studio-native-controls-v281.js";',
  'import "./studio-native-controls-v281.css";',
]) if (!entry.includes(marker)) throw new Error(`V281_ENTRY_MISSING:${marker}`);

if (entry.indexOf('import "./studio-native-controls-v281.css";') <= entry.indexOf('import "./studio-native-shell-v280.css";')) {
  throw new Error("V281_IMPORT_ORDER_INVALID");
}

for (const marker of [
  RELEASE,
  "normalizeSidebar",
  "normalizeProfile",
  "normalizeNara",
  "normalizeCodeEditor",
  "guardContentPublish",
  "MAX_CONTENT_WORDS = 5000",
  "MAX_CODE_LINES = 10000",
]) if (!runtime.includes(marker)) throw new Error(`V281_RUNTIME_MISSING:${marker}`);

if (/addEventListener\("scroll"/.test(runtime) || /new MutationObserver/.test(runtime)) {
  throw new Error("V281_RUNTIME_CHURN_REGRESSION");
}
if (/window\.addEventListener\("pointerdown",\s*stopLegacyPointer,\s*true\)/.test(clickOwner)) {
  throw new Error("V281_TOUCH_POINTERDOWN_CAPTURE_STILL_ACTIVE");
}
if (!/window\.addEventListener\("click",\s*activateLogo,\s*true\)/.test(clickOwner)) {
  throw new Error("V281_SINGLE_CLICK_OWNER_MISSING");
}

for (const marker of [
  'data-device-mode="small"',
  'data-device-mode="large"',
  "--v281-side-rail:72px",
  ".nara-floating-button",
  ".nara-attachment-menu",
  ".sn-avatar",
  ".tn-layout-map-v264",
  'grid-template-areas:"code preview"!important',
  'grid-template-areas:"preview" "code"!important',
  ".op41-donut",
  ".sv124-free-domain",
]) if (!css.includes(marker)) throw new Error(`V281_CSS_MISSING:${marker}`);

if (!tests.includes("v281 is final, lightweight")) throw new Error("V281_REGRESSION_TEST_MISSING");
if (!release.includes(RELEASE) || !release.includes(CACHE)) throw new Error("V281_RELEASE_MANIFEST_INVALID");
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(runtime)) {
  throw new Error("V281_DESTRUCTIVE_RUNTIME");
}

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_NATIVE_CONTROLS_RELEASE_V281", `"${RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V281", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V281", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V281", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V281}-${ACTIVE_CACHE_RELEASE_V281}-${STUDIO_NATIVE_CONTROLS_RELEASE_V281}-${UI_CACHE_RELEASE_V281}-${STUDIO_NATIVE_SHELL_RELEASE_V280}-${UI_CACHE_RELEASE_V280}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V281}-${ACTIVE_CACHE_RELEASE_V281}-${STUDIO_NATIVE_CONTROLS_RELEASE_V281}-${UI_CACHE_RELEASE_V281}-${STUDIO_NATIVE_SHELL_RELEASE_V280}-${UI_CACHE_RELEASE_V280}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V280", "NGE_BLOGGING_UPDATE_AVAILABLE_V281")
  .replaceAll("service-worker-activated-native-shell-v280", "service-worker-activated-native-controls-v281");

if (!source.includes(RELEASE) || !source.includes(CACHE)) throw new Error("V281_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(source)) {
  throw new Error("V281_DESTRUCTIVE_SW_BEHAVIOR");
}

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated native controls cache to ${CACHE}`);
