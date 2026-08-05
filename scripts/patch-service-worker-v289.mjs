import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeFile = new URL("../src/studio-final-pass-v289.js", import.meta.url);
const cssFile = new URL("../src/studio-final-pass-v289.css", import.meta.url);
const testFile = new URL("../tests/studio-final-pass-v289.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v289.json", import.meta.url);

const RELEASE = "studio-final-pass-v289-20260805";
const VERSION = "ngeblogging-app-v289-final-pass-20260805";
const CACHE = "studio-final-pass-cache-v289";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V289_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [runtime, css, tests, release] = await Promise.all([
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(testFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [RELEASE, "syncDeviceContract", "syncSidebar", "syncSidebarPersistence", "syncNara", "syncThemeStudio", "syncAnalytics", "loadAnalytics(view, 30, false)"])
  if (!runtime.includes(marker)) throw new Error(`V289_RUNTIME_MISSING:${marker}`);
for (const marker of ["--v289-side-open:248px", 'data-studio-device-mode="large"', 'data-studio-device-mode="small"', ".nara-floating-button{position:fixed!important", "body.sn-mobile-sidebar-open .sn-side-backdrop", 'grid-template-areas:"preview" "code"', 'grid-template-areas:"code preview"'])
  if (!css.includes(marker)) throw new Error(`V289_CSS_MISSING:${marker}`);
if (!tests.includes("v289 loads after v288")) throw new Error("V289_TEST_MISSING");
if (!release.includes(RELEASE) || !release.includes(CACHE)) throw new Error("V289_RELEASE_INVALID");
if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(runtime)) throw new Error("V289_RUNTIME_CHURN_OR_BLOCKING_REGRESSION");
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(runtime)) throw new Error("V289_DESTRUCTIVE_RUNTIME");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_FINAL_PASS_RELEASE_V289", `"${RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V289", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V289", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V289", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V289}-${ACTIVE_CACHE_RELEASE_V289}-${STUDIO_FINAL_PASS_RELEASE_V289}-${UI_CACHE_RELEASE_V289}-${STUDIO_SCREENSHOT_POLISH_RELEASE_V288}-${UI_CACHE_RELEASE_V288}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V289}-${ACTIVE_CACHE_RELEASE_V289}-${STUDIO_FINAL_PASS_RELEASE_V289}-${UI_CACHE_RELEASE_V289}-${STUDIO_SCREENSHOT_POLISH_RELEASE_V288}-${UI_CACHE_RELEASE_V288}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V288", "NGE_BLOGGING_UPDATE_AVAILABLE_V289")
  .replaceAll("service-worker-activated-screenshot-polish-v288", "service-worker-activated-final-pass-v289");

if (!source.includes(RELEASE) || !source.includes(CACHE) || !source.includes(VERSION)) throw new Error("V289_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source)) throw new Error("V289_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);
