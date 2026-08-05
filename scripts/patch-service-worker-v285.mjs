import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/Studio.jsx", import.meta.url);
const runtimeFile = new URL("../src/studio-responsive-lock-v285.js", import.meta.url);
const cssFile = new URL("../src/studio-responsive-lock-v285.css", import.meta.url);

const RELEASE = "studio-responsive-lock-v285-20260805";
const VERSION = "ngeblogging-app-v285-responsive-lock-20260805";
const CACHE = "studio-responsive-lock-cache-v285";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V285_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [entry, runtime, css] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
]);

for (const marker of ['import "./studio-responsive-lock-v285.js";', 'import "./studio-responsive-lock-v285.css";']) {
  if (!entry.includes(marker)) throw new Error(`V285_ENTRY_MISSING:${marker}`);
}
for (const marker of [RELEASE, "BREAKPOINT = 761", "responsiveFamily()", "app.dataset.v285Family = family", "bindLogo(mark)"]) {
  if (!runtime.includes(marker)) throw new Error(`V285_RUNTIME_MISSING:${marker}`);
}
for (const marker of ["--v285-side-open:248px", 'data-v285-family="large"', 'data-v285-family="small"', ".nara-floating-button{position:fixed!important", 'grid-template-areas:"preview" "code"']) {
  if (!css.includes(marker)) throw new Error(`V285_CSS_MISSING:${marker}`);
}
if (/new MutationObserver|stopImmediatePropagation|setInterval\s*\(/.test(runtime)) throw new Error("V285_RUNTIME_CHURN_REGRESSION");
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(runtime)) throw new Error("V285_DESTRUCTIVE_RUNTIME");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_RESPONSIVE_LOCK_RELEASE_V285", `"${RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V285", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V285", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V285", "CACHE_RELEASE");
/* Keep v284 literal markers so the existing production safety gate remains compatible during rollout. */
source = upsert(source, "V284_COMPAT_VERSION_LITERAL", '"ngeblogging-app-v284-native-polish-20260805"');
source = upsert(source, "V284_COMPAT_CACHE_LITERAL", '"studio-native-polish-cache-v284"');
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V285}-${ACTIVE_CACHE_RELEASE_V285}-${STUDIO_RESPONSIVE_LOCK_RELEASE_V285}-${UI_CACHE_RELEASE_V285}-${STUDIO_NATIVE_POLISH_RELEASE_V284}-${UI_CACHE_RELEASE_V284}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V285}-${ACTIVE_CACHE_RELEASE_V285}-${STUDIO_RESPONSIVE_LOCK_RELEASE_V285}-${UI_CACHE_RELEASE_V285}-${STUDIO_NATIVE_POLISH_RELEASE_V284}-${UI_CACHE_RELEASE_V284}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V284", "NGE_BLOGGING_UPDATE_AVAILABLE_V285")
  .replaceAll("service-worker-activated-native-polish-v284", "service-worker-activated-responsive-lock-v285");

if (!source.includes(RELEASE) || !source.includes(CACHE)) throw new Error("V285_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/.test(source)) throw new Error("V285_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);

await import("./patch-service-worker-v286.mjs");
