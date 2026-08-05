import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/Studio.jsx", import.meta.url);
const runtimeFile = new URL("../src/studio-native-shell-v280.js", import.meta.url);
const cssFile = new URL("../src/studio-native-shell-v280.css", import.meta.url);
const v279File = new URL("../src/studio-live-shell-v279.js", import.meta.url);
const testFile = new URL("../tests/studio-native-shell-v280.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v280.json", import.meta.url);

const RELEASE = "studio-native-shell-v280-20260804";
const VERSION = "ngeblogging-app-v280-native-shell-20260804";
const CACHE = "studio-native-shell-cache-v280";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V280_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [entry, runtime, css, v279, tests, release] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(v279File, "utf8"),
  readFile(testFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  'import "./studio-native-shell-v280.js";',
  'import "./studio-native-shell-v280.css";',
]) if (!entry.includes(marker)) throw new Error(`V280_ENTRY_MISSING:${marker}`);

if (entry.indexOf('import "./studio-native-shell-v280.css";') <= entry.indexOf('import "./studio-live-shell-v279.css";')) {
  throw new Error("V280_IMPORT_ORDER_INVALID");
}

for (const marker of [
  RELEASE,
  "normalizeFixedRoot",
  "normalizeSidebar",
  "normalizeProfile",
  "normalizeNara",
  'window.addEventListener("ngeblogging:studio-device-mode-change", schedule)',
]) if (!runtime.includes(marker)) throw new Error(`V280_RUNTIME_MISSING:${marker}`);

if (/addEventListener\("scroll"/.test(runtime) || /visualViewport\?\.addEventListener\("scroll"/.test(runtime)) {
  throw new Error("V280_SCROLL_DOM_CHURN_REGRESSION");
}
if (/addEventListener\("scroll"/.test(v279) || /visualViewport\?\.addEventListener\("scroll"/.test(v279)) {
  throw new Error("V280_V279_SCROLL_CHURN_STILL_ACTIVE");
}

for (const marker of [
  'data-device-mode="small"',
  'data-device-mode="large"',
  '--v280-side-rail:72px',
  ".nara-floating-button",
  ".nara-attachment-menu",
  ".sn-avatar",
  ".sv124-free-domain",
  "body.sn-mobile-sidebar-open",
]) if (!css.includes(marker)) throw new Error(`V280_CSS_MISSING:${marker}`);

if (!tests.includes("v280 is the final shell layer and removes scroll-time DOM churn")) throw new Error("V280_REGRESSION_TEST_MISSING");
if (!release.includes(RELEASE) || !release.includes(CACHE)) throw new Error("V280_RELEASE_MANIFEST_INVALID");
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(runtime)) throw new Error("V280_DESTRUCTIVE_RUNTIME");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_NATIVE_SHELL_RELEASE_V280", `"${RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V280", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V280", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V280", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V280}-${ACTIVE_CACHE_RELEASE_V280}-${STUDIO_NATIVE_SHELL_RELEASE_V280}-${UI_CACHE_RELEASE_V280}-${STUDIO_LIVE_SHELL_RELEASE_V279}-${UI_CACHE_RELEASE_V279}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V280}-${ACTIVE_CACHE_RELEASE_V280}-${STUDIO_NATIVE_SHELL_RELEASE_V280}-${UI_CACHE_RELEASE_V280}-${STUDIO_LIVE_SHELL_RELEASE_V279}-${UI_CACHE_RELEASE_V279}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V279", "NGE_BLOGGING_UPDATE_AVAILABLE_V280")
  .replaceAll("service-worker-activated-live-shell-v279", "service-worker-activated-native-shell-v280");

if (!source.includes(RELEASE) || !source.includes(CACHE)) throw new Error("V280_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(source)) {
  throw new Error("V280_DESTRUCTIVE_SW_BEHAVIOR");
}

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated native shell cache to ${CACHE}`);

await import("./patch-service-worker-v281.mjs");
