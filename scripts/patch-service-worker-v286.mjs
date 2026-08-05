import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeFile = new URL("../src/studio-live-visual-v286.js", import.meta.url);
const cssFile = new URL("../src/studio-live-visual-v286.css", import.meta.url);
const testFile = new URL("../tests/studio-live-visual-v286.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v286.json", import.meta.url);

const RELEASE = "studio-live-visual-v286-20260805";
const VERSION = "ngeblogging-app-v286-live-visual-20260805";
const CACHE = "studio-live-visual-cache-v286";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V286_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [runtime, css, tests, release] = await Promise.all([
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(testFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [RELEASE, "BREAKPOINT = 761", "liveFamily()", "app.dataset.v286Family = family", "normalizeNara()"])
  if (!runtime.includes(marker)) throw new Error(`V286_RUNTIME_MISSING:${marker}`);
for (const marker of ["--v286-side-open:248px", 'data-v286-family="large"', 'data-v286-family="small"', ".nara-floating-button{position:fixed!important", 'grid-template-areas:"preview" "code"'])
  if (!css.includes(marker)) throw new Error(`V286_CSS_MISSING:${marker}`);
if (!tests.includes("v286 live visual authority")) throw new Error("V286_TEST_MISSING");
if (!release.includes(RELEASE) || !release.includes(CACHE)) throw new Error("V286_RELEASE_INVALID");
if (/new MutationObserver|setInterval\s*\(/.test(runtime)) throw new Error("V286_RUNTIME_CHURN_REGRESSION");
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(runtime)) throw new Error("V286_DESTRUCTIVE_RUNTIME");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_LIVE_VISUAL_RELEASE_V286", `"${RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V286", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V286", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V286", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V286}-${ACTIVE_CACHE_RELEASE_V286}-${STUDIO_LIVE_VISUAL_RELEASE_V286}-${UI_CACHE_RELEASE_V286}-${STUDIO_RESPONSIVE_LOCK_RELEASE_V285}-${UI_CACHE_RELEASE_V285}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V286}-${ACTIVE_CACHE_RELEASE_V286}-${STUDIO_LIVE_VISUAL_RELEASE_V286}-${UI_CACHE_RELEASE_V286}-${STUDIO_RESPONSIVE_LOCK_RELEASE_V285}-${UI_CACHE_RELEASE_V285}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V285", "NGE_BLOGGING_UPDATE_AVAILABLE_V286")
  .replaceAll("service-worker-activated-responsive-lock-v285", "service-worker-activated-live-visual-v286");

if (!source.includes(RELEASE) || !source.includes(CACHE)) throw new Error("V286_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(source)) throw new Error("V286_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);
