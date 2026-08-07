import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/studio-theme-surface-final-v341.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-code-editor-v344.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-code-editor-v344.css", import.meta.url);
const releaseFile = new URL("../public/release-v344.json", import.meta.url);
const testFile = new URL("../tests/studio-theme-code-editor-v344.test.mjs", import.meta.url);

const RELEASE = "studio-theme-code-editor-v344-20260807";
const VERSION = "ngeblogging-app-v344-theme-code-editor-20260807";
const CACHE = "studio-theme-code-editor-cache-v344";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V344_SW_ANCHOR_MISSING:${name}`);
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
  'import "./studio-theme-code-editor-v343.js"',
  'import "./studio-theme-code-editor-v344.js"',
]) if (!entry.includes(marker)) throw new Error(`V344_ENTRY_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  'import "./studio-theme-code-editor-v344.css"',
  "studioThemeCodeEditorV344",
]) if (!runtime.includes(marker)) throw new Error(`V344_RUNTIME_MISSING:${marker}`);

for (const marker of [
  "--studio-theme-code-editor-v344",
  'grid-template-areas:"preview" "code"!important',
  "height:clamp(400px,45dvh,500px)!important",
  "height:clamp(340px,41dvh,420px)!important",
  ".tn-code-gutter-v342",
  "width:60px!important",
  "color:#aebcd0!important",
  "z-index:2!important",
  'textarea[data-v342-code-source="ready"]',
]) if (!css.includes(marker)) throw new Error(`V344_CSS_MISSING:${marker}`);

if (/#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.nara-assistant|\.nara-floating-button|\.sv124-domain-page|\.ce-app/.test(css))
  throw new Error("V344_UNRELATED_SURFACE_CSS");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(|setInterval\s*\(|stopImmediatePropagation/.test(runtime))
  throw new Error("V344_DESTRUCTIVE_RUNTIME");

for (const marker of [
  RELEASE,
  '"inheritsV342Editor": true',
  '"inheritsV343StackedComposition": true',
  '"shorterCodeWorkspace": true',
  '"desktopCodeHeightMaxPx": 500',
  '"handheldCodeHeightMaxPx": 420',
  '"realLineNumbers": 10000',
  '"lineNumberGutterStrengthened": true',
  '"themesPreserved": 100',
  '"layoutAreasPreserved": 26',
  '"widgetsPreserved": 26',
  '"previewModesPreserved": 8',
  '"sidebarUntouched": true',
  '"authSessionUntouched": true',
  '"naraUntouched": true',
  '"serviceWorkerCacheRotated": true',
  '"realDeviceCertificationClaimed": false',
]) if (!release.includes(marker)) throw new Error(`V344_RELEASE_INVALID:${marker}`);

if (!tests.includes("only tightens Theme code editor geometry") || !tests.includes("real v342 1-10000 gutter"))
  throw new Error("V344_TEST_MARKERS_MISSING");

let sw = await readFile(swFile, "utf8");
for (const inherited of [
  "STUDIO_THEME_CODE_EDITOR_RELEASE_V343",
  "STUDIO_THEME_CODE_EDITOR_RELEASE_V342",
  "STUDIO_THEME_SURFACE_FINAL_RELEASE_V341",
  "STUDIO_THEME_FINAL_RELEASE_V340",
  "AUTH_SESSION_HANDOFF_RELEASE_V292",
]) if (!sw.includes(inherited)) throw new Error(`V344_SW_INHERITANCE_MISSING:${inherited}`);

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V343", "NGE_BLOGGING_UPDATE_AVAILABLE_V344")
  .replaceAll("service-worker-activated-theme-code-editor-v343", "service-worker-activated-theme-code-editor-v344");

sw = upsert(sw, "STUDIO_THEME_CODE_EDITOR_RELEASE_V344", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V344", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V344", "CACHE_RELEASE");

sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V344}-${ACTIVE_CACHE_RELEASE_V344}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V344}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V343}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V342}-${STUDIO_THEME_SURFACE_FINAL_RELEASE_V341}-${STUDIO_THEME_FINAL_RELEASE_V340}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V344}-${ACTIVE_CACHE_RELEASE_V344}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V344}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V343}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V342}-${STUDIO_THEME_SURFACE_FINAL_RELEASE_V341}-${STUDIO_THEME_FINAL_RELEASE_V340}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "ACTIVE_VERSION_V344", "ACTIVE_CACHE_RELEASE_V344"])
  if (!sw.includes(marker)) throw new Error(`V344_SW_MARKER_MISSING:${marker}`);
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(sw))
  throw new Error("V344_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE}: shorter Theme code editor, stronger real 1-10000 gutter, cache=${CACHE}.`);
await import("./patch-studio-site-switcher-surface-v345.mjs");
