import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const entryFile = new URL("../src/studio-theme-surface-final-v341.js", import.meta.url);
const runtimeFile = new URL("../src/studio-site-switcher-surface-v345.js", import.meta.url);
const cssFile = new URL("../src/studio-site-switcher-surface-v345.css", import.meta.url);
const releaseFile = new URL("../public/release-v345.json", import.meta.url);
const testFile = new URL("../tests/studio-site-switcher-surface-v345.test.mjs", import.meta.url);

const RELEASE = "studio-site-switcher-surface-v345-20260807";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V345_SW_ANCHOR_MISSING:${name}`);
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
  'import "./studio-theme-code-editor-v344.js"',
  'import "./studio-site-switcher-surface-v345.js"',
]) if (!entry.includes(marker)) throw new Error(`V345_ENTRY_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  'import "./studio-site-switcher-surface-v345.css"',
  "studioSiteSwitcherSurfaceV345",
]) if (!runtime.includes(marker)) throw new Error(`V345_RUNTIME_MISSING:${marker}`);

for (const marker of [
  "--studio-site-switcher-surface-v345",
  ".sn-modal-layer:has(.sn-site-manager)",
  ".sn-site-switcher-v304-layer",
  "place-items:start center!important",
  "place-items:end center!important",
  'data-studio-responsive-mode="application"',
  'data-studio-responsive-mode="phone"',
  'data-studio-responsive-mode="mobile"',
  'data-studio-responsive-mode="compact"',
  'data-studio-responsive-mode="tablet"',
  'data-studio-device-mode="small"',
  ".sn-site-manager>header",
  ".sn-sites-list article",
  ".sn-site-switcher-v304-row",
]) if (!css.includes(marker)) throw new Error(`V345_CSS_MISSING:${marker}`);

if (/#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.nara-assistant|\.nara-floating-button|\.sv124-domain-page|\.ce-app|\.tn-studio/.test(css))
  throw new Error("V345_UNRELATED_SURFACE_CSS");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(|setInterval\s*\(|stopImmediatePropagation/.test(runtime))
  throw new Error("V345_DESTRUCTIVE_RUNTIME");

for (const marker of [
  RELEASE,
  '"desktopDialogBelowTopbar": true',
  '"tabletDialogBelowTopbar": true',
  '"mobileBottomSheetBelowHeader": true',
  '"siteManagerHeaderSeparated": true',
  '"activeSiteRowSeparated": true',
  '"closeButtonSeparated": true',
  '"siteActionsWrapSafely": true',
  '"sidebarUntouched": true',
  '"authSessionUntouched": true',
  '"naraUntouched": true',
  '"themeStudioUntouched": true',
  '"cacheKeyIncludesV345": true',
  '"realDeviceCertificationClaimed": false',
]) if (!release.includes(marker)) throw new Error(`V345_RELEASE_INVALID:${marker}`);

if (!tests.includes("lowers both real site switching surfaces") || !tests.includes("separates title, close button and active site rows"))
  throw new Error("V345_TEST_MARKERS_MISSING");

let sw = await readFile(swFile, "utf8");
for (const inherited of [
  "STUDIO_THEME_CODE_EDITOR_RELEASE_V344",
  "STUDIO_THEME_CODE_EDITOR_RELEASE_V343",
  "STUDIO_THEME_CODE_EDITOR_RELEASE_V342",
  "STUDIO_THEME_SURFACE_FINAL_RELEASE_V341",
  "STUDIO_THEME_FINAL_RELEASE_V340",
  "AUTH_SESSION_HANDOFF_RELEASE_V292",
]) if (!sw.includes(inherited)) throw new Error(`V345_SW_INHERITANCE_MISSING:${inherited}`);

sw = upsert(sw, "STUDIO_SITE_SWITCHER_SURFACE_RELEASE_V345", `"${RELEASE}"`);
sw = sw
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V344", "NGE_BLOGGING_UPDATE_AVAILABLE_V345")
  .replaceAll("service-worker-activated-theme-code-editor-v344", "service-worker-activated-site-switcher-surface-v345")
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V344}-${ACTIVE_CACHE_RELEASE_V344}-${STUDIO_SITE_SWITCHER_SURFACE_RELEASE_V345}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V344}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V343}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V342}-${STUDIO_THEME_SURFACE_FINAL_RELEASE_V341}-${STUDIO_THEME_FINAL_RELEASE_V340}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V344}-${ACTIVE_CACHE_RELEASE_V344}-${STUDIO_SITE_SWITCHER_SURFACE_RELEASE_V345}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V344}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V343}-${STUDIO_THEME_CODE_EDITOR_RELEASE_V342}-${STUDIO_THEME_SURFACE_FINAL_RELEASE_V341}-${STUDIO_THEME_FINAL_RELEASE_V340}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [RELEASE, "STUDIO_SITE_SWITCHER_SURFACE_RELEASE_V345", "ACTIVE_VERSION_V344", "ACTIVE_CACHE_RELEASE_V344"])
  if (!sw.includes(marker)) throw new Error(`V345_SW_MARKER_MISSING:${marker}`);
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(sw))
  throw new Error("V345_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE}: site switcher is lowered below Studio chrome and v345 participates in shell/asset cache keys.`);
