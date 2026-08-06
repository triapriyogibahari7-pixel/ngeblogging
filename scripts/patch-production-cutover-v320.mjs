import { readFile, writeFile } from "node:fs/promises";

const swFile = new URL("../public/sw.js", import.meta.url);
const releaseFile = new URL("../public/release-v320.json", import.meta.url);
const mediaMigration = new URL("../supabase/migrations/20260806070000_media_bucket_constraint_alignment_v320.sql", import.meta.url);
const membersMigration = new URL("../supabase/migrations/20260806071000_site_members_profile_relationship_v320.sql", import.meta.url);

const RELEASE = "studio-production-cutover-v320-20260806";
const VERSION = "ngeblogging-app-v320-production-cutover-20260806";
const CACHE = "studio-production-cutover-cache-v320";

function upsert(source, name, value) {
  const line = `const ${name} = ${value};`;
  const pattern = new RegExp(`^const ${name} = .*;$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  const anchor = /^(const VERSION = .*;\n)/m;
  if (!anchor.test(source)) throw new Error(`V320_SW_ANCHOR_MISSING:${name}`);
  return source.replace(anchor, `$1${line}\n`);
}

const [release, mediaSql, membersSql] = await Promise.all([
  readFile(releaseFile, "utf8"),
  readFile(mediaMigration, "utf8"),
  readFile(membersMigration, "utf8"),
]);

for (const marker of [
  RELEASE,
  '"membersProfileRelationshipUnambiguous": true',
  '"mediaBucketMetadataAligned": true',
  '"authSessionRecoveryInheritedFromV315": true',
  '"themeScreenshotRepairInheritedFromV319": true',
]) if (!release.includes(marker)) throw new Error(`V320_RELEASE_INVALID:${marker}`);

if (!mediaSql.includes("bucket_id in ('site-media', 'site-public-media')") || !mediaSql.includes("set default 'site-public-media'"))
  throw new Error("V320_MEDIA_MIGRATION_INVALID");
if (!membersSql.includes("references auth.users(id) on delete set null"))
  throw new Error("V320_MEMBERS_MIGRATION_INVALID");

let sw = await readFile(swFile, "utf8");
for (const inherited of [
  "STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319",
  "STUDIO_SCREENSHOT_HOTFIX_RELEASE_V318",
  "AUTH_CALLBACK_RECOVERY_RELEASE_V315",
  "STUDIO_NARA_NONMODAL_RELEASE_V313",
]) if (!sw.includes(inherited)) throw new Error(`V320_INHERITANCE_MISSING:${inherited}`);

sw = sw
  .replace(/^const VERSION = .*;$/m, `const VERSION = "${VERSION}";`)
  .replace(/^const CACHE_RELEASE = .*;$/m, `const CACHE_RELEASE = "${CACHE}";`)
  .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V319", "NGE_BLOGGING_UPDATE_AVAILABLE_V320")
  .replaceAll("service-worker-activated-studio-screenshot-regression-v319", "service-worker-activated-studio-production-cutover-v320");
sw = upsert(sw, "STUDIO_PRODUCTION_CUTOVER_RELEASE_V320", `"${RELEASE}"`);
sw = upsert(sw, "ACTIVE_VERSION_V320", "VERSION");
sw = upsert(sw, "ACTIVE_CACHE_RELEASE_V320", "CACHE_RELEASE");

const shellLine = 'const SHELL_CACHE = `${ACTIVE_VERSION_V320}-${ACTIVE_CACHE_RELEASE_V320}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_SCREENSHOT_HOTFIX_RELEASE_V318}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_DOMAIN_FULLZONE_RELEASE_V314}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-shell`;';
const assetLine = 'const ASSET_CACHE = `${ACTIVE_VERSION_V320}-${ACTIVE_CACHE_RELEASE_V320}-${STUDIO_PRODUCTION_CUTOVER_RELEASE_V320}-${STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319}-${STUDIO_SCREENSHOT_HOTFIX_RELEASE_V318}-${STUDIO_FINAL_RESPONSIVE_RELEASE_V317}-${STUDIO_CONTENT_EDITOR_FINAL_RELEASE_V316}-${AUTH_CALLBACK_RECOVERY_RELEASE_V315}-${STUDIO_DOMAIN_FULLZONE_RELEASE_V314}-${STUDIO_NARA_NONMODAL_RELEASE_V313}-${STUDIO_THEME_MEMBERS_DOMAIN_RELEASE_V312}-${AUTH_SESSION_HANDOFF_RELEASE_V292}-assets`;';
sw = sw
  .replace(/^const SHELL_CACHE = .*;$/m, shellLine)
  .replace(/^const ASSET_CACHE = .*;$/m, assetLine);

for (const marker of [RELEASE, VERSION, CACHE, "STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319"])
  if (!sw.includes(marker)) throw new Error(`V320_SW_MARKER_MISSING:${marker}`);

await writeFile(swFile, sw);
console.log(`Validated ${RELEASE} and rotated cache to ${CACHE}`);
await import("../tests/studio-production-cutover-v320.test.mjs");
