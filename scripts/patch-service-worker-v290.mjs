import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const authFile = new URL("../src/auth-studio-handoff-v290.js", import.meta.url);
const runtimeFile = new URL("../src/studio-native-controls-v290.js", import.meta.url);
const cssFile = new URL("../src/studio-native-controls-v290.css", import.meta.url);
const testFile = new URL("../tests/studio-native-controls-v290.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v290.json", import.meta.url);

const RELEASE = "studio-native-controls-v290-20260805";
const AUTH_RELEASE = "auth-studio-handoff-v290-20260805";
const VERSION = "ngeblogging-app-v290-native-controls-20260805";
const CACHE = "studio-native-controls-cache-v290";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V290_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [auth, runtime, css, tests, release] = await Promise.all([
  readFile(authFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(testFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [AUTH_RELEASE, "/studio?auth=callback", "moveCallbackPathToStudio", "signInWithOAuth", "signInWithOtp"])
  if (!auth.includes(marker)) throw new Error(`V290_AUTH_MISSING:${marker}`);
for (const marker of [RELEASE, "immediateNativeToggle", "pointerdown", "syncNara", "syncContainment"])
  if (!runtime.includes(marker)) throw new Error(`V290_RUNTIME_MISSING:${marker}`);
for (const marker of ["body.sn-mobile-sidebar-open .sn-side-backdrop", "pointer-events:none!important", ".nara-floating-button{", "position:fixed!important", 'data-nara-interaction="nonmodal"'])
  if (!css.includes(marker)) throw new Error(`V290_CSS_MISSING:${marker}`);
if (!tests.includes("v290 sends OAuth, email links and registration callbacks straight to Studio")) throw new Error("V290_TEST_MISSING");
if (!release.includes(RELEASE) || !release.includes(AUTH_RELEASE) || !release.includes(CACHE)) throw new Error("V290_RELEASE_INVALID");
for (const source of [auth, runtime]) {
  if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(source)) throw new Error("V290_RUNTIME_CHURN_OR_BLOCKING_REGRESSION");
  if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source)) throw new Error("V290_DESTRUCTIVE_RUNTIME");
}

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_NATIVE_CONTROLS_RELEASE_V290", `"${RELEASE}"`);
source = upsert(source, "AUTH_STUDIO_HANDOFF_RELEASE_V290", `"${AUTH_RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V290", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V290", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V290", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V290}-${ACTIVE_CACHE_RELEASE_V290}-${STUDIO_NATIVE_CONTROLS_RELEASE_V290}-${UI_CACHE_RELEASE_V290}-${STUDIO_FINAL_PASS_RELEASE_V289}-${UI_CACHE_RELEASE_V289}-${AUTH_STUDIO_HANDOFF_RELEASE_V290}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V290}-${ACTIVE_CACHE_RELEASE_V290}-${STUDIO_NATIVE_CONTROLS_RELEASE_V290}-${UI_CACHE_RELEASE_V290}-${STUDIO_FINAL_PASS_RELEASE_V289}-${UI_CACHE_RELEASE_V289}-${AUTH_STUDIO_HANDOFF_RELEASE_V290}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V289", "NGE_BLOGGING_UPDATE_AVAILABLE_V290")
  .replaceAll("service-worker-activated-final-pass-v289", "service-worker-activated-native-controls-v290");

if (!source.includes(RELEASE) || !source.includes(AUTH_RELEASE) || !source.includes(CACHE) || !source.includes(VERSION)) throw new Error("V290_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source)) throw new Error("V290_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE}, ${AUTH_RELEASE} and rotated Studio cache to ${CACHE}`);
