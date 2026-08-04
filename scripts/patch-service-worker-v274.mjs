import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const studioFile = new URL("../src/Studio.jsx", import.meta.url);
const runtimeFile = new URL("../src/studio-shell-content-v274.js", import.meta.url);
const cssFile = new URL("../src/studio-shell-content-v274.css", import.meta.url);
const testFile = new URL("../tests/studio-shell-content-v274.test.mjs", import.meta.url);

const RELEASE = "studio-shell-content-v274-20260804";
const CACHE_RELEASE = "studio-shell-content-cache-v274";

function replaceOrInsert(source, name, expression) {
  const line = `const ${name} = ${expression};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const version = /^(const VERSION = .*;\n)/m;
  if (!version.test(source)) throw new Error(`V274_SW_VERSION_ANCHOR_MISSING:${name}`);
  return source.replace(version, `$1${line}\n`);
}

const [studio, runtime, css, tests] = await Promise.all([
  readFile(studioFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(testFile, "utf8"),
]);

if (studio.indexOf('import "./studio-shell-content-v274.js";') <= studio.indexOf('import "./studio-shell-authority-v272.js";')) {
  throw new Error("V274_LIVE_IMPORT_ORDER_INVALID");
}
for (const marker of [
  "studio-shell-content-v274-20260804",
  "dataset.v274State",
  "loadAnalytics(view, 30, false)",
  "afterNavigation",
]) if (!runtime.includes(marker)) throw new Error(`V274_RUNTIME_MARKER_MISSING:${marker}`);

for (const marker of [
  "--v274-side-open:240px",
  "#ngeblogging-studio-sidebar>nav",
  ".tn-layout-map-v264",
  ".tn-code-workspace",
  ".nara-floating-button",
  ".nara-attachment-menu",
  ".op41-line",
]) if (!css.includes(marker)) throw new Error(`V274_CSS_MARKER_MISSING:${marker}`);

if (!tests.includes("Nara remains fixed") || !tests.includes("analytics is production-first")) {
  throw new Error("V274_REGRESSION_MARKERS_MISSING");
}
for (const source of [runtime, css]) {
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(source)) {
    throw new Error("V274_DESTRUCTIVE_SESSION_OR_RELOAD_ACTION");
  }
}

let source = await readFile(swFile, "utf8");
source = replaceOrInsert(source, "UI_PATCH_RELEASE_V274", `"${RELEASE}"`);
source = replaceOrInsert(source, "UI_CACHE_RELEASE_V274", `"${CACHE_RELEASE}"`);
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${UI_PATCH_RELEASE_V263}-${UI_PATCH_RELEASE_V265}-${UI_CACHE_RELEASE_V265}-${UI_PATCH_RELEASE_V267}-${UI_CACHE_RELEASE_V267}-${UI_PATCH_RELEASE_V268}-${UI_CACHE_RELEASE_V268}-${UI_PATCH_RELEASE_V269}-${UI_CACHE_RELEASE_V269}-${UI_PATCH_RELEASE_V270}-${UI_CACHE_RELEASE_V270}-${UI_PATCH_RELEASE_V272}-${UI_CACHE_RELEASE_V272}-${UI_PATCH_RELEASE_V274}-${UI_CACHE_RELEASE_V274}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${UI_PATCH_RELEASE_V263}-${UI_PATCH_RELEASE_V265}-${UI_CACHE_RELEASE_V265}-${UI_PATCH_RELEASE_V267}-${UI_CACHE_RELEASE_V267}-${UI_PATCH_RELEASE_V268}-${UI_CACHE_RELEASE_V268}-${UI_PATCH_RELEASE_V269}-${UI_CACHE_RELEASE_V269}-${UI_PATCH_RELEASE_V270}-${UI_CACHE_RELEASE_V270}-${UI_PATCH_RELEASE_V272}-${UI_CACHE_RELEASE_V272}-${UI_PATCH_RELEASE_V274}-${UI_CACHE_RELEASE_V274}-${AUTH_HANDOFF_RELEASE}-assets`;');

for (const marker of ["UI_PATCH_RELEASE_V274", "UI_CACHE_RELEASE_V274", RELEASE, CACHE_RELEASE]) {
  if (!source.includes(marker)) throw new Error(`V274_SW_MARKER_MISSING:${marker}`);
}
await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated service-worker assets to ${CACHE_RELEASE}`);
