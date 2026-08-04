import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const studioFile = new URL("../src/Studio.jsx", import.meta.url);
const runtimeFile = new URL("../src/studio-scroll-chrome-v270.js", import.meta.url);
const cssFile = new URL("../src/studio-scroll-chrome-v270.css", import.meta.url);
const testFile = new URL("../tests/studio-scroll-chrome-v270.test.mjs", import.meta.url);

const RELEASE = "studio-scroll-chrome-v270-20260804";
const CACHE_RELEASE = "studio-scroll-chrome-cache-v270";

function replaceOrInsert(source, name, expression) {
  const line = `const ${name} = ${expression};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const version = /^(const VERSION = .*;\n)/m;
  if (!version.test(source)) throw new Error(`V270_SW_VERSION_ANCHOR_MISSING:${name}`);
  return source.replace(version, `$1${line}\n`);
}

async function validateV270Authority() {
  const [studio, runtime, css, tests] = await Promise.all([
    readFile(studioFile, "utf8"),
    readFile(runtimeFile, "utf8"),
    readFile(cssFile, "utf8"),
    readFile(testFile, "utf8"),
  ]);

  const v269 = studio.indexOf('import "./studio-final-authority-v269.js";');
  const v270js = studio.indexOf('import "./studio-scroll-chrome-v270.js";');
  const v270css = studio.indexOf('import "./studio-scroll-chrome-v270.css";');
  if (v269 < 0 || v270js <= v269 || v270css <= v270js) {
    throw new Error("V270_LIVE_IMPORT_ORDER_INVALID");
  }

  for (const marker of [
    'window.addEventListener("scroll", schedule',
    'visualViewport?.addEventListener("scroll", schedule',
    'launcher.dataset.scrollChromeV270 = "viewport-fixed"',
    'layer.dataset.v270Interaction = full ? "modal" : "nonmodal"',
    'button.dataset.v270Visible = "true"',
  ]) {
    if (!runtime.includes(marker)) throw new Error(`V270_RUNTIME_MARKER_MISSING:${marker}`);
  }

  for (const marker of [
    '--v270-drawer:clamp(248px,74vw,320px)',
    'html[data-v269-desktop-family="false"] .sn-top>.sn-sidebar-toggle',
    'position:fixed!important',
    '#ngeblogging-studio-sidebar.collapsed :is(.sn-new,nav>button,.sn-account-footer>button)>svg',
    '.studio-external-sidebar-toggle',
    'background:transparent!important',
    '.nara-floating-button',
    'data-v270-interaction="nonmodal"',
    'grid-template-columns:repeat(3,minmax(0,1fr))!important',
  ]) {
    if (!css.includes(marker)) throw new Error(`V270_CSS_MARKER_MISSING:${marker}`);
  }

  if (!tests.includes('mobile n is fixed to the viewport')
    || !tests.includes('desktop collapsed rail keeps all buttons')
    || !tests.includes('Nara launcher is viewport fixed')) {
    throw new Error("V270_REGRESSION_TEST_MARKERS_MISSING");
  }

  for (const source of [runtime, css]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.reload\s*\(/.test(source)) {
      throw new Error("V270_SESSION_OR_RELOAD_DESTRUCTIVE_ACTION");
    }
  }
}

await validateV270Authority();

let source = await readFile(swFile, "utf8");
source = replaceOrInsert(source, "UI_PATCH_RELEASE_V270", `"${RELEASE}"`);
source = replaceOrInsert(source, "UI_CACHE_RELEASE_V270", `"${CACHE_RELEASE}"`);
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${UI_PATCH_RELEASE_V263}-${UI_PATCH_RELEASE_V265}-${UI_CACHE_RELEASE_V265}-${UI_PATCH_RELEASE_V267}-${UI_CACHE_RELEASE_V267}-${UI_PATCH_RELEASE_V268}-${UI_CACHE_RELEASE_V268}-${UI_PATCH_RELEASE_V269}-${UI_CACHE_RELEASE_V269}-${UI_PATCH_RELEASE_V270}-${UI_CACHE_RELEASE_V270}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${UI_PATCH_RELEASE_V263}-${UI_PATCH_RELEASE_V265}-${UI_CACHE_RELEASE_V265}-${UI_PATCH_RELEASE_V267}-${UI_CACHE_RELEASE_V267}-${UI_PATCH_RELEASE_V268}-${UI_CACHE_RELEASE_V268}-${UI_PATCH_RELEASE_V269}-${UI_CACHE_RELEASE_V269}-${UI_PATCH_RELEASE_V270}-${UI_CACHE_RELEASE_V270}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v270: notify only; never force a second navigation or clear the authenticated session.");

for (const marker of [
  "UI_PATCH_RELEASE_V269",
  "UI_CACHE_RELEASE_V269",
  "UI_PATCH_RELEASE_V270",
  "UI_CACHE_RELEASE_V270",
  RELEASE,
  CACHE_RELEASE,
]) {
  if (!source.includes(marker)) throw new Error(`V270_SW_MARKER_MISSING:${marker}`);
}
if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V270_SW_DOUBLE_RELOAD_REGRESSION");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V270_SW_SESSION_DESTRUCTIVE_ACTION");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated service-worker assets to ${CACHE_RELEASE}`);
await import("./patch-service-worker-v272.mjs");
