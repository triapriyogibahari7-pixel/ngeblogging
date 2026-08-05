import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const nativeFile = new URL("../src/studio-native-controls-v290.js", import.meta.url);
const memberControlsFile = new URL("../src/studio-members-controls-v307.js", import.meta.url);
const memberControlsCssFile = new URL("../src/studio-members-controls-v307.css", import.meta.url);
const memberManagerFile = new URL("../src/studio-members-v304.js", import.meta.url);
const switcherFixFile = new URL("../src/studio-site-switcher-v306-fix.js", import.meta.url);
const switcherFixCssFile = new URL("../src/studio-site-switcher-v306-fix.css", import.meta.url);

const RELEASE = "studio-members-visible-controls-v307-20260805";
const SWITCHER_FIX_RELEASE = "studio-site-switcher-layout-delete-v306-20260805";
const VERSION = "ngeblogging-app-v307-switcher-members-20260805";
const CACHE = "studio-switcher-members-cache-v307";
const PREVIOUS_VERSION_V305 = "ngeblogging-app-v305-site-switch-first-site-20260805";
const PREVIOUS_CACHE_V305 = "studio-site-switch-first-site-cache-v305";
const PREVIOUS_EVENT_V305 = "NGE_BLOGGING_UPDATE_AVAILABLE_V305";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V307_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [native, controls, controlsCss, manager, switcherFix, switcherFixCss] = await Promise.all([
  readFile(nativeFile, "utf8"),
  readFile(memberControlsFile, "utf8"),
  readFile(memberControlsCssFile, "utf8"),
  readFile(memberManagerFile, "utf8"),
  readFile(switcherFixFile, "utf8"),
  readFile(switcherFixCssFile, "utf8"),
]);

for (const marker of [
  RELEASE,
  'import("./studio-site-switcher-v306-fix.js")',
  'import("./studio-members-controls-v307.js")',
]) if (!native.includes(marker)) throw new Error(`V307_NATIVE_CHAIN_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  "+ Tambah anggota",
  "Hapus anggota",
  "__ngebloggingOpenMembersV304",
  "membersPageTitle",
]) if (!controls.includes(marker)) throw new Error(`V307_MEMBER_CONTROLS_MISSING:${marker}`);

for (const marker of [
  "get_site_members_v176",
  "invite_site_member_v176",
  "update_site_member_role_v176",
  "remove_site_member_v176",
]) if (!manager.includes(marker)) throw new Error(`V307_MEMBER_MANAGER_MISSING:${marker}`);

for (const marker of [
  SWITCHER_FIX_RELEASE,
  "Hapus situs",
  ".from(\"sites\")",
  ".delete()",
  ".eq(\"owner_id\", userId)",
]) if (!switcherFix.includes(marker)) throw new Error(`V307_SWITCHER_FIX_MISSING:${marker}`);

if (!controlsCss.includes("grid-template-columns:minmax(0,1fr) minmax(0,1fr)") || !controlsCss.includes("@media(max-width:760px)"))
  throw new Error("V307_MEMBER_CONTROLS_RESPONSIVE_CSS_MISSING");
if (!switcherFixCss.includes("data-site-switcher-close") || !switcherFixCss.includes("pointer-events:auto!important"))
  throw new Error("V307_SWITCHER_CLICK_GEOMETRY_MISSING");

for (const sourceText of [controls, switcherFix]) {
  if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(sourceText)) throw new Error("V307_RUNTIME_CHURN_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(sourceText)) throw new Error("V307_DESTRUCTIVE_SESSION_REGRESSION");
}

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_MEMBERS_CONTROLS_RELEASE_V307", `"${RELEASE}"`);
source = upsert(source, "STUDIO_SITE_SWITCHER_FIX_RELEASE_V306", `"${SWITCHER_FIX_RELEASE}"`);
source = upsert(source, "PREVIOUS_STUDIO_VERSION_V305", `"${PREVIOUS_VERSION_V305}"`);
source = upsert(source, "PREVIOUS_STUDIO_CACHE_V305", `"${PREVIOUS_CACHE_V305}"`);
source = upsert(source, "PREVIOUS_UPDATE_EVENT_V305", `"${PREVIOUS_EVENT_V305}"`);
source = upsert(source, "ACTIVE_VERSION_V307", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V307", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V307}-${ACTIVE_CACHE_RELEASE_V307}-${STUDIO_MEMBERS_CONTROLS_RELEASE_V307}-${STUDIO_SITE_SWITCHER_FIX_RELEASE_V306}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${STUDIO_SITE_SWITCHER_RELEASE_V305}-${STUDIO_FIRST_SITE_REQUIRED_RELEASE_V305}-${STUDIO_MEMBERS_RELEASE_V304}-${STUDIO_ADD_SITE_RELEASE_V303}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V307}-${ACTIVE_CACHE_RELEASE_V307}-${STUDIO_MEMBERS_CONTROLS_RELEASE_V307}-${STUDIO_SITE_SWITCHER_FIX_RELEASE_V306}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${STUDIO_SITE_SWITCHER_RELEASE_V305}-${STUDIO_FIRST_SITE_REQUIRED_RELEASE_V305}-${STUDIO_MEMBERS_RELEASE_V304}-${STUDIO_ADD_SITE_RELEASE_V303}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V305", "NGE_BLOGGING_UPDATE_AVAILABLE_V307")
  .replaceAll("service-worker-activated-site-switch-first-site-v305", "service-worker-activated-switcher-members-v307");

if (!source.includes(RELEASE) || !source.includes(SWITCHER_FIX_RELEASE) || !source.includes(VERSION) || !source.includes(CACHE))
  throw new Error("V307_SW_MARKERS_MISSING");
if (!source.includes(PREVIOUS_VERSION_V305) || !source.includes(PREVIOUS_CACHE_V305) || !source.includes(PREVIOUS_EVENT_V305))
  throw new Error("V307_V305_COMPAT_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
  throw new Error("V307_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);
