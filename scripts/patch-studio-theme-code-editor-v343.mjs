import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/studio-theme-surface-final-v341.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-code-editor-v343.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-code-editor-v343.css", import.meta.url);
const releaseFile = new URL("../public/release-v343.json", import.meta.url);
const testFile = new URL("../tests/studio-theme-code-editor-v343.test.mjs", import.meta.url);

const RELEASE = "studio-theme-code-editor-v343-20260807";
const VERSION = "ngeblogging-app-v343-theme-code-editor-20260807";
const CACHE = "studio-theme-code-editor-cache-v343";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V343_SW_ANCHOR_MISSING:${name}`);
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
  'import "./studio-theme-code-editor-v342.js"',
  'import "./studio-theme-code-editor-v343.js"',
]) if (!entry.includes(marker)) throw new Error(`V343_ENTRY_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  'import "./studio-theme-code-editor-v343.css"',
  "studioThemeCodeEditorV343",
]) if (!runtime.includes(marker)) throw new Error(`V343_RUNTIME_MISSING:${marker}`);

for (const marker of [
  "--studio-theme-code-editor-v343",
  'data-v342-editor="ready"',
  'grid-template-areas:"preview" "code"!important',
  "height:clamp(460px,52dvh,590px)!important",
  'data-studio-handheld="true"',
  'data-studio-device-mode="small"',
  ".tn-code-gutter-v342",
  "width:56px!important",
  'textarea[data-v342-code-source="ready"]',
  "background:#0c1525!important",
]) if (!css.includes(marker)) throw new Error(`V343_CSS_MISSING:${marker}`);

if (/#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.nara-assistant|\.nara-floating-button|\.sv124-domain-page|\.ce-app/.test(css))
  throw new Error("V343_UNRELATED_SURFACE_CSS");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(|setInterval\s*\(|stopImmediatePropagation/.test(runtime))
  throw new Error("V343_DESTRUCTIVE_RUNTIME");

for (const marker of [
  RELEASE,
  '"inheritsV342Editor": true',
  '"previewAboveCodeAllStudioModes": true',
  '"desktopSiteOnHandheldUsesStackedEditor": true',
  '"shorterCodeWorkspace": true',
  '"darkReadableCodeSurface": true',
  '"realLineNumbers": 10000',
  '"themesPreserved": 100',
  '"layoutAreasPreserved": 26',
  '"widgetsPreserved": 26',
  '"previewModesPreserved": 8',
  '"sidebarUntouched": true',
  '"authSessionUntouched": true',
  '"naraUntouched": true',
  '"serviceWorkerCacheRotated": true',
  '"realDeviceCertificationClaimed": false',
]) if (!release.includes(marker)) throw new Error(`V343_RELEASE_INVALID:${marker}`);

if (!tests.includes("preview-above-code reference in every Studio family") || !tests.includes("visible synchronized 1-10000 gutter"))
  throw new Error("V343_TEST_MARKERS_MISSING");

let sw = await readFile(swFile, "utf8");
for (const inherited of [
  "STUDIO_THEME_CODE_EDITOR_RELEASE_V342",
  "STUDIO_THEME_SURFACE_FINAL_RELEASE_V341",
  "STUDIO_THEME_FINAL_RELEASE_V340",
  "STUDIO_NARA_NONMODAL_RELEASE_V313",
  "AUTH_SESSION_HANDOFF_RELEASE_V292",
]) if (!sw.includes(inherited)) throw new Error(`V343_SW_INHERITANCE_MISSING:${inherited}`);

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V342", "NGE_BLOGGING_UPDATE_AVAILABLE_V343")
  .replaceAll("service-worker-activated-theme-code-editor-v342", "service-worker-activated-theme-code-editor-v343");

sw = upsert(sw, "STUDIO_THEME_CODE_EDITOR_RELEASE_V343", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V343", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V343", "CACHE_RELEASE");

sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V343}-${ACTIVE_CACHE_RELEASE_V343}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V343}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V342}-${STUDIO_THEME_SURFACE_FINAL_RELEASE_V341}-${STUDIO_THEME_FINAL_RELEASE_V340}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V343}-${ACTIVE_CACHE_RELEASE_V343}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V343}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V342}-${STUDIO_THEME_SURFACE_FINAL_RELEASE_V341}-${STUDIO_THEME_FINAL_RELEASE_V340}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "ACTIVE_VERSION_V343", "ACTIVE_CACHE_RELEASE_V343"])
  if (!sw.includes(marker)) throw new Error(`V343_SW_MARKER_MISSING:${marker}`);
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(sw))
  throw new Error("V343_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE}: preview above shorter dark source editor, real v342 1-10000 gutter preserved, cache=${CACHE}.`);
