import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const runtimeFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const cssFile = new URL("../src/studio-content-editor-final-v316.css", import.meta.url);
const guardFile = new URL("../src/studio-content-editor-final-v316.js", import.meta.url);
const testFile = new URL("../tests/studio-content-editor-post-page-v309.test.mjs", import.meta.url);
const releaseFile = new URL("../public/release-v316.json", import.meta.url);
const release315File = new URL("../public/release-v315.json", import.meta.url);
const release314File = new URL("../public/release-v314.json", import.meta.url);
const release313File = new URL("../public/release-v313.json", import.meta.url);
const release312File = new URL("../public/release-v312.json", import.meta.url);

const RELEASE = "studio-content-editor-final-v316-20260806";
const VERSION = "ngeblogging-app-v316-post-pages-final-20260806";
const CACHE = "studio-content-editor-final-cache-v316";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V316_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [runtime, css, guard, tests, release, release315, release314, release313, release312] = await Promise.all([
  readFile(runtimeFile, "utf8"), readFile(cssFile, "utf8"), readFile(guardFile, "utf8"),
  readFile(testFile, "utf8"), readFile(releaseFile, "utf8"), readFile(release315File, "utf8"),
  readFile(release314File, "utf8"), readFile(release313File, "utf8"), readFile(release312File, "utf8"),
]);

for (const marker of ["studio-content-editor-final-v316.js", RELEASE, "studio-content-editor-desktop-site-v310-20260806"])
  if (!runtime.includes(marker)) throw new Error(`V316_RUNTIME_MISSING:${marker}`);
for (const marker of [
  "min-height:clamp(280px,34dvh,430px)", "@media (min-width:820px)",
  "grid-template-columns:minmax(0,1fr) clamp(270px,27vw,340px)", "@media (max-width:760px)",
  'grid-template-areas:"back file" "actions actions"', "ce-source-layer footer{flex-wrap:wrap", ".ce-word-limit-v316",
]) if (!css.includes(marker)) throw new Error(`V316_CSS_MISSING:${marker}`);
if (/#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.nara-assistant|\.tn-studio|\.sn-avatar/.test(css))
  throw new Error("V316_EDITOR_SCOPE_REGRESSION");
for (const marker of [
  "CONTENT_WORD_LIMIT_V316 = 5000", "CONTENT_WORD_WARNING_V316 = 4500", "Draf tetap aman dan tidak dipotong",
  ".ce-actions .ce-primary", 'option[value="published"]', "publishButton.disabled = over", "publishedOption.disabled = over",
]) if (!guard.includes(marker)) throw new Error(`V316_WORD_GUARD_MISSING:${marker}`);
if (/new MutationObserver|setInterval\s*\(|stopImmediatePropagation|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/.test(guard))
  throw new Error("V316_RUNTIME_CHURN_OR_DESTRUCTIVE_BEHAVIOR");
for (const marker of [
  "v316 enforces the real 5000-word publication limit without trimming drafts",
  "Posts and Pages still share the same ContentEditor implementation",
  "small family stays one-column, touch-safe, compact and complete",
]) if (!tests.includes(marker)) throw new Error(`V316_TEST_MISSING:${marker}`);
for (const marker of [
  RELEASE, '"wordLimit": 5000', '"draftNeverTrimmed": true', '"publicationBlockedOverLimit": true',
  '"authV315Preserved": true', '"domainV314Preserved": true', '"sidebarUntouched": true', '"massiveCapacityClaimed": false',
]) if (!release.includes(marker)) throw new Error(`V316_RELEASE_INVALID:${marker}`);
for (const marker of ["auth-callback-session-recovery-v315-20260806", '"staleOAuthStateRecovery": true', '"providerDoubleTapGuard": true', '"persistSessionPreserved": true'])
  if (!release315.includes(marker)) throw new Error(`V316_V315_COMPAT_MISSING:${marker}`);
for (const marker of ["studio-domain-fullzone-v314-20260806", '"provider": "cloudflare-full-zone"', '"legacyDomainMigration": true', '"fakeActiveStatusAllowed": false'])
  if (!release314.includes(marker)) throw new Error(`V316_V314_COMPAT_MISSING:${marker}`);
for (const marker of ["studio-nara-nonmodal-v313-20260806", '"smallNonModal": true', '"mediumNonModal": true'])
  if (!release313.includes(marker)) throw new Error(`V316_V313_COMPAT_MISSING:${marker}`);
for (const marker of ["studio-theme-members-domain-v312-20260806", '"themes": 100', '"layoutAreas": 26', '"memberRoleChoices": 5'])
  if (!release312.includes(marker)) throw new Error(`V316_V312_COMPAT_MISSING:${marker}`);

let source = await readFile(swFile, "utf8");
source = source
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V315", "NGE_BLOGGING_UPDATE_AVAILABLE_V316")
  .replaceAll("service-worker-activated-auth-callback-recovery-v315", "service-worker-activated-content-editor-final-v316");
source = upsert(source, "STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316", `"${RELEASE}"`);
source = upsert(source, "ACTIVE_VERSION_V316", "VERSION");
source = upsert(source, "ACTIVE_CACHE_RELEASE_V316", "CACHE_RELEASE");
source = source
  .replace(/^const SHELL_CACHE = .*;$/m, 'const SHELL_CACHE = `${ACTIVE_VERSION_V316}-${ACTIVE_CACHE_RELEASE_V316}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${AUTH_ACTION_SINGLEFLIGHT_RELEASE_V315}-${STUDIO_DOMAIN_FULLZONE_RELEASE_V314}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;')
  .replace(/^const ASSET_CACHE = .*;$/m, 'const ASSET_CACHE = `${ACTIVE_VERSION_V316}-${ACTIVE_CACHE_RELEASE_V316}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${AUTH_ACTION_SINGLEFLIGHT_RELEASE_V315}-${STUDIO_DOMAIN_FULLZONE_RELEASE_V314}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${STUDIO_FIRST_SITE_STABILITY_RELEASE_V311}-${STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310}-${STUDIO_CONTENT_EDITOR_RELEASE_V308}-${STUDIO_SITE_SWITCH_FIRST_SITE_RELEASE_V305}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;');
for (const marker of [
  RELEASE, VERSION, CACHE, "AUTH_CALLBACK_RECOVERY_RELEASE_V315", "AUTH_ACTION_SINGLEFLIGHT_RELEASE_V315",
  "STUDIO_DOMAIN_FULLZONE_RELEASE_V314", "STUDIO_NARA_NONMODAL_RELEASE_V313", "STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312",
  "STUDIO_FIRST_SITE_STABILITY_RELEASE_V311", "STUDIO_CONTENT_EDITOR_DESKTOP_SITE_RELEASE_V310", "AUTH_SESSION_HANDOFF_RELEASE_V292",
]) if (!source.includes(marker)) throw new Error(`V316_SW_MARKER_MISSING:${marker}`);
if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/.test(source))
  throw new Error("V316_DESTRUCTIVE_SW_BEHAVIOR");
await writeFile(swFile, source);
console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);
