import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const providerFile = new URL("../src/auth-provider-gateway-v250.js", import.meta.url);
const supabaseFile = new URL("../src/lib/supabase.js", import.meta.url);
const legacyShellFile = new URL("../src/studio-react-shell-v287.js", import.meta.url);
const nativeFile = new URL("../src/studio-native-controls-v290.js", import.meta.url);
const releaseFile = new URL("../public/release-v291.json", import.meta.url);

const RELEASE = "studio-auth-sidebar-v291-20260805";
const VERSION = "ngeblogging-app-v291-auth-sidebar-20260805";
const CACHE = "studio-auth-sidebar-cache-v291";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V291_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [provider, supabase, legacyShell, native, release] = await Promise.all([
  readFile(providerFile, "utf8"),
  readFile(supabaseFile, "utf8"),
  readFile(legacyShellFile, "utf8"),
  readFile(nativeFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

if (!provider.includes("auth-provider-navigation-v291-20260805")) throw new Error("V291_PROVIDER_RELEASE_MISSING");
if (provider.includes('import "./auth-studio-handoff-v290.js"')) throw new Error("V291_CALLBACK_MONKEY_PATCH_ACTIVE");
for (const marker of ['appUrl("/?auth=callback")', 'appUrl("/?auth=recovery")', "persistSession: true", "autoRefreshToken: true"])
  if (!supabase.includes(marker)) throw new Error(`V291_AUTH_MISSING:${marker}`);
if (!legacyShell.includes("Sidebar n ownership was retired in v291") || legacyShell.includes("const reactToggle"))
  throw new Error("V291_LEGACY_N_OWNER_NOT_RETIRED");
for (const marker of ["function nativeToggle(event)", 'document.addEventListener("click", nativeToggle, true)', "nativeToggleKeyboard", "v291SingleOwnerToggle"])
  if (!native.includes(marker)) throw new Error(`V291_NATIVE_OWNER_MISSING:${marker}`);
if (/pointerdown|immediateNativeToggle|toggle\.disabled\s*=\s*true|muteTimer/.test(native)) throw new Error("V291_DOUBLE_TOGGLE_REGRESSION");
if (!release.includes(RELEASE) || !release.includes(CACHE)) throw new Error("V291_RELEASE_INVALID");
for (const source of [provider, legacyShell, native]) {
  if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(source)) throw new Error("V291_RUNTIME_CHURN_OR_BLOCKING_REGRESSION");
  if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source)) throw new Error("V291_DESTRUCTIVE_RUNTIME");
}

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_AUTH_SIDEBAR_RELEASE_V291", `"${RELEASE}"`);
source = upsert(source, "UI_CACHE_RELEASE_V291", `"${CACHE}"`);
source = upsert(source, "ACTIVE_VERSION_V291", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V291", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V291}-${ACTIVE_CACHE_RELEASE_V291}-${STUDIO_AUTH_SIDEBAR_RELEASE_V291}-${UI_CACHE_RELEASE_V291}-${STUDIO_NATIVE_CONTROLS_RELEASE_V290}-${UI_CACHE_RELEASE_V290}-${STUDIO_FINAL_PASS_RELEASE_V289}-${UI_CACHE_RELEASE_V289}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V291}-${ACTIVE_CACHE_RELEASE_V291}-${STUDIO_AUTH_SIDEBAR_RELEASE_V291}-${UI_CACHE_RELEASE_V291}-${STUDIO_NATIVE_CONTROLS_RELEASE_V290}-${UI_CACHE_RELEASE_V290}-${STUDIO_FINAL_PASS_RELEASE_V289}-${UI_CACHE_RELEASE_V289}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V290", "NGE_BLOGGING_UPDATE_AVAILABLE_V291")
  .replaceAll("service-worker-activated-native-controls-v290", "service-worker-activated-auth-sidebar-v291");

if (!source.includes(RELEASE) || !source.includes(CACHE) || !source.includes(VERSION)) throw new Error("V291_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source)) throw new Error("V291_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated Studio cache to ${CACHE}`);
