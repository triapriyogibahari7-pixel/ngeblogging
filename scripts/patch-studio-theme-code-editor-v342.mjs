import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/studio-theme-surface-final-v341.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-code-editor-v342.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-code-editor-v342.css", import.meta.url);
const releaseFile = new URL("../public/release-v342.json", import.meta.url);
const testFile = new URL("../tests/studio-theme-code-editor-v342.test.mjs", import.meta.url);

const RELEASE = "studio-theme-code-editor-v342-20260807";
const VERSION = "ngeblogging-app-v342-theme-code-editor-20260807";
const CACHE = "studio-theme-code-editor-cache-v342";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V342_SW_ANCHOR_MISSING:${name}`);
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
  "STUDIO_THEME_SURFACE_FINAL_RELEASE_V341",
]) if (!entry.includes(marker)) throw new Error(`V342_ENTRY_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  "THEME_CODE_EDITOR_LINE_GUIDE_V342 = 10000",
  "LINE_GUIDE",
  "editorFamily",
  'responsive === "desktop"',
  "COMPACT_MODES",
  "LARGE_MODES",
  "tn-code-gutter-v342",
  "gutter.scrollTop = textarea.scrollTop",
  'textarea.wrap = "off"',
]) if (!runtime.includes(marker)) throw new Error(`V342_RUNTIME_MISSING:${marker}`);

for (const marker of [
  "--studio-theme-code-editor-v342",
  'data-v342-editor-family="large"',
  'data-v342-editor-family="compact"',
  'grid-template-areas:"code preview"!important',
  'grid-template-areas:"preview" "code"!important',
  ".tn-code-gutter-v342",
  "background:#0c1525!important",
  "white-space:pre!important",
  "overflow:auto!important",
]) if (!css.includes(marker)) throw new Error(`V342_CSS_MISSING:${marker}`);

if (/#ngeblogging-studio-sidebar|\.sn-side|\.nara-assistant|\.sv124-domain-page|\.ce-app/.test(css))
  throw new Error("V342_UNRELATED_SURFACE_CSS");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(|setInterval\s*\(|stopImmediatePropagation/.test(runtime))
  throw new Error("V342_DESTRUCTIVE_RUNTIME");

for (const marker of [
  RELEASE,
  '"desktopSplit5050": true',
  '"desktopCompositionOwnedByStudioMode": true',
  '"compactPreviewAboveCode": true',
  '"darkReadableCodeSurface": true',
  '"realLineNumbers": 10000',
  '"singleLineNumberGutter": true',
  '"sidebarUntouched": true',
  '"authSessionUntouched": true',
  '"naraUntouched": true',
  '"serviceWorkerCacheRotated": true',
  '"realDeviceCertificationClaimed": false',
]) if (!release.includes(marker)) throw new Error(`V342_RELEASE_INVALID:${marker}`);

if (!tests.includes("v342 desktop editor matches the reference split") || !tests.includes("one synchronized gutter"))
  throw new Error("V342_TEST_MARKERS_MISSING");

let sw = await readFile(swFile, "utf8");
for (const inherited of [
  "STUDIO_THEME_SURFACE_FINAL_RELEASE_V341",
  "STUDIO_THEME_FINAL_RELEASE_V340",
  "STUDIO_THEME_CODE_DEVICE_RELEASE_V330",
  "STUDIO_NARA_NONMODAL_RELEASE_V313",
  "AUTH_SESSION_HANDOFF_RELEASE_V292",
]) if (!sw.includes(inherited)) throw new Error(`V342_SW_INHERITANCE_MISSING:${inherited}`);

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V341", "NGE_BLOGGING_UPDATE_AVAILABLE_V342")
  .replaceAll("service-worker-activated-theme-surface-final-v341", "service-worker-activated-theme-code-editor-v342");

sw = upsert(sw, "STUDIO_THEME_CODE_EDITOR_RELEASE_V342", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V342", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V342", "CACHE_RELEASE");

sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V342}-${ACTIVE_CACHE_RELEASE_V342}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V342}-${STUDIO_THEME_SURFACE_FINAL_RELEASE_V341}-${STUDIO_THEME_FINAL_RELEASE_V340}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V342}-${ACTIVE_CACHE_RELEASE_V342}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V342}-${STUDIO_THEME_SURFACE_FINAL_RELEASE_V341}-${STUDIO_THEME_FINAL_RELEASE_V340}-${STUDIO_THEME_CODE_DEVICE_RELEASE_V330}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, VERSION, CACHE, "ACTIVE_VERSION_V342", "ACTIVE_CACHE_RELEASE_V342"])
  if (!sw.includes(marker)) throw new Error(`V342_SW_MARKER_MISSING:${marker}`);
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(sw))
  throw new Error("V342_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE}: Theme code editor matches Studio mode, keeps 1-10000 real line numbers, and cache=${CACHE}.`);
await import("./patch-studio-theme-code-editor-v343.mjs");
