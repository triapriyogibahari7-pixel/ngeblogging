import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeFile = new URL("../src/studio-stable-ui-v287.js", import.meta.url);
const cssFile = new URL("../src/studio-stable-ui-v287.css", import.meta.url);
const testFile = new URL("../tests/studio-stable-ui-v287.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v287.json", import.meta.url);

const RELEASE = "studio-stable-ui-v287-20260805";
const VERSION = "ngeblogging-app-v287-stable-ui-20260805";
const CACHE = "studio-stable-ui-cache-v287";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V287_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [runtime, css, tests, release] = await Promise.all([
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(testFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [RELEASE, "stableFamily()", "dataset.studioDeviceMode", "normalizeSidebar", "normalizeNara", PROFILE_MARKER()]) {
  if (!runtime.includes(marker)) throw new Error(`V287_RUNTIME_MISSING:${marker}`);
}
for (const marker of ["--v287-side-open:252px", 'data-v287-family="large"', 'data-v287-family="small"', ".nara-floating-button{position:fixed!important", 'grid-template-areas:"preview" "code"']) {
  if (!css.includes(marker)) throw new Error(`V287_CSS_MISSING:${marker}`);
}
if (!tests.includes("v287 is chained after v286")) throw new Error("V287_TEST_MISSING");
if (!release.includes(RELEASE) || !release.includes(CACHE)) throw new Error("V287_RELEASE_INVALID");
if (/new MutationObserver|setInterval\s*\(/.test(runtime)) throw new Error("V287_RUNTIME_CHURN_REGRESSION");
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(runtime)) throw new Error("V287_DESTRUCTIVE_RUNTIME");

function PROFILE_MARKER() {
  return "data-v287-profile-action";
}

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_STABLE_UI_RELEASE_V287", `"${RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V287", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V287", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V287", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V287}-${ACTIVE_CACHE_RELEASE_V287}-${STUDIO_STABLE_UI_RELEASE_V287}-${UI_CACHE_RELEASE_V287}-${STUDIO_LIVE_VISUAL_RELEASE_V286}-${UI_CACHE_RELEASE_V286}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V287}-${ACTIVE_CACHE_RELEASE_V287}-${STUDIO_STABLE_UI_RELEASE_V287}-${UI_CACHE_RELEASE_V287}-${STUDIO_LIVE_VISUAL_RELEASE_V286}-${UI_CACHE_RELEASE_V286}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V286", "NGE_BLOGGING_UPDATE_AVAILABLE_V287")
  .replaceAll("service-worker-activated-live-visual-v286", "service-worker-activated-stable-ui-v287");

if (!source.includes(RELEASE) || !source.includes(CACHE) || !source.includes(VERSION)) throw new Error("V287_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(source)) throw new Error("V287_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);
