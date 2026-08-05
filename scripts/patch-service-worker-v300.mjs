import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const studioFile = new URL("../src/Studio.jsx", import.meta.url);
const runtimeFile = new URL("../src/studio-sidebar-direct-v300.js", import.meta.url);
const cssFile = new URL("../src/studio-sidebar-direct-v300.css", import.meta.url);
const contentFile = new URL("../src/lib/content-data.js", import.meta.url);
const releaseFile = new URL("../public/release-v300.json", import.meta.url);
const testFile = new URL("../tests/studio-sidebar-direct-v300.test.mjs", import.meta.url);

const RELEASE = "studio-sidebar-direct-v300-20260805";
const VERSION = "ngeblogging-app-v300-sidebar-direct-20260805";
const CACHE = "studio-sidebar-direct-cache-v300";
const V299_RELEASE = "studio-direct-shell-boot-v299-20260805";
const V298_RELEASE = "studio-shell-authority-v298-20260805";
const V292_AUTH = "auth-session-handoff-v292-20260805";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V300_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [studio, runtime, css, content, release, tests] = await Promise.all([
  readFile(studioFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(contentFile, "utf8"),
  readFile(releaseFile, "utf8"),
  readFile(testFile, "utf8"),
]);

for (const marker of [
  'import "./studio-sidebar-direct-v300.js"',
  'import "./studio-sidebar-direct-v300.css"',
]) if (!studio.includes(marker)) throw new Error(`V300_STUDIO_ENTRY_MISSING:${marker}`);
if (studio.indexOf('studio-sidebar-direct-v300.js') < studio.indexOf('studio-responsive-lock-v285.css')) throw new Error("V300_NOT_LAST_AFTER_LEGACY_CSS");

for (const marker of [RELEASE, "directToggle", "mark.addEventListener(\"click\", directToggle", "syncSidebarSurface", "reactToggle"])
  if (!runtime.includes(marker)) throw new Error(`V300_RUNTIME_MISSING:${marker}`);
for (const marker of ['.sn-shell[data-device-mode="small"]', "width:min(78vw,336px)!important", "--v300-open:220px", "--v300-rail:70px", '.nara-floating-button{position:fixed!important'])
  if (!css.includes(marker)) throw new Error(`V300_CSS_MISSING:${marker}`);
if (!content.includes("CONTENT_QUERY_TIMEOUT_MS = 12_000") || !content.includes("Promise.race")) throw new Error("V300_CONTENT_TIMEOUT_MISSING");
if (!release.includes(RELEASE) || !release.includes(CACHE) || !release.includes('"smallOpenDrawerComplete": true')) throw new Error("V300_RELEASE_INVALID");
if (!tests.includes("v300 makes the visible n a direct target")) throw new Error("V300_TEST_MISSING");

for (const sourceText of [runtime, content]) {
  if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(sourceText)) throw new Error("V300_RUNTIME_CHURN_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(sourceText)) throw new Error("V300_DESTRUCTIVE_RUNTIME");
}

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_SIDEBAR_DIRECT_RELEASE_V300", `"${RELEASE}"`);
source = upsert(source, "STUDIO_DIRECT_SHELL_COMPAT_RELEASE_V299", `"${V299_RELEASE}"`);
source = upsert(source, "STUDIO_SHELL_AUTHORITY_COMPAT_RELEASE_V300", `"${V298_RELEASE}"`);
source = upsert(source, "AUTH_SESSION_HANDOFF_COMPAT_RELEASE_V300", `"${V292_AUTH}"`);
source = upsert(source, "UI_CACHE_RELEASE_V300", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V300", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V300", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V300}-${ACTIVE_CACHE_RELEASE_V300}-${STUDIO_SIDEBAR_DIRECT_RELEASE_V300}-${STUDIO_DIRECT_SHELL_COMPAT_RELEASE_V299}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V300}-${ACTIVE_CACHE_RELEASE_V300}-${STUDIO_SIDEBAR_DIRECT_RELEASE_V300}-${STUDIO_DIRECT_SHELL_COMPAT_RELEASE_V299}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V299", "NGE_BLOGGING_UPDATE_AVAILABLE_V300")
  .replaceAll("service-worker-activated-direct-shell-boot-v299", "service-worker-activated-sidebar-direct-v300");

if (!source.includes(RELEASE) || !source.includes(CACHE) || !source.includes(VERSION)) throw new Error("V300_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
  throw new Error("V300_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);

await import("./patch-service-worker-v301.mjs");
