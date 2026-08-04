import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/Studio.jsx", import.meta.url);
const runtimeFile = new URL("../src/studio-interaction-authority-v277.js", import.meta.url);
const cssFile = new URL("../src/studio-interaction-authority-v277.css", import.meta.url);
const bridgeFile = new URL("../src/studio-sidebar-single-toggle-v267.js", import.meta.url);

const RELEASE = "studio-interaction-authority-v277-20260804";
const VERSION = "ngeblogging-app-v277-interaction-authority-20260804";
const CACHE = "studio-interaction-authority-cache-v277";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  return source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
}

const [entry, runtime, css, bridge] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(bridgeFile, "utf8"),
]);

for (const marker of [
  'import "./studio-interaction-authority-v277.js";',
  'import "./studio-interaction-authority-v277.css";',
]) if (!entry.includes(marker)) throw new Error(`V277_ENTRY_MISSING:${marker}`);

for (const marker of [RELEASE, "MAX_CODE_LINES = 10000", "normalizeSidebarChrome", "normalizeProfile", "normalizeNara", "normalizeCodeEditors"]) {
  if (!runtime.includes(marker)) throw new Error(`V277_RUNTIME_MISSING:${marker}`);
}
for (const marker of ['data-device-mode="large"', 'data-device-mode="small"', ".nara-floating-button", ".v277-code-lines", 'grid-template-areas:"code preview"!important']) {
  if (!css.includes(marker)) throw new Error(`V277_CSS_MISSING:${marker}`);
}
if (/^import "\.\/studio-final-stability-v275\.js";/m.test(bridge)) throw new Error("V277_DUPLICATE_V275_RUNTIME_ACTIVE");
if (!bridge.includes("studio-final-stability-v275.js")) throw new Error("V277_V275_HISTORY_MARKER_MISSING");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_INTERACTION_AUTHORITY_RELEASE_V277", `"${RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V277", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V277", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V277", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V277}-${ACTIVE_CACHE_RELEASE_V277}-${STUDIO_INTERACTION_AUTHORITY_RELEASE_V277}-${UI_CACHE_RELEASE_V277}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V277}-${ACTIVE_CACHE_RELEASE_V277}-${STUDIO_INTERACTION_AUTHORITY_RELEASE_V277}-${UI_CACHE_RELEASE_V277}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V276", "NGE_BLOGGING_UPDATE_AVAILABLE_V277")
  .replaceAll("service-worker-activated-sidebar-recovery-v276", "service-worker-activated-interaction-authority-v277");

if (!source.includes(RELEASE) || !source.includes(CACHE)) throw new Error("V277_SW_MARKERS_MISSING");
if (/refreshStaleWindow|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/.test(source)) throw new Error("V277_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);
