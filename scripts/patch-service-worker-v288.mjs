import "./patch-service-worker-v287.mjs";
import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeFile = new URL("../src/studio-screenshot-polish-v288.js", import.meta.url);
const cssFile = new URL("../src/studio-screenshot-polish-v288.css", import.meta.url);
const testFile = new URL("../tests/studio-screenshot-polish-v288.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v288.json", import.meta.url);

const RELEASE = "studio-screenshot-polish-v288-20260805";
const VERSION = "ngeblogging-app-v288-screenshot-polish-20260805";
const CACHE = "studio-screenshot-polish-cache-v288";

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

for (const marker of [RELEASE, "ensureHomeAddSite", "closeSmallDrawerAfterOutsideClick", "normalizeNara", "normalizeThemeStudio"])
  if (!runtime.includes(marker)) throw new Error(`V288_RUNTIME_MISSING:${marker}`);
for (const marker of [".sn-add-site-v288", ".nara-attachment-menu{display:grid!important", ".tn-layout-map-v264{display:grid!important;width:min(100%,760px)!important", 'grid-template-areas:"preview" "code"', 'grid-template-areas:"code preview"'])
  if (!css.includes(marker)) throw new Error(`V288_CSS_MISSING:${marker}`);
if (!tests.includes("v288 loads after the non-destructive v287 owner")) throw new Error("V288_TEST_MISSING");
if (!release.includes(RELEASE) || !release.includes(CACHE)) throw new Error("V288_RELEASE_INVALID");
if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(runtime)) throw new Error("V288_RUNTIME_CHURN_OR_BLOCKING_REGRESSION");
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(runtime)) throw new Error("V288_DESTRUCTIVE_RUNTIME");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_SCREENSHOT_POLISH_RELEASE_V288", `"${RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V288", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V288", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V288", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V288}-${ACTIVE_CACHE_RELEASE_V288}-${STUDIO_SCREENSHOT_POLISH_RELEASE_V288}-${UI_CACHE_RELEASE_V288}-${STUDIO_REACT_SHELL_RELEASE_V287}-${UI_CACHE_RELEASE_V287}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V288}-${ACTIVE_CACHE_RELEASE_V288}-${STUDIO_SCREENSHOT_POLISH_RELEASE_V288}-${UI_CACHE_RELEASE_V288}-${STUDIO_REACT_SHELL_RELEASE_V287}-${UI_CACHE_RELEASE_V287}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V287", "NGE_BLOGGING_UPDATE_AVAILABLE_V288")
  .replaceAll("service-worker-activated-react-shell-v287", "service-worker-activated-screenshot-polish-v288");

if (!source.includes(RELEASE) || !source.includes(CACHE) || !source.includes(VERSION)) throw new Error("V288_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source)) throw new Error("V288_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);

// v289 and v290 are non-destructive finalizers layered on top of v288. Keeping
// the chain in one build hook avoids replaying historical UI patchers while
// rotating the service-worker cache for every production release.
await import("./patch-service-worker-v289.mjs");
await import("./patch-service-worker-v290.mjs");
