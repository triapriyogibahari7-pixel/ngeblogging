import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const visualFile = new URL("../src/studio-final-v317.css", import.meta.url);
const editorNavFile = new URL("../src/studio-editor-navigation-v266.js", import.meta.url);
const editorNavCssFile = new URL("../src/studio-editor-navigation-v266.css", import.meta.url);
const domainProviderFile = new URL("../server/cloudflare-full-zone-provider.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v317.json", import.meta.url);
const release316File = new URL("../public/release-v316.json", import.meta.url);
const release315File = new URL("../public/release-v315.json", import.meta.url);
const release314File = new URL("../public/release-v314.json", import.meta.url);
const release313File = new URL("../public/release-v313.json", import.meta.url);
const release312File = new URL("../public/release-v312.json", import.meta.url);

const RELEASE = "studio-final-responsive-v317-20260806";
const VERSION = "ngeblogging-app-v317-final-responsive-20260806";
const CACHE = "studio-final-responsive-cache-v317";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V317_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [runtime, visual, editorNav, editorNavCss, domainProvider, release, release316, release315, release314, release313, release312] = await Promise.all([
  readFile(runtimeFile, "utf8"),
  readFile(visualFile, "utf8"),
  readFile(editorNavFile, "utf8"),
  readFile(editorNavCssFile, "utf8"),
  readFile(domainProviderFile, "utf8"),
  readFile(releaseFile, "utf8"),
  readFile(release316File, "utf8"),
  readFile(release315File, "utf8"),
  readFile(release314File, "utf8"),
  readFile(release313File, "utf8"),
  readFile(release312File, "utf8"),
]);

for (const marker of [
  'import "./studio-final-v317.css"',
  'STUDIO_FINAL_RESPONSIVE_RELEASE_V317 = "studio-final-responsive-v317-20260806"',
  "studioContentEditorFinalV316",
]) if (!runtime.includes(marker)) throw new Error(`V317_RUNTIME_MISSING:${marker}`);

for (const marker of [
  "studio-final-responsive-v317-20260806",
  "#ngeblogging-studio-sidebar>nav{flex:0 1 auto!important",
  "grid-template-areas:\"code preview\"",
  "grid-template-areas:\"preview\" \"code\"",
  ".tn-layout-popover-v312",
  "data-theme-code-v312=\"line-numbers-10000\"",
  ".sn-api-endpoint h2",
  ".nara-floating-button",
  "nara-assistant-shell[data-nara-size=\"small\"]",
]) if (!visual.includes(marker)) throw new Error(`V317_VISUAL_MISSING:${marker}`);

for (const marker of [
  "STUDIO_EDITOR_NAVIGATION_CLEAN_CLONE_V317",
  "stripRuntimeGeometry",
  'removeAttribute("style")',
  "cachedSidebar || fallbackSidebar()",
]) if (!editorNav.includes(marker)) throw new Error(`V317_EDITOR_NAV_MISSING:${marker}`);

for (const marker of [
  ".ce-editor-side-v266>nav{display:flex!important;flex:0 1 auto!important",
  "background:transparent!important",
  "#ngeblogging-editor-nav-v266.collapsed",
  "html.editor-v266-small .ce-editor-sidebar-toggle-v266{display:grid!important",
]) if (!editorNavCss.includes(marker)) throw new Error(`V317_EDITOR_NAV_CSS_MISSING:${marker}`);

for (const marker of [
  'WORKER_DOMAIN_ATTACH_RELEASE_V317 = "cloudflare-worker-domain-verified-v317-20260806"',
  "listWorkerDomains",
  "/workers/domains",
  "Workers Scripts Write",
  "WORKER_DOMAIN_NOT_ATTACHED",
  "WORKER_DOMAIN_SERVICE_MISMATCH",
  "verifyWorkerDomainAttachment",
]) if (!domainProvider.includes(marker)) throw new Error(`V317_DOMAIN_ROUTING_MISSING:${marker}`);

for (const marker of [
  RELEASE,
  '"themeMapModels": 2',
  '"themeLayoutAreasPreserved": 26',
  '"themeCountPreserved": 100',
  '"themeCodeLineGuidePreserved": 10000',
  '"workerDomainAttachVerification": true',
  '"fakeDomainActiveStatusAllowed": false',
  '"wordLimit": 5000',
  '"massiveCapacityClaimed": false',
]) if (!release.includes(marker)) throw new Error(`V317_RELEASE_INVALID:${marker}`);

for (const marker of ["studio-content-editor-final-v316-20260806", '"draftNeverTrimmed": true', '"publicationBlockedOverLimit": true'])
  if (!release316.includes(marker)) throw new Error(`V317_V316_COMPAT_MISSING:${marker}`);
for (const marker of ["auth-callback-session-recovery-v315-20260806", '"persistSessionPreserved": true'])
  if (!release315.includes(marker)) throw new Error(`V317_V315_COMPAT_MISSING:${marker}`);
for (const marker of ["studio-domain-fullzone-v314-20260806", '"fakeActiveStatusAllowed": false'])
  if (!release314.includes(marker)) throw new Error(`V317_V314_COMPAT_MISSING:${marker}`);
for (const marker of ["studio-nara-nonmodal-v313-20260806", '"smallNonModal": true', '"mediumNonModal": true'])
  if (!release313.includes(marker)) throw new Error(`V317_V313_COMPAT_MISSING:${marker}`);
for (const marker of ["studio-theme-members-domain-v312-20260806", '"themes": 100', '"layoutAreas": 26', '"codeLineNumbers": 10000'])
  if (!release312.includes(marker)) throw new Error(`V317_V312_COMPAT_MISSING:${marker}`);

if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(editorNav))
  throw new Error("V317_DESTRUCTIVE_EDITOR_NAVIGATION");

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V316", "NGE_BLOGGING_UPDATE_AVAILABLE_V317")
  .replaceAll("service-worker-activated-content-editor-final-v316", "service-worker-activated-studio-final-responsive-v317");
source = upsert(source, "STUDIO_FINAL_RESPONSIVE_RELEASE_V317", `"${RELEASE}"`);
source = upsert(source, "ACTIVE_VERSION_V317", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V317", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V317}-${ACTIVE_CACHE_RELEASE_V317}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${AUTH_ACTION_SINGLEFLIGHT_RELEASE_V315}-${STUDIO_DOMAIN_FULLZONE_RELEASE_V314}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V317}-${ACTIVE_CACHE_RELEASE_V317}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${AUTH_ACTION_SINGLEFLIGHT_RELEASE_V315}-${STUDIO_DOMAIN_FULLZONE_RELEASE_V314}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');

for (const marker of [
  RELEASE, VERSION, CACHE,
  "STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316",
  "AUTH_CALLBACK_RECOVERY_RELEASE_V315",
  "AUTH_ACTION_SINGLEFLIGHT_RELEASE_V315",
  "STUDIO_DOMAIN_FULLZONE_RELEASE_V314",
  "STUDIO_NARA_NONMODAL_RELEASE_V313",
  "STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312",
  "STUDIO_FIRST_SITE_STABILITY_RELEASE_V311",
  "STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310",
  "STUDIO_CONTENT_EDITOR_RELEASE_V308",
  "AUTH_SESSION_HANDOFF_RELEASE_V292",
]) if (!source.includes(marker)) throw new Error(`V317_SW_MARKER_MISSING:${marker}`);

if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
  throw new Error("V317_DESTRUCTIVE_SW_BEHAVIOR");

await writeFile(swFile, source);
console.log(`Validated ${RELEASE}; verified sidebar/theme/editor/Nara/domain routing contracts and rotated cache to ${CACHE}`);
