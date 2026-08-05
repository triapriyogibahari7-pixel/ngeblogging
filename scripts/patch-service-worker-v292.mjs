import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const startupFile = new URL("../src/studio-startup-v292.js", import.meta.url);
const gateFile = new URL("../src/StudioOnboardingGate.jsx", import.meta.url);
const fastGateFile = new URL("../src/StudioFastGate.jsx", import.meta.url);
const providerFile = new URL("../src/auth-provider-gateway-v250.js", import.meta.url);
const nativeFile = new URL("../src/studio-native-controls-v290.js", import.meta.url);
const testFile = new URL("../tests/studio-startup-v292.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v292.json", import.meta.url);

const RELEASE = "studio-startup-direct-data-v292-20260805";
const AUTH_RELEASE = "auth-session-handoff-v292-20260805";
const VERSION = "ngeblogging-app-v292-startup-direct-data-20260805";
const CACHE = "studio-startup-direct-data-cache-v292";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V292_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [startup, gate, fastGate, provider, native, tests, release] = await Promise.all([
  readFile(startupFile, "utf8"),
  readFile(gateFile, "utf8"),
  readFile(fastGateFile, "utf8"),
  readFile(providerFile, "utf8"),
  readFile(nativeFile, "utf8"),
  readFile(testFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [RELEASE, AUTH_RELEASE, "startup-membership-direct-first-v292-20260805", "listUserSitesStartupV292", "window.__ngebloggingVerifiedSession = verified"])
  if (!startup.includes(marker)) throw new Error(`V292_STARTUP_MISSING:${marker}`);
for (const marker of ["listUserSitesStartupV292", "STARTUP_DATA_TIMEOUT_MS = 11_000", "ngeblogging-active-site-snapshot-v292", "getVerifiedSession()"])
  if (!gate.includes(marker)) throw new Error(`V292_GATE_MISSING:${marker}`);
if (/getVerifiedSession\(\{\s*force:\s*true\s*\}\)/.test(gate)) throw new Error("V292_FORCED_SESSION_VERIFICATION_REGRESSION");
if (!fastGate.includes("studio-fast-entry-v292-20260805") || !fastGate.includes("ngeblogging-active-site-snapshot-v292")) throw new Error("V292_FAST_GATE_MISSING");
if (!provider.includes('import "./studio-startup-v292.js"')) throw new Error("V292_AUTH_HANDOFF_IMPORT_MISSING");
for (const marker of ["studio-auth-sidebar-v291-20260805", "function nativeToggle(event)", 'document.addEventListener("click", nativeToggle, true)', "nativeToggleKeyboard"])
  if (!native.includes(marker)) throw new Error(`V292_SIDEBAR_COMPAT_MISSING:${marker}`);
if (/pointerdown|immediateNativeToggle|toggle\.disabled\s*=\s*true|muteTimer/.test(native)) throw new Error("V292_DOUBLE_TOGGLE_REGRESSION");
if (!tests.includes("v292 startup gate does not force remote auth verification")) throw new Error("V292_TEST_MISSING");
if (!release.includes(RELEASE) || !release.includes(CACHE)) throw new Error("V292_RELEASE_INVALID");
for (const source of [startup, gate, provider, native]) {
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source)) throw new Error("V292_DESTRUCTIVE_RUNTIME");
}

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292", `"${RELEASE}"`);
source = upsert(source, "AUTH_SESSION_HANDOFF_RELEASE_V292", `"${AUTH_RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V292", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V292", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V292", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V292}-${ACTIVE_CACHE_RELEASE_V292}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${UI_CACHE_RELEASE_V292}-${STUDIO_AUTH_SIDEBAR_RELEASE_V291}-${UI_CACHE_RELEASE_V291}-${STUDIO_NATIVE_CONTROLS_RELEASE_V290}-${UI_CACHE_RELEASE_V290}-${STUDIO_FINAL_PASS_RELEASE_V289}-${UI_CACHE_RELEASE_V289}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V292}-${ACTIVE_CACHE_RELEASE_V292}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${UI_CACHE_RELEASE_V292}-${STUDIO_AUTH_SIDEBAR_RELEASE_V291}-${UI_CACHE_RELEASE_V291}-${STUDIO_NATIVE_CONTROLS_RELEASE_V290}-${UI_CACHE_RELEASE_V290}-${STUDIO_FINAL_PASS_RELEASE_V289}-${UI_CACHE_RELEASE_V289}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V291", "NGE_BLOGGING_UPDATE_AVAILABLE_V292")
  .replaceAll("service-worker-activated-auth-sidebar-v291", "service-worker-activated-startup-direct-data-v292");

if (!source.includes(RELEASE) || !source.includes(CACHE) || !source.includes(VERSION)) throw new Error("V292_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source)) throw new Error("V292_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);

await import("./patch-service-worker-v293.mjs");
