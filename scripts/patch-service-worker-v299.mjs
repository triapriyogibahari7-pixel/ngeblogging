import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/studio-native-controls-v281.js", import.meta.url);
const runtimeFile = new URL("../src/studio-shell-authority-v298.js", import.meta.url);
const cssFile = new URL("../src/studio-shell-authority-v298.css", import.meta.url);
const releaseFile = new URL("../public/release-v299.json", import.meta.url);
const testFile = new URL("../tests/studio-direct-shell-v299.test.mjs", import.meta.url);

const RELEASE = "studio-direct-shell-boot-v299-20260805";
const VERSION = "ngeblogging-app-v299-direct-shell-boot-20260805";
const CACHE = "studio-direct-shell-cache-v299";
const V298_RELEASE = "studio-shell-authority-v298-20260805";
const V292_AUTH = "auth-session-handoff-v292-20260805";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V299_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [entry, runtime, css, release, tests] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(releaseFile, "utf8"),
  readFile(testFile, "utf8"),
]);

for (const marker of [
  'import "./studio-shell-authority-v298.js"',
  RELEASE,
]) if (!entry.includes(marker)) throw new Error(`V299_ENTRY_MISSING:${marker}`);

for (const marker of [
  V298_RELEASE,
  "studio-single-n-owner-v298-20260805",
  "function toggleN(event)",
  "normalizeNaraState",
]) if (!runtime.includes(marker)) throw new Error(`V299_RUNTIME_COMPAT_MISSING:${marker}`);

for (const marker of [
  '.sn-shell[data-device-mode="small"]',
  '.sn-shell[data-device-mode="large"]',
  "width:min(78vw,336px)!important",
  "--v298-side-open:220px",
  "--v298-side-rail:70px",
]) if (!css.includes(marker)) throw new Error(`V299_CSS_MISSING:${marker}`);

if (!release.includes(RELEASE) || !release.includes(CACHE)) throw new Error("V299_RELEASE_INVALID");
if (!tests.includes("boots the v298 shell directly")) throw new Error("V299_TEST_MISSING");

for (const sourceText of [entry, runtime]) {
  if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(sourceText)) throw new Error("V299_RUNTIME_CHURN_REGRESSION");
  if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(sourceText)) throw new Error("V299_DESTRUCTIVE_RUNTIME");
}

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_DIRECT_SHELL_BOOT_RELEASE_V299", `"${RELEASE}"`);
source = upsert(source, "STUDIO_SHELL_AUTHORITY_COMPAT_RELEASE_V298", `"${V298_RELEASE}"`);
source = upsert(source, "AUTH_SESSION_HANDOFF_COMPAT_RELEASE_V299", `"${V292_AUTH}"`);
source = upsert(source, "UI_CACHE_RELEASE_V299", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V299", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V299", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V299}-${ACTIVE_CACHE_RELEASE_V299}-${STUDIO_DIRECT_SHELL_BOOT_RELEASE_V299}-${STUDIO_SHELL_AUTHORITY_COMPAT_RELEASE_V298}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V299}-${ACTIVE_CACHE_RELEASE_V299}-${STUDIO_DIRECT_SHELL_BOOT_RELEASE_V299}-${STUDIO_SHELL_AUTHORITY_COMPAT_RELEASE_V298}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V298", "NGE_BLOGGING_UPDATE_AVAILABLE_V299")
  .replaceAll("service-worker-activated-shell-authority-v298", "service-worker-activated-direct-shell-boot-v299");

if (!source.includes(RELEASE) || !source.includes(CACHE) || !source.includes(VERSION)) throw new Error("V299_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
  throw new Error("V299_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);
