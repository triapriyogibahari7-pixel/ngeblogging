import { readFile, writeFile } from "node:fs/promises";

// v288 builds on the safe v287 worker state so a clean checkout does not depend
// on a previously generated public/sw.js.
await import("./patch-service-worker-v287.mjs");

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeFile = new URL("../src/studio-final-authority-v288.js", import.meta.url);
const cssFile = new URL("../src/studio-final-authority-v288.css", import.meta.url);
const testFile = new URL("../tests/studio-final-authority-v288.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v288.json", import.meta.url);

const RELEASE = "studio-final-authority-v288-20260805";
const VERSION = "ngeblogging-app-v288-final-authority-20260805";
const CACHE = "studio-final-authority-cache-v288";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V288_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [runtime, css, tests, release] = await Promise.all([
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(testFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [RELEASE, "syncDeviceContract()", "syncSidebar()", "syncNara()", "syncThemeStudio()"])
  if (!runtime.includes(marker)) throw new Error(`V288_RUNTIME_MISSING:${marker}`);
for (const marker of ["--v288-side-open:248px", 'data-studio-device-mode="large"', 'data-studio-device-mode="small"', ".nara-floating-button{position:fixed!important", 'grid-template-areas:"preview" "code"', 'grid-template-areas:"code preview"'])
  if (!css.includes(marker)) throw new Error(`V288_CSS_MISSING:${marker}`);
if (!tests.includes("v288 loads after the v287 interaction owner")) throw new Error("V288_TEST_MISSING");
if (!release.includes(RELEASE) || !release.includes(CACHE)) throw new Error("V288_RELEASE_INVALID");
if (/new MutationObserver|setInterval\s*\(/.test(runtime)) throw new Error("V288_RUNTIME_CHURN_REGRESSION");
if (/stopImmediatePropagation/.test(runtime)) throw new Error("V288_BLOCKING_CAPTURE_REGRESSION");
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(runtime)) throw new Error("V288_DESTRUCTIVE_RUNTIME");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_FINAL_AUTHORITY_RELEASE_V288", `"${RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V288", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V288", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V288", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V288}-${ACTIVE_CACHE_RELEASE_V288}-${STUDIO_FINAL_AUTHORITY_RELEASE_V288}-${UI_CACHE_RELEASE_V288}-${STUDIO_REACT_SHELL_RELEASE_V287}-${UI_CACHE_RELEASE_V287}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V288}-${ACTIVE_CACHE_RELEASE_V288}-${STUDIO_FINAL_AUTHORITY_RELEASE_V288}-${UI_CACHE_RELEASE_V288}-${STUDIO_REACT_SHELL_RELEASE_V287}-${UI_CACHE_RELEASE_V287}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V287", "NGE_BLOGGING_UPDATE_AVAILABLE_V288")
  .replaceAll("service-worker-activated-react-shell-v287", "service-worker-activated-final-authority-v288");

if (!source.includes(RELEASE) || !source.includes(CACHE)) throw new Error("V288_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(source)) throw new Error("V288_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);
