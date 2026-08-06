import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const fastGateFile = new URL("../src/StudioFastGate.jsx", import.meta.url);
const onboardingFile = new URL("../src/StudioOnboardingGate.jsx", import.meta.url);
const stabilityCssFile = new URL("../src/studio-first-site-stability-v311.css", import.meta.url);
const editorRuntimeFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const editorCssFile = new URL("../src/studio-content-editor-desktop-site-v310.css", import.meta.url);
const testFile = new URL("../tests/studio-first-site-stability-v311.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v311.json", import.meta.url);

const RELEASE = "first-site-onboarding-stability-v311-20260806";
const FAST_ENTRY_RELEASE = "studio-fast-entry-v311-20260806";
const VERSION = "ngeblogging-app-v311-first-site-stability-20260806";
const CACHE = "studio-first-site-stability-cache-v311";
const V310_VERSION_COMPAT = "ngeblogging-app-v310-content-editor-20260806";
const V310_CACHE_COMPAT = "studio-content-editor-cache-v310";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V311_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [fastGate, onboarding, stabilityCss, editorRuntime, editorCss, tests, release] = await Promise.all([
  readFile(fastGateFile, "utf8"),
  readFile(onboardingFile, "utf8"),
  readFile(stabilityCssFile, "utf8"),
  readFile(editorRuntimeFile, "utf8"),
  readFile(editorCssFile, "utf8"),
  readFile(testFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  FAST_ENTRY_RELEASE,
  "siteBelongsToUser",
  "snapshotForUser",
  "value.__userId === userId",
]) if (!fastGate.includes(marker)) throw new Error(`V311_FAST_GATE_MISSING:${marker}`);
if (/if \(document\.documentElement\.dataset\.activeSiteId\) return true|if \(localStorage\.getItem\(ACTIVE_SITE_STORAGE_KEY\)\) return true/.test(fastGate))
  throw new Error("V311_FAST_GATE_UNSCOPED_SITE_REGRESSION");

for (const marker of [
  RELEASE,
  'import "./studio-first-site-stability-v311.css"',
  "FIRST_SITE_DRAFT_PREFIX_V311",
  "CREATE_RECOVERY_DELAY_MS = 12_000",
  "CREATE_RECOVERY_WINDOW_MS = 100_000",
  "findOwnedSiteBySlug",
  "reconcileCreatedSite",
  "new AbortController()",
  "First-site v311 preference configuration deferred",
  "firstSiteRequiredRef.current && site.__userId !== props.user?.id",
  "data-stability-release={FIRST_SITE_STABILITY_RELEASE_V311}",
]) if (!onboarding.includes(marker)) throw new Error(`V311_ONBOARDING_MISSING:${marker}`);
if (/withDeadline\(createUserSiteWithPolicy\(/.test(onboarding))
  throw new Error("V311_OLD_CREATE_TIMEOUT_REGRESSION");

for (const marker of [
  "backdrop-filter:none!important",
  "filter:none!important",
  "opacity:1!important",
  "transform:none!important",
  "animation:none!important",
  ".so169-shell .so75-creating-status",
]) if (!stabilityCss.includes(marker)) throw new Error(`V311_STABILITY_CSS_MISSING:${marker}`);
if (/\.sn-side|#ngeblogging-studio-sidebar|\.nara-assistant|\.ce-editor-side-v266/.test(stabilityCss))
  throw new Error("V311_SIDEBAR_OR_NARA_SCOPE_REGRESSION");

for (const marker of [
  "studio-content-editor-desktop-site-v310.css",
  "studio-content-editor-desktop-site-v310-20260806",
]) if (!editorRuntime.includes(marker)) throw new Error(`V311_V310_EDITOR_RUNTIME_MISSING:${marker}`);
for (const marker of [
  "@media (min-width:820px) and (max-width:1080px)",
  "grid-template-columns:minmax(0,1fr) clamp(260px,29vw,300px)",
  "html.editor-v266-small .ce-actions>button",
]) if (!editorCss.includes(marker)) throw new Error(`V311_V310_EDITOR_CSS_MISSING:${marker}`);
if (/#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark/.test(editorCss))
  throw new Error("V311_V310_EDITOR_SIDEBAR_REGRESSION");

for (const marker of [
  "v311 fast entry never trusts an unscoped active-site id",
  "v311 first-site creation remains stable, recoverable and duplicate-safe",
  "v311 preserves the already-promoted shared Posts and Pages v310 editor",
]) if (!tests.includes(marker)) throw new Error(`V311_TEST_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  '"accountScopedFastEntry": true',
  '"firstSitePhaseSticky": true',
  '"draftPreservedDuringCreation": true',
  '"slowCreateRecovery": true',
  '"preferenceFailureNonFatal": true',
  '"onboardingBlurRemoved": true',
  '"postsPagesV310Preserved": true',
  '"sidebarUntouched": true',
  '"serviceWorkerCacheRotated": true',
  '"massiveCapacityClaimed": false',
]) if (!release.includes(marker)) throw new Error(`V311_RELEASE_INVALID:${marker}`);

for (const sourceText of [fastGate, onboarding]) {
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(sourceText))
    throw new Error("V311_DESTRUCTIVE_SESSION_OR_NAVIGATION_REGRESSION");
}

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V310", "NGE_BLOGGING_UPDATE_AVAILABLE_V311")
  .replaceAll("service-worker-activated-content-editor-v310", "service-worker-activated-first-site-stability-v311");
source = upsert(source, "STUDIO_FIRST_SITE_STABILITY_RELEASE_V311", `"${RELEASE}"`);
source = upsert(source, "STUDIO_FAST_ENTRY_RELEASE_V311", `"${FAST_ENTRY_RELEASE}"`);
source = upsert(source, "STUDIO_CONTENT_EDITOR_VERSION_COMPAT_V310", `"${V310_VERSION_COMPAT}"`);
source = upsert(source, "STUDIO_CONTENT_EDITOR_CACHE_COMPAT_V310", `"${V310_CACHE_COMPAT}"`);
source = upsert(source, "ACTIVE_VERSION_V311", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V311", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V311}-${ACTIVE_CACHE_RELEASE_V311}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_FAST_ENTRY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V311}-${ACTIVE_CACHE_RELEASE_V311}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_FAST_ENTRY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [
  RELEASE, FAST_ENTRY_RELEASE, VERSION, CACHE,
  V310_VERSION_COMPAT, V310_CACHE_COMPAT,
  "STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310",
  "STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305",
  "AUTH_SESSION_HANDOFF_RELEASE_V292",
]) if (!source.includes(marker)) throw new Error(`V311_SW_MARKER_MISSING:${marker}`);
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
  throw new Error("V311_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);
await import("../tests/studio-first-site-stability-v311.test.mjs");
