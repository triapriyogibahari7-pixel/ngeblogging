import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/Studio.jsx", import.meta.url);
const runtimeFile = new URL("../src/studio-sidebar-recovery-v276.js", import.meta.url);
const cssFile = new URL("../src/studio-sidebar-recovery-v276.css", import.meta.url);

const RELEASE = "studio-sidebar-recovery-v276-20260804";
const VERSION = "ngeblogging-app-v276-sidebar-recovery-20260804";
const CACHE = "studio-sidebar-recovery-cache-v276";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  return source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
}

const [entry, runtime, css] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
]);

for (const marker of [
  'import "./studio-sidebar-recovery-v276.js";',
  'import "./studio-sidebar-recovery-v276.css";',
]) if (!entry.includes(marker)) throw new Error(`V276_ENTRY_MISSING:${marker}`);

for (const marker of [RELEASE, "studioShell?.dataset?.deviceMode", "resolvedLayoutMode", "normalizeSidebar"]) {
  if (!runtime.includes(marker)) throw new Error(`V276_RUNTIME_MISSING:${marker}`);
}
for (const marker of ['data-device-mode="large"', 'data-device-mode="small"', "translate3d(0,0,0)!important"]) {
  if (!css.includes(marker)) throw new Error(`V276_CSS_MISSING:${marker}`);
}

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_SIDEBAR_RECOVERY_RELEASE_V276", `"${RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V276", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V276", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V276", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V276}-${ACTIVE_CACHE_RELEASE_V276}-${STUDIO_SIDEBAR_RECOVERY_RELEASE_V276}-${UI_CACHE_RELEASE_V276}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V276}-${ACTIVE_CACHE_RELEASE_V276}-${STUDIO_SIDEBAR_RECOVERY_RELEASE_V276}-${UI_CACHE_RELEASE_V276}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V275", "NGE_BLOGGING_UPDATE_AVAILABLE_V276")
  .replaceAll("service-worker-activated-final-stability-v275", "service-worker-activated-sidebar-recovery-v276");

if (!source.includes(RELEASE) || !source.includes(CACHE)) throw new Error("V276_SW_MARKERS_MISSING");
await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);
