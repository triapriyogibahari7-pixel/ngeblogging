import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const studioFile = new URL("../src/Studio.jsx", import.meta.url);
const runtimeFile = new URL("../src/studio-shell-authority-v272.js", import.meta.url);
const cssFile = new URL("../src/studio-shell-authority-v272.css", import.meta.url);
const testFile = new URL("../tests/studio-shell-authority-v272.test.mjs", import.meta.url);
const mainFile = new URL("../src/main.jsx", import.meta.url);

const RELEASE = "studio-shell-authority-v272-20260804";
const CACHE_RELEASE = "studio-shell-cache-v272";

function replaceOrInsert(source, name, expression) {
  const line = `const ${name} = ${expression};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const version = /^(const VERSION = .*;\n)/m;
  if (!version.test(source)) throw new Error(`V272_SW_VERSION_ANCHOR_MISSING:${name}`);
  return source.replace(version, `$1${line}\n`);
}

const [studio, runtime, css, tests, main] = await Promise.all([
  readFile(studioFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(testFile, "utf8"),
  readFile(mainFile, "utf8"),
]);

if (studio.indexOf('import "./studio-shell-authority-v272.js";') <= studio.indexOf('import "./studio-scroll-chrome-v270.css";')) {
  throw new Error("V272_LIVE_IMPORT_ORDER_INVALID");
}
for (const marker of [
  'dataset.v272DesktopFamily = String(large)',
  'dataset.studioDeviceMode === "small") return false',
  'dataset.v272InternalBridge = "true"',
  'studioShellAuthorityV272',
]) if (!runtime.includes(marker)) throw new Error(`V272_RUNTIME_MARKER_MISSING:${marker}`);

for (const marker of [
  'html[data-v272-desktop-family="true"] #ngeblogging-studio-sidebar',
  'html[data-v272-desktop-family="false"] #ngeblogging-studio-sidebar:not(.mobile-open)',
  '#ngeblogging-studio-sidebar:not(.mobile-open)>:not(.sn-logo)',
  '.nara-attachment-menu',
  'height:min(560px,68dvh)!important',
  'min-width:0!important',
]) if (!css.includes(marker)) throw new Error(`V272_CSS_MARKER_MISSING:${marker}`);

for (const marker of [
  'consumeAuthCallbackV162().then',
  'openVerifiedStudio(callback.session)',
  'event === "SIGNED_IN" || event === "TOKEN_REFRESHED"',
]) if (!main.includes(marker)) throw new Error(`V272_AUTH_SOURCE_MARKER_MISSING:${marker}`);

if (!tests.includes("one internal mobile n") || !tests.includes("auth callback is permanent source")) {
  throw new Error("V272_REGRESSION_TEST_MARKERS_MISSING");
}
for (const source of [runtime, css, main]) {
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(source)) {
    throw new Error("V272_SESSION_OR_RELOAD_DESTRUCTIVE_ACTION");
  }
}

let source = await readFile(swFile, "utf8");
source = replaceOrInsert(source, "UI_PATCH_RELEASE_V272", `"${RELEASE}"`);
source = replaceOrInsert(source, "UI_CACHE_RELEASE_V272", `"${CACHE_RELEASE}"`);
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${UI_PATCH_RELEASE_V263}-${UI_PATCH_RELEASE_V265}-${UI_CACHE_RELEASE_V265}-${UI_PATCH_RELEASE_V267}-${UI_CACHE_RELEASE_V267}-${UI_PATCH_RELEASE_V268}-${UI_CACHE_RELEASE_V268}-${UI_PATCH_RELEASE_V269}-${UI_CACHE_RELEASE_V269}-${UI_PATCH_RELEASE_V270}-${UI_CACHE_RELEASE_V270}-${UI_PATCH_RELEASE_V272}-${UI_CACHE_RELEASE_V272}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${UI_PATCH_RELEASE_V263}-${UI_PATCH_RELEASE_V265}-${UI_CACHE_RELEASE_V265}-${UI_PATCH_RELEASE_V267}-${UI_CACHE_RELEASE_V267}-${UI_PATCH_RELEASE_V268}-${UI_CACHE_RELEASE_V268}-${UI_PATCH_RELEASE_V269}-${UI_CACHE_RELEASE_V269}-${UI_PATCH_RELEASE_V270}-${UI_CACHE_RELEASE_V270}-${UI_PATCH_RELEASE_V272}-${UI_CACHE_RELEASE_V272}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v272: notify only; never force a second navigation or clear the authenticated session.");

for (const marker of ["UI_PATCH_RELEASE_V272","UI_CACHE_RELEASE_V272",RELEASE,CACHE_RELEASE]) {
  if (!source.includes(marker)) throw new Error(`V272_SW_MARKER_MISSING:${marker}`);
}
if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V272_SW_DOUBLE_RELOAD_REGRESSION");
await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated service-worker assets to ${CACHE_RELEASE}`);
