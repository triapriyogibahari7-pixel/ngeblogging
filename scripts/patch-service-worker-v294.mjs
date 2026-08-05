import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const deviceFile = new URL("../src/studio-device-mode-v140.js", import.meta.url);
const uiFile = new URL("../src/studio-final-authority-v293.js", import.meta.url);
const uiCssFile = new URL("../src/studio-final-authority-v293.css", import.meta.url);
const nativeFile = new URL("../src/studio-native-controls-v290.js", import.meta.url);
const authFile = new URL("../src/lib/supabase.js", import.meta.url);
const testFile = new URL("../tests/studio-native-controls-v290.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v294.json", import.meta.url);

const RELEASE = "studio-mobile-classifier-v294-20260805";
const VERSION = "ngeblogging-app-v294-mobile-classifier-20260805";
const CACHE = "studio-mobile-classifier-cache-v294";
const V293_RELEASE = "studio-final-authority-v293-20260805";
const V293_VERSION = "ngeblogging-app-v293-final-authority-20260805";
const V293_CACHE = "studio-final-authority-cache-v293";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V294_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [device, ui, uiCss, native, auth, tests, release] = await Promise.all([
  readFile(deviceFile, "utf8"),
  readFile(uiFile, "utf8"),
  readFile(uiCssFile, "utf8"),
  readFile(nativeFile, "utf8"),
  readFile(authFile, "utf8"),
  readFile(testFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  RELEASE,
  "explicitMobileBrowserSignal",
  "ensureViewportMeta();",
  "navigator.userAgentData?.mobile === false",
  "wideTouchDesktopSurface",
  "studioMobileClassifierV294",
]) if (!device.includes(marker)) throw new Error(`V294_DEVICE_MISSING:${marker}`);

if (!/const widenedLayout = !explicitMobileBrowser[\s\S]*DESKTOP_SITE_WIDTH_RATIO/.test(device))
  throw new Error("V294_TRANSIENT_LAYOUT_GUARD_MISSING");
if (!/const wideTouchDesktopSurface =[\s\S]*navigator\.userAgentData\?\.mobile === false/.test(device))
  throw new Error("V294_WIDE_TOUCH_STILL_UNSAFE");
if (!/if \(desktopSiteLock && explicitMobileBrowserSignal\(\)\) desktopSiteLock = false/.test(device))
  throw new Error("V294_LOCK_RELEASE_MISSING");

for (const marker of [V293_RELEASE, "CONTENT_WORD_LIMIT = 5_000", "CODE_LINE_LIMIT = 10_000", "syncNara", "syncCodeEditor"])
  if (!ui.includes(marker)) throw new Error(`V294_V293_UI_NOT_PRESERVED:${marker}`);
for (const marker of ["--v293-side-open:220px", "--v293-side-rail:70px", 'grid-template-areas:"code preview"', 'grid-template-areas:"preview" "code"', '.nara-floating-button{position:fixed!important'])
  if (!uiCss.includes(marker)) throw new Error(`V294_V293_CSS_NOT_PRESERVED:${marker}`);
if (!native.includes('studio-final-authority-v293.js')) throw new Error("V294_V293_ENTRY_NOT_PRESERVED");
for (const marker of ["persistSession: true", "autoRefreshToken: true", 'appUrl("/?auth=callback")'])
  if (!auth.includes(marker)) throw new Error(`V294_AUTH_NOT_PRESERVED:${marker}`);
if (!tests.includes("v294 mobile browsers cannot inherit the desktop rail from transient viewport width"))
  throw new Error("V294_REGRESSION_TEST_MISSING");
if (!release.includes(RELEASE) || !release.includes(CACHE)) throw new Error("V294_RELEASE_INVALID");
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(device))
  throw new Error("V294_DESTRUCTIVE_DEVICE_RUNTIME");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_MOBILE_CLASSIFIER_RELEASE_V294", `"${RELEASE}"`);
source = upsert(source, "STUDIO_FINAL_AUTHORITY_COMPAT_RELEASE_V293", `"${V293_RELEASE}"`);
source = upsert(source, "STUDIO_FINAL_AUTHORITY_COMPAT_VERSION_V293", `"${V293_VERSION}"`);
source = upsert(source, "STUDIO_FINAL_AUTHORITY_COMPAT_CACHE_V293", `"${V293_CACHE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V294", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V294", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V294", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V294}-${ACTIVE_CACHE_RELEASE_V294}-${STUDIO_MOBILE_CLASSIFIER_RELEASE_V294}-${STUDIO_FINAL_AUTHORITY_COMPAT_RELEASE_V293}-${STUDIO_FINAL_AUTHORITY_COMPAT_CACHE_V293}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V294}-${ACTIVE_CACHE_RELEASE_V294}-${STUDIO_MOBILE_CLASSIFIER_RELEASE_V294}-${STUDIO_FINAL_AUTHORITY_COMPAT_RELEASE_V293}-${STUDIO_FINAL_AUTHORITY_COMPAT_CACHE_V293}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V293", "NGE_BLOGGING_UPDATE_AVAILABLE_V294")
  .replaceAll("service-worker-activated-final-authority-v293", "service-worker-activated-mobile-classifier-v294");

if (!source.includes(RELEASE) || !source.includes(CACHE) || !source.includes(VERSION) || !source.includes(V293_RELEASE) || !source.includes(V293_VERSION) || !source.includes(V293_CACHE))
  throw new Error("V294_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
  throw new Error("V294_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);

// v295 is the screenshot-driven production recovery layered after the v294 classifier.
await import("./patch-service-worker-v295.mjs");
