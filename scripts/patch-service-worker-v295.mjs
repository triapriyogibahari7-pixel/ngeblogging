import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeFile = new URL("../src/studio-polish-v295.js", import.meta.url);
const cssFile = new URL("../src/studio-polish-v295.css", import.meta.url);
const nativeFile = new URL("../src/studio-native-controls-v290.js", import.meta.url);
const v298File = new URL("../src/studio-shell-authority-v298.js", import.meta.url);
const deviceFile = new URL("../src/studio-device-mode-v140.js", import.meta.url);
const authFile = new URL("../src/lib/supabase.js", import.meta.url);
const releaseFile = new URL("../public/release-v295.json", import.meta.url);

const RELEASE = "studio-polish-v295-20260805";
const VERSION = "ngeblogging-app-v295-production-recovery-20260805";
const CACHE = "studio-polish-cache-v295";
const V294_RELEASE = "studio-mobile-classifier-v294-20260805";
const V293_RELEASE = "studio-final-authority-v293-20260805";
const V292_AUTH = "auth-session-handoff-v292-20260805";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V295_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [runtime, css, native, v298, device, auth, release] = await Promise.all([
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(nativeFile, "utf8"),
  readFile(v298File, "utf8"),
  readFile(deviceFile, "utf8"),
  readFile(authFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  RELEASE,
  "studio-profile-menu-v295-20260805",
  "studio-nara-geometry-v295-20260805",
  "syncStudioPolishV295",
  "buildProfileMenu",
  "nara-attachment-menu-wrap>button",
  "data-profile-action",
]) if (!runtime.includes(marker)) throw new Error(`V295_SOURCE_MISSING:${marker}`);

for (const marker of [
  ".sn-profile-menu-v295",
  ".sn-side-backdrop,body.sn-mobile-sidebar-open .sn-side-backdrop",
  ".nara-floating-button{",
  ".nara-attachment-menu{",
  'grid-template-areas:"preview" "code"',
  'grid-template-areas:"code preview"',
]) if (!css.includes(marker)) throw new Error(`V295_CSS_MISSING:${marker}`);

if (!native.includes('import("./studio-shell-authority-v298.js")')) throw new Error("V295_V298_ENTRY_MISSING");
if (native.includes('import("./studio-polish-v295.js")')) throw new Error("V295_GLOBAL_NORMALIZER_REACTIVATED");
if (!v298.includes('import "./studio-polish-v295.css"')) throw new Error("V295_VISUAL_CSS_NOT_PRESERVED_BY_V298");
if (!device.includes(V294_RELEASE)) throw new Error("V295_V294_DEVICE_NOT_PRESERVED");
if (!auth.includes("persistSession: true") || !auth.includes("autoRefreshToken: true")) throw new Error("V295_AUTH_PERSISTENCE_NOT_PRESERVED");
if (!release.includes(RELEASE) || !release.includes(CACHE)) throw new Error("V295_RELEASE_INVALID");
if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(runtime)) throw new Error("V295_SOURCE_CHURN_REGRESSION");
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(runtime)) throw new Error("V295_DESTRUCTIVE_RUNTIME");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_POLISH_RELEASE_V295", `"${RELEASE}"`);
source = upsert(source, "STUDIO_MOBILE_CLASSIFIER_COMPAT_RELEASE_V294", `"${V294_RELEASE}"`);
source = upsert(source, "STUDIO_FINAL_AUTHORITY_COMPAT_RELEASE_V293", `"${V293_RELEASE}"`);
source = upsert(source, "AUTH_SESSION_HANDOFF_COMPAT_RELEASE_V292", `"${V292_AUTH}"`);
source = upsert(source, "UI_CACHE_RELEASE_V295", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V295", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V295", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V295}-${ACTIVE_CACHE_RELEASE_V295}-${STUDIO_POLISH_RELEASE_V295}-${STUDIO_MOBILE_CLASSIFIER_COMPAT_RELEASE_V294}-${STUDIO_FINAL_AUTHORITY_COMPAT_RELEASE_V293}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V295}-${ACTIVE_CACHE_RELEASE_V295}-${STUDIO_POLISH_RELEASE_V295}-${STUDIO_MOBILE_CLASSIFIER_COMPAT_RELEASE_V294}-${STUDIO_FINAL_AUTHORITY_COMPAT_RELEASE_V293}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V294", "NGE_BLOGGING_UPDATE_AVAILABLE_V295")
  .replaceAll("service-worker-activated-mobile-classifier-v294", "service-worker-activated-production-recovery-v295");

if (!source.includes(RELEASE) || !source.includes(CACHE) || !source.includes(VERSION) || !source.includes(V294_RELEASE) || !source.includes(V293_RELEASE) || !source.includes(V292_AUTH))
  throw new Error("V295_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
  throw new Error("V295_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} visual compatibility and rotated Studio cache to ${CACHE}`);

await import("./patch-service-worker-v296.mjs");
