import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/Studio.jsx", import.meta.url);
const runtimeFile = new URL("../src/studio-live-shell-v279.js", import.meta.url);
const cssFile = new URL("../src/studio-live-shell-v279.css", import.meta.url);
const testFile = new URL("../tests/studio-live-shell-v279.test.mjs", import.meta.url);

const RELEASE = "studio-live-shell-v279-20260804";
const VERSION = "ngeblogging-app-v279-live-shell-20260804";
const CACHE = "studio-live-shell-cache-v279";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V279_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [entry, runtime, css, tests] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(testFile, "utf8"),
]);

for (const marker of [
  'import "./studio-live-shell-v279.js";',
  'import "./studio-live-shell-v279.css";',
]) if (!entry.includes(marker)) throw new Error(`V279_ENTRY_MISSING:${marker}`);

if (entry.indexOf('import "./studio-live-shell-v279.css";') <= entry.indexOf('import "./studio-shell-precision-v278.css";')) {
  throw new Error("V279_IMPORT_ORDER_INVALID");
}

for (const marker of [
  RELEASE,
  "RETIRED_LIVE_OBSERVERS_BY",
  "resetContainingBlocks",
  "normalizeSidebar",
  "normalizeTopbar",
  "normalizeNara",
]) if (!runtime.includes(marker)) throw new Error(`V279_RUNTIME_MISSING:${marker}`);

if (/addEventListener\("scroll"/.test(runtime) || /visualViewport\?\.addEventListener\("scroll"/.test(runtime)) {
  throw new Error("V279_SCROLL_OBSERVER_NOT_RETIRED");
}

for (const marker of [
  'data-device-mode="small"',
  'data-device-mode="large"',
  "contain:none!important",
  ".nara-floating-button",
  ".sn-avatar",
  "#ngeblogging-studio-sidebar:not(.mobile-open)",
]) if (!css.includes(marker)) throw new Error(`V279_CSS_MISSING:${marker}`);

if (/addEventListener\("click",\s*activateLogo/.test(runtime)) throw new Error("V279_SECOND_N_CLICK_OWNER");
if (!tests.includes("service-worker build gate no longer rejects an unused compatibility helper")) throw new Error("V279_REGRESSION_TEST_MISSING");
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(runtime)) throw new Error("V279_DESTRUCTIVE_RUNTIME");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_LIVE_SHELL_RELEASE_V279", `"${RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V279", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V279", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V279", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V279}-${ACTIVE_CACHE_RELEASE_V279}-${STUDIO_LIVE_SHELL_RELEASE_V279}-${UI_CACHE_RELEASE_V279}-${STUDIO_SHELL_PRECISION_RELEASE_V278}-${UI_CACHE_RELEASE_V278}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V279}-${ACTIVE_CACHE_RELEASE_V279}-${STUDIO_LIVE_SHELL_RELEASE_V279}-${UI_CACHE_RELEASE_V279}-${STUDIO_SHELL_PRECISION_RELEASE_V278}-${UI_CACHE_RELEASE_V278}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V278", "NGE_BLOGGING_UPDATE_AVAILABLE_V279")
  .replaceAll("service-worker-activated-shell-precision-v278", "service-worker-activated-live-shell-v279");

if (!source.includes(RELEASE) || !source.includes(CACHE)) throw new Error("V279_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(source)) {
  throw new Error("V279_DESTRUCTIVE_SW_BEHAVIOR");
}

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} as compatibility boot layer and rotated live cache to ${CACHE}`);

await import("./patch-service-worker-v280.mjs");