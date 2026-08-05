import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeFile = new URL("../src/studio-sidebar-hard-lock-v301.js", import.meta.url);
const cssFile = new URL("../src/studio-sidebar-hard-lock-v301.css", import.meta.url);
const entryFile = new URL("../src/studio-sidebar-direct-v300.js", import.meta.url);
const releaseFile = new URL("../public/release-v301.json", import.meta.url);
const testFile = new URL("../tests/studio-sidebar-hard-lock-v301.test.mjs", import.meta.url);

const RELEASE = "studio-sidebar-hard-lock-v301-20260805";
const VERSION = "ngeblogging-app-v301-sidebar-hard-lock-20260805";
const CACHE = "studio-sidebar-hard-lock-cache-v301";
const V300_RELEASE = "studio-sidebar-direct-v300-20260805";
const V299_RELEASE = "studio-direct-shell-boot-v299-20260805";
const V292_AUTH = "auth-session-handoff-v292-20260805";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V301_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [runtime, css, entry, release, tests] = await Promise.all([
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(entryFile, "utf8"),
  readFile(releaseFile, "utf8"),
  readFile(testFile, "utf8"),
]);

for (const marker of [
  RELEASE,
  "STUDIO_SIDEBAR_GEOMETRY_OWNER_V301",
  "physicalShortSide() <= 760",
  'important(content, "margin-left", "0")',
  'important(content, "width", "100%")',
  'important(side, "width", "min(78vw, 336px)")',
  'collapsed ? "70px" : "220px"',
]) if (!runtime.includes(marker)) throw new Error(`V301_RUNTIME_MISSING:${marker}`);

for (const marker of [
  '--v301-open:220px',
  '--v301-rail:70px',
  'data-studio-responsive-mode="phone"',
  'data-studio-responsive-mode="mobile"',
  '#ngeblogging-studio-sidebar.mobile-open',
  '.nara-floating-button{position:fixed!important',
]) if (!css.includes(marker)) throw new Error(`V301_CSS_MISSING:${marker}`);

if (!entry.includes('import("./studio-sidebar-hard-lock-v301.js")')) throw new Error("V301_ENTRY_CHAIN_MISSING");
if (!release.includes(RELEASE) || !release.includes(CACHE) || !release.includes('"mobileBlankLeftRailRemoved": true')) throw new Error("V301_RELEASE_INVALID");
if (!tests.includes("v301 hard-locks the physical mobile shell")) throw new Error("V301_TEST_MISSING");

for (const sourceText of [runtime, entry]) {
  if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(sourceText)) throw new Error("V301_RUNTIME_CHURN_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(sourceText)) throw new Error("V301_DESTRUCTIVE_RUNTIME");
}

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_SIDEBAR_HARD_LOCK_RELEASE_V301", `"${RELEASE}"`);
source = upsert(source, "STUDIO_SIDEBAR_DIRECT_COMPAT_RELEASE_V301", `"${V300_RELEASE}"`);
source = upsert(source, "STUDIO_DIRECT_SHELL_COMPAT_RELEASE_V301", `"${V299_RELEASE}"`);
source = upsert(source, "AUTH_SESSION_HANDOFF_COMPAT_RELEASE_V301", `"${V292_AUTH}"`);
source = upsert(source, "UI_CACHE_RELEASE_V301", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V301", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V301", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V301}-${ACTIVE_CACHE_RELEASE_V301}-${STUDIO_SIDEBAR_HARD_LOCK_RELEASE_V301}-${STUDIO_SIDEBAR_DIRECT_COMPAT_RELEASE_V301}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V301}-${ACTIVE_CACHE_RELEASE_V301}-${STUDIO_SIDEBAR_HARD_LOCK_RELEASE_V301}-${STUDIO_SIDEBAR_DIRECT_COMPAT_RELEASE_V301}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V300", "NGE_BLOGGING_UPDATE_AVAILABLE_V301")
  .replaceAll("service-worker-activated-sidebar-direct-v300", "service-worker-activated-sidebar-hard-lock-v301");

if (!source.includes(RELEASE) || !source.includes(CACHE) || !source.includes(VERSION)) throw new Error("V301_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
  throw new Error("V301_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);
