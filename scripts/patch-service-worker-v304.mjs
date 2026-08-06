import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const nativeFile = new URL("../src/studio-native-controls-v290.js", import.meta.url);
const switcherFile = new URL("../src/studio-site-switcher-v304.js", import.meta.url);
const switcherCssFile = new URL("../src/studio-site-switcher-v304.css", import.meta.url);
const membersFile = new URL("../src/studio-members-v304.js", import.meta.url);
const membersCssFile = new URL("../src/studio-members-v304.css", import.meta.url);
const testFile = new URL("../tests/studio-workspaces-members-v304.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v304.json", import.meta.url);

const RELEASE = "studio-workspaces-members-v304-20260805";
const SWITCHER_RELEASE = "studio-real-site-switcher-v304-20260805";
const MEMBERS_RELEASE = "studio-members-real-invite-v304-20260805";
const VERSION = "ngeblogging-app-v304-workspaces-members-20260805";
const CACHE = "studio-workspaces-members-cache-v304";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V304_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [native, switcher, switcherCss, members, membersCss, tests, release] = await Promise.all([
  readFile(nativeFile, "utf8"),
  readFile(switcherFile, "utf8"),
  readFile(switcherCssFile, "utf8"),
  readFile(membersFile, "utf8"),
  readFile(membersCssFile, "utf8"),
  readFile(testFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

for (const marker of [
  SWITCHER_RELEASE,
  'import("./studio-site-switcher-v305.js")',
  'import("./studio-members-v304.js")',
]) if (!native.includes(marker)) throw new Error(`V304_NATIVE_CHAIN_MISSING:${marker}`);

for (const marker of [
  SWITCHER_RELEASE,
  "listUserSitesStartupV292",
  "Ganti situs",
  "data-site-switcher-list",
  "setActiveSiteId",
  "ngeblogging:active-site-change",
  "Buat situs pertama",
]) if (!switcher.includes(marker)) throw new Error(`V304_SWITCHER_MISSING:${marker}`);

for (const marker of [
  MEMBERS_RELEASE,
  "get_site_members_v176",
  "get_site_member_quota",
  "invite_site_member_v176",
  "update_site_member_role_v176",
  "remove_site_member_v176",
  "+ Tambah anggota",
]) if (!members.includes(marker)) throw new Error(`V304_MEMBERS_MISSING:${marker}`);

if (!switcherCss.includes("width:min(780px,calc(100vw - 28px))") || !switcherCss.includes("@media(max-width:680px)"))
  throw new Error("V304_SWITCHER_RESPONSIVE_CSS_MISSING");
if (!membersCss.includes("width:min(820px,calc(100vw - 28px))") || !membersCss.includes("@media(max-width:760px)"))
  throw new Error("V304_MEMBERS_RESPONSIVE_CSS_MISSING");
if (!tests.includes("Ganti situs v305 shows every real site") || !tests.includes("member manager exposes real add and remove-member controls through production RPCs"))
  throw new Error("V304_TEST_MARKERS_MISSING");
if (!release.includes(RELEASE) || !release.includes(CACHE) || !release.includes('"existingSitesVisible": true') || !release.includes('"addMemberButton": true'))
  throw new Error("V304_RELEASE_INVALID");

for (const sourceText of [switcher, members]) {
  if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation/.test(sourceText)) throw new Error("V304_RUNTIME_CHURN_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(sourceText))
    throw new Error("V304_DESTRUCTIVE_RUNTIME");
}

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`);
source = upsert(source, "STUDIO_WORKSPACES_MEMBERS_RELEASE_V304", `"${RELEASE}"`);
source = upsert(source, "STUDIO_SITE_SWITCHER_RELEASE_V304", `"${SWITCHER_RELEASE}"`);
source = upsert(source, "STUDIO_MEMBERS_RELEASE_V304", `"${MEMBERS_RELEASE}"`);
source = upsert(source, "ACTIVE_VERSION_V304", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V304", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V304}-${ACTIVE_CACHE_RELEASE_V304}-${STUDIO_WORKSPACES_MEMBERS_RELEASE_V304}-${STUDIO_SITE_SWITCHER_RELEASE_V304}-${STUDIO_MEMBERS_RELEASE_V304}-${STUDIO_ADD_SITE_RELEASE_V303}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V304}-${ACTIVE_CACHE_RELEASE_V304}-${STUDIO_WORKSPACES_MEMBERS_RELEASE_V304}-${STUDIO_SITE_SWITCHER_RELEASE_V304}-${STUDIO_MEMBERS_RELEASE_V304}-${STUDIO_ADD_SITE_RELEASE_V303}-${STUDIO_STARTUP_DIRECT_DATA_RELEASE_V292}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;')
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V303", "NGE_BLOGGING_UPDATE_AVAILABLE_V304")
  .replaceAll("service-worker-activated-add-site-v303", "service-worker-activated-workspaces-members-v304");

if (!source.includes(RELEASE) || !source.includes(CACHE) || !source.includes(VERSION)) throw new Error("V304_SW_MARKERS_MISSING");
if (/await\s+refreshStaleWindow\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
  throw new Error("V304_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);
await import("./patch-service-worker-v305.mjs");