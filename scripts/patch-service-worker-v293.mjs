import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeFile = new URL("../src/studio-final-authority-v293.js", import.meta.url);
const cssFile = new URL("../src/studio-final-authority-v293.css", import.meta.url);
const nativeFile = new URL("../src/studio-native-controls-v290.js", import.meta.url);
const startupFile = new URL("../src/studio-startup-v292.js", import.meta.url);
const testFile = new URL("../tests/studio-startup-v292.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v293.json", import.meta.url);

const RELEASE = "studio-final-authority-v293-20260805";
const VERSION = "ngeblogging-app-v293-final-authority-20260805";
const CACHE = "studio-final-authority-cache-v293";
const V292_COMPAT_VERSION = "ngeblogging-app-v292-startup-direct-data-20260805";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V293_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [runtime, css, native, startup, tests, release] = await Promise.all([
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(nativeFile, "utf8"),
  readFile(startupFile, "utf8"),
  readFile(testFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [RELEASE, "studio-theme-layout-v264.css", "CONTENT_WORD_LIMIT = 5_000", "CODE_LINE_LIMIT = 10_000", "guardPublish", "syncNara", "syncCodeEditor"])
  if (!runtime.includes(marker)) throw new Error(`V293_RUNTIME_MISSING:${marker}`);
for (const marker of ["--v293-side-open:220px", "--v293-side-rail:70px", ".tn-code-gutter-v293", 'grid-template-areas:"code preview"', 'grid-template-areas:"preview" "code"', '.nara-floating-button{position:fixed!important'])
  if (!css.includes(marker)) throw new Error(`V293_CSS_MISSING:${marker}`);
if (!native.includes('import("./studio-final-authority-v293.js")')) throw new Error("V293_ENTRY_MISSING");
if (!startup.includes("studio-startup-direct-data-v292-20260805")) throw new Error("V293_STARTUP_V292_NOT_PRESERVED");
if (!tests.includes("v293 completes six-mode UI recovery without replacing auth startup")) throw new Error("V293_TEST_MISSING");
if (!release.includes(RELEASE) || !release.includes(CACHE)) throw new Error("V293_RELEASE_INVALID");
if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(runtime)) throw new Error("V293_RUNTIME_CHURN_REGRESSION");
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(runtime)) throw new Error("V293_DESTRUCTIVE_RUNTIME");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_FINAL_AUTHORITY_RELEASE_V293", `"${RELEASE}"`);
source = upsert(source, "STUDIO_STARTUP_COMPAT_VERSION_V292", `"${V292_COMPAT_VERSION}"`);
source = upsert(source, "UI_CACHE_RELEASE_V293", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V293", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V293", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V293}-${ACTIVE_CACHE_RELEASE_V293}-${STUDIO_FINAL_AUTHORITY_RELEASE_V293}-${UI_CACHE_RELEASE_V293}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${UI_CACHE_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V293}-${ACTIVE_CACHE_RELEASE_V293}-${STUDIO_FINAL_AUTHORITY_RELEASE_V293}-${UI_CACHE_RELEASE_V293}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${UI_CACHE_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V292", "NGE_BLOGGING_UPDATE_AVAILABLE_V293")
  .replaceAll("service-worker-activated-startup-direct-data-v292", "service-worker-activated-final-authority-v293");

if (!source.includes(RELEASE) || !source.includes(CACHE) || !source.includes(VERSION) || !source.includes(V292_COMPAT_VERSION)) throw new Error("V293_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source)) throw new Error("V293_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);
