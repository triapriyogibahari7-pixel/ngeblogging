import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/Studio.jsx", import.meta.url);
const runtimeFile = new URL("../src/studio-shell-precision-v278.js", import.meta.url);
const cssFile = new URL("../src/studio-shell-precision-v278.css", import.meta.url);
const retiredFile = new URL("../src/studio-sidebar-recovery-v276.js", import.meta.url);
const testFile = new URL("../tests/studio-shell-precision-v278.test.mjs", import.meta.url);

const RELEASE = "studio-shell-precision-v278-20260804";
const VERSION = "ngeblogging-app-v278-shell-precision-20260804";
const CACHE = "studio-shell-precision-cache-v278";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  return source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
}

const [entry, runtime, css, retired, test] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(retiredFile, "utf8"),
  readFile(testFile, "utf8"),
]);

for (const marker of [
  'import "./studio-shell-precision-v278.js";',
  'import "./studio-shell-precision-v278.css";',
]) if (!entry.includes(marker)) throw new Error(`V278_ENTRY_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  'window.addEventListener("pointerdown", stopLegacyPointer, true)',
  'window.addEventListener("click", activateLogo, true)',
  'data-max-lines", "10000',
  "normalizeSidebar",
  "normalizeProfile",
  "normalizeNara",
]) if (!runtime.includes(marker)) throw new Error(`V278_RUNTIME_MISSING:${marker}`);

for (const marker of [
  'data-device-mode="large"',
  'data-device-mode="small"',
  ".nara-floating-button",
  '.nara-assistant-layer[data-nara-interaction="nonmodal"]',
  'grid-template-areas:"code preview"!important',
  'grid-template-areas:"preview" "code"!important',
  ".tn-layout-content-v264",
]) if (!css.includes(marker)) throw new Error(`V278_CSS_MISSING:${marker}`);

if (/document\.addEventListener\("click",\s*activateLogo/.test(retired)) throw new Error("V278_V276_CLICK_HANDLER_STILL_ACTIVE");
if (/new MutationObserver/.test(retired)) throw new Error("V278_V276_OBSERVER_STILL_ACTIVE");
if (!test.includes("studio-shell-precision-v278")) throw new Error("V278_REGRESSION_TEST_MISSING");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_SHELL_PRECISION_RELEASE_V278", `"${RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V278", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V278", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V278", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V278}-${ACTIVE_CACHE_RELEASE_V278}-${STUDIO_SHELL_PRECISION_RELEASE_V278}-${UI_CACHE_RELEASE_V278}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V278}-${ACTIVE_CACHE_RELEASE_V278}-${STUDIO_SHELL_PRECISION_RELEASE_V278}-${UI_CACHE_RELEASE_V278}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V277", "NGE_BLOGGING_UPDATE_AVAILABLE_V278")
  .replaceAll("service-worker-activated-interaction-authority-v277", "service-worker-activated-shell-precision-v278");

if (!source.includes(RELEASE) || !source.includes(CACHE)) throw new Error("V278_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(source)) {
  throw new Error("V278_DESTRUCTIVE_SW_BEHAVIOR");
}

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);

await import("./patch-service-worker-v279.mjs");
