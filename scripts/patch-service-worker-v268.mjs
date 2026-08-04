import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../public/sw.js", import.meta.url);
const cssFile = new URL("../src/studio-final-device-authority-v268.css", import.meta.url);
const naraCssFile = new URL("../src/studio-nara-immediate-v268.css", import.meta.url);
const toggleFile = new URL("../src/studio-sidebar-single-toggle-v267.js", import.meta.url);
const profileFile = new URL("../src/studio-profile-menu-v268.js", import.meta.url);
const RELEASE = "studio-final-device-authority-v268-20260804";
const CACHE_RELEASE = "studio-final-device-cache-v268";

function replaceOrInsert(source, name, expression) {
  const line = `const ${name} = ${expression};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const version = /^(const VERSION = .*;\n)/m;
  if (!version.test(source)) throw new Error(`V268_SW_VERSION_ANCHOR_MISSING:${name}`);
  return source.replace(version, `$1${line}\n`);
}

async function validateResponsiveAuthority() {
  const [css, naraCss, toggle, profile] = await Promise.all([
    readFile(cssFile, "utf8"),
    readFile(naraCssFile, "utf8"),
    readFile(toggleFile, "utf8"),
    readFile(profileFile, "utf8"),
  ]);
  const requiredCss = [
    'html[data-studio-device-mode="large"] #ngeblogging-studio-sidebar',
    'html[data-studio-device-mode="small"] #ngeblogging-studio-sidebar',
    '--v268-side-rail:72px',
    '.nara-floating-button',
    'position:fixed!important',
    'grid-template-columns:repeat(3,minmax(0,1fr))!important',
    'html[data-studio-device-mode="small"] .sn-home-grid>section>header',
    'position:static!important',
    'html[data-studio-device-mode="large"] .tn-code-workspace',
    'html[data-studio-device-mode="small"] .tn-code-workspace',
  ];
  for (const marker of requiredCss) {
    if (!css.includes(marker)) throw new Error(`V268_RESPONSIVE_CSS_MARKER_MISSING:${marker}`);
  }
  for (const marker of [
    'import "./studio-final-device-authority-v268.css";',
    'import "./studio-profile-menu-v268.js";',
    'import "./studio-nara-immediate-v268.css";',
    'event.stopImmediatePropagation()',
  ]) {
    if (!toggle.includes(marker)) throw new Error(`V268_TOGGLE_MARKER_MISSING:${marker}`);
  }
  for (const marker of [
    'data-action="profile"',
    'data-action="add-site"',
    'data-action="settings"',
    'data-action="nara"',
    'data-action="logout"',
  ]) {
    if (!profile.includes(marker)) throw new Error(`V268_PROFILE_ACTION_MISSING:${marker}`);
  }
  if (!naraCss.includes(':has(>.nara-assistant-shell[data-nara-size="small"])')
    || !naraCss.includes(':has(>.nara-assistant-shell[data-nara-size="medium"])')
    || !naraCss.includes('display:none!important')) {
    throw new Error("V268_NARA_IMMEDIATE_NONMODAL_GUARD_MISSING");
  }
  for (const source of [toggle, profile, naraCss]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
      throw new Error("V268_RESPONSIVE_SESSION_DESTRUCTIVE_ACTION");
    }
  }
}

await validateResponsiveAuthority();

let source = await readFile(file, "utf8");
source = replaceOrInsert(source, "UI_PATCH_RELEASE_V268", `"${RELEASE}"`);
source = replaceOrInsert(source, "UI_CACHE_RELEASE_V268", `"${CACHE_RELEASE}"`);
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${UI_PATCH_RELEASE_V263}-${UI_PATCH_RELEASE_V265}-${UI_CACHE_RELEASE_V265}-${UI_PATCH_RELEASE_V267}-${UI_CACHE_RELEASE_V267}-${UI_PATCH_RELEASE_V268}-${UI_CACHE_RELEASE_V268}-${AUTH_HANDOFF_RELEASE}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V260}-${ACTIVE_CACHE_RELEASE_V260}-${UI_PATCH_RELEASE_V263}-${UI_PATCH_RELEASE_V265}-${UI_CACHE_RELEASE_V265}-${UI_PATCH_RELEASE_V267}-${UI_CACHE_RELEASE_V267}-${UI_PATCH_RELEASE_V268}-${UI_CACHE_RELEASE_V268}-${AUTH_HANDOFF_RELEASE}-assets`;')
  .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v268: notify the old tab only; never force a second navigation.");

for (const marker of [
  "UI_PATCH_RELEASE_V263",
  "UI_PATCH_RELEASE_V265",
  "UI_CACHE_RELEASE_V265",
  "UI_PATCH_RELEASE_V267",
  "UI_CACHE_RELEASE_V267",
  "UI_PATCH_RELEASE_V268",
  "UI_CACHE_RELEASE_V268",
  RELEASE,
  CACHE_RELEASE,
]) {
  if (!source.includes(marker)) throw new Error(`V268_SW_MARKER_MISSING:${marker}`);
}
if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V268_SW_DOUBLE_RELOAD_REGRESSION");
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V268_SW_SESSION_DESTRUCTIVE_ACTION");

await writeFile(file, source);
console.log(`Validated responsive authority and rotated service-worker shell/assets for ${RELEASE}`);
