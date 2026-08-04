import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const studioFile = new URL("../src/Studio.jsx", import.meta.url);
const runtimeFile = new URL("../src/studio-final-stability-v275.js", import.meta.url);
const cssFile = new URL("../src/studio-final-stability-v275.css", import.meta.url);
const testFile = new URL("../tests/studio-final-stability-v275.test.mjs", import.meta.url);
const toggleFile = new URL("../src/studio-sidebar-single-toggle-v267.js", import.meta.url);

const RELEASE = "studio-final-stability-v275-20260804";
const VERSION = "ngeblogging-app-v275-final-stability-20260804";
const CACHE_RELEASE = "studio-final-stability-cache-v275";

function replaceOrInsert(source, name, expression) {
  const line = `const ${name} = ${expression};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const version = /^(const VERSION = .*;\n)/m;
  if (!version.test(source)) throw new Error(`V275_SW_VERSION_ANCHOR_MISSING:${name}`);
  return source.replace(version, `$1${line}\n`);
}

const [studio, runtime, css, tests, toggle] = await Promise.all([
  readFile(studioFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(testFile, "utf8"),
  readFile(toggleFile, "utf8"),
]);

if (studio.indexOf('import "./studio-final-stability-v275.css";') <= studio.indexOf('import "./studio-shell-content-v274-hotfix.css";')) {
  throw new Error("V275_LIVE_IMPORT_ORDER_INVALID");
}
for (const marker of [
  RELEASE,
  "MAX_CODE_LINES = 10000",
  "activateSingleToggle",
  "event.stopImmediatePropagation()",
  "normalizeNara",
  "enhanceCodeEditor",
]) if (!runtime.includes(marker)) throw new Error(`V275_RUNTIME_MARKER_MISSING:${marker}`);

for (const marker of [
  "--v275-side-open:240px",
  "#ngeblogging-studio-sidebar",
  ".nara-floating-button",
  'data-nara-interaction="nonmodal"',
  ".tn-layout-map-v264",
  ".tn-code-workspace",
  ".v275-code-lines",
  ".sv124-free-domain",
]) if (!css.includes(marker)) throw new Error(`V275_CSS_MARKER_MISSING:${marker}`);

for (const marker of [
  'import "./studio-final-device-authority-v268.css";',
  'import "./studio-profile-menu-v268.js";',
  'import "./studio-nara-immediate-v268.css";',
  'import "./studio-final-stability-v275.js";',
  "event.stopImmediatePropagation()",
]) if (!toggle.includes(marker)) throw new Error(`V275_TOGGLE_COMPAT_MARKER_MISSING:${marker}`);

for (const marker of [
  "one internal n remains the single sidebar interaction bridge",
  "real line numbers up to 10000",
  "auth persistence remains production-backed",
]) if (!tests.includes(marker)) throw new Error(`V275_TEST_MARKER_MISSING:${marker}`);

for (const source of [runtime, css, toggle]) {
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V275_DESTRUCTIVE_SESSION_OR_RELOAD_ACTION");
  }
}

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE_RELEASE}";`);
source = replaceOrInsert(source, "STUDIO_FINAL_STABILITY_RELEASE_V275", `"${RELEASE}"`);
source = replaceOrInsert(source, "UI_CACHE_RELEASE_V275", `"${CACHE_RELEASE}"`);
source = replaceOrInsert(source, "ACTIVE_VERSION_V275", "VERSION");
source = replaceOrInsert(source, "ACTIVE_CACHE_RELEASE_V275", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V275}-${ACTIVE_CACHE_RELEASE_V275}-${UI_PATCH_RELEASE_V263}-${UI_PATCH_RELEASE_V265}-${UI_CACHE_RELEASE_V265}-${UI_PATCH_RELEASE_V267}-${UI_CACHE_RELEASE_V267}-${UI_PATCH_RELEASE_V268}-${UI_CACHE_RELEASE_V268}-${UI_PATCH_RELEASE_V269}-${UI_CACHE_RELEASE_V269}-${UI_PATCH_RELEASE_V270}-${UI_CACHE_RELEASE_V270}-${UI_PATCH_RELEASE_V272}-${UI_CACHE_RELEASE_V272}-${UI_PATCH_RELEASE_V274}-${UI_CACHE_RELEASE_V274}-${STUDIO_FINAL_STABILITY_RELEASE_V275}-${UI_CACHE_RELEASE_V275}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V275}-${ACTIVE_CACHE_RELEASE_V275}-${UI_PATCH_RELEASE_V263}-${UI_PATCH_RELEASE_V265}-${UI_CACHE_RELEASE_V265}-${UI_PATCH_RELEASE_V267}-${UI_CACHE_RELEASE_V267}-${UI_PATCH_RELEASE_V268}-${UI_CACHE_RELEASE_V268}-${UI_PATCH_RELEASE_V269}-${UI_CACHE_RELEASE_V269}-${UI_PATCH_RELEASE_V270}-${UI_CACHE_RELEASE_V270}-${UI_PATCH_RELEASE_V272}-${UI_CACHE_RELEASE_V272}-${UI_PATCH_RELEASE_V274}-${UI_CACHE_RELEASE_V274}-${STUDIO_FINAL_STABILITY_RELEASE_V275}-${UI_CACHE_RELEASE_V275}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V260", "NGE_BLOGGING_UPDATE_AVAILABLE_V275")
  .replaceAll("service-worker-activated-responsive-shell-v262-r1", "service-worker-activated-final-stability-v275")
  .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v275: notify only; never navigate authenticated tabs automatically.");

for (const marker of [
  VERSION,
  CACHE_RELEASE,
  RELEASE,
  "ACTIVE_VERSION_V275",
  "ACTIVE_CACHE_RELEASE_V275",
  "UI_PATCH_RELEASE_V274",
  "UI_CACHE_RELEASE_V274",
  "UI_PATCH_RELEASE_V272",
  "UI_CACHE_RELEASE_V272",
]) if (!source.includes(marker)) throw new Error(`V275_SW_MARKER_MISSING:${marker}`);

if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V275_SW_DOUBLE_RELOAD_REGRESSION");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V275_SW_SESSION_DESTRUCTIVE_ACTION");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated final service-worker caches to ${CACHE_RELEASE}`);
