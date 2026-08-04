import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const studioFile = new URL("../src/Studio.jsx", import.meta.url);
const runtimeFile = new URL("../src/studio-final-authority-v269.js", import.meta.url);
const cssFile = new URL("../src/studio-final-authority-v269.css", import.meta.url);

const RELEASE = "studio-final-authority-v269-20260804";
const CACHE_RELEASE = "studio-final-authority-cache-v269";

function replaceOrInsert(source, name, expression) {
  const line = `const ${name} = ${expression};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const version = /^(const VERSION = .*;\n)/m;
  if (!version.test(source)) throw new Error(`V269_SW_VERSION_ANCHOR_MISSING:${name}`);
  return source.replace(version, `$1${line}\n`);
}

async function validateV269Authority() {
  const [studio, runtime, css] = await Promise.all([
    readFile(studioFile, "utf8"),
    readFile(runtimeFile, "utf8"),
    readFile(cssFile, "utf8"),
  ]);

  if (!studio.includes('import "./studio-final-authority-v269.js";')) {
    throw new Error("V269_LIVE_STUDIO_IMPORT_MISSING");
  }

  for (const marker of [
    'data.v269DesktopFamily',
    'viewportWidth() >= 760',
    'sn-mobile-sidebar-open',
    'studioFinalAuthorityV269',
  ]) {
    if (!runtime.includes(marker)) throw new Error(`V269_RUNTIME_MARKER_MISSING:${marker}`);
  }

  for (const marker of [
    'html[data-v269-desktop-family="true"] #ngeblogging-studio-sidebar',
    'html[data-v269-desktop-family="false"] #ngeblogging-studio-sidebar',
    '#ngeblogging-studio-sidebar.collapsed',
    '.nara-floating-button',
    ':has(>.nara-assistant-shell[data-nara-size="small"])',
    'grid-template-columns:repeat(3,minmax(0,1fr))!important',
    '.sn-home-grid>section>header',
    '.tn-code-workspace',
    '.sv124-domain-item>footer',
  ]) {
    if (!css.includes(marker)) throw new Error(`V269_CSS_MARKER_MISSING:${marker}`);
  }

  for (const source of [runtime, css]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
      throw new Error("V269_SESSION_DESTRUCTIVE_ACTION");
    }
  }
}

await validateV269Authority();

let source = await readFile(swFile, "utf8");
source = replaceOrInsert(source, "UI_PATCH_RELEASE_V269", `"${RELEASE}"`);
source = replaceOrInsert(source, "UI_CACHE_RELEASE_V269", `"${CACHE_RELEASE}"`);
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${UI_PATCH_RELEASE_V263}-${UI_PATCH_RELEASE_V265}-${UI_CACHE_RELEASE_V265}-${UI_PATCH_RELEASE_V267}-${UI_CACHE_RELEASE_V267}-${UI_PATCH_RELEASE_V268}-${UI_CACHE_RELEASE_V268}-${UI_PATCH_RELEASE_V269}-${UI_CACHE_RELEASE_V269}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${UI_PATCH_RELEASE_V263}-${UI_PATCH_RELEASE_V265}-${UI_CACHE_RELEASE_V265}-${UI_PATCH_RELEASE_V267}-${UI_CACHE_RELEASE_V267}-${UI_PATCH_RELEASE_V268}-${UI_CACHE_RELEASE_V268}-${UI_PATCH_RELEASE_V269}-${UI_CACHE_RELEASE_V269}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v269: never force a second navigation; the new asset namespace is picked up safely.");

for (const marker of [
  "UI_PATCH_RELEASE_V268",
  "UI_CACHE_RELEASE_V268",
  "UI_PATCH_RELEASE_V269",
  "UI_CACHE_RELEASE_V269",
  RELEASE,
  CACHE_RELEASE,
]) {
  if (!source.includes(marker)) throw new Error(`V269_SW_MARKER_MISSING:${marker}`);
}
if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V269_SW_DOUBLE_RELOAD_REGRESSION");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V269_SW_SESSION_DESTRUCTIVE_ACTION");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated service-worker assets to ${CACHE_RELEASE}`);
