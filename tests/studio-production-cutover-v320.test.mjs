import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("v320 release records the production schema cutover without fake claims", async () => {
  const release = JSON.parse(await read("public/release-v320.json"));
  assert.equal(release.mainProductionBranchesSynchronized, true);
  assert.equal(release.membersProfileRelationshipUnambiguous, true);
  assert.equal(release.membersInviterReferencesAuthUsers, true);
  assert.equal(release.mediaBucketMetadataAligned, true);
  assert.equal(release.mediaLegacyBucketPreserved, true);
  assert.equal(release.authSessionRecoveryInheritedFromV315, true);
  assert.equal(release.themeScreenshotRepairInheritedFromV319, true);
  assert.equal(release.domainPublicDnsTruthfulnessInheritedFromV318, true);
  assert.equal(release.wordLimitInheritedFromV316, 5000);
  assert.equal(release.fakeProductionClaimsAllowed, false);
});

test("v320 repository migrations preserve media compatibility and remove the ambiguous member profile relationship", async () => {
  const media = await read("supabase/migrations/20260806070000_media_bucket_constraint_alignment_v320.sql");
  const members = await read("supabase/migrations/20260806071000_site_members_profile_relationship_v320.sql");
  assert.match(media, /bucket_id in \('site-media', 'site-public-media'\)/);
  assert.match(media, /set default 'site-public-media'/);
  assert.match(members, /references auth\.users\(id\) on delete set null/);
  assert.doesNotMatch(members, /references public\.profiles/);
});

test("v320 service worker is the final cache authority after inherited v319", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /STUDIO_PRODUCTION_CUTOVER_RELEASE_V320/);
  assert.match(sw, /ngeblogging-app-v320-production-cutover-20260806/);
  assert.match(sw, /studio-production-cutover-cache-v320/);
  assert.match(sw, /STUDIO_SCREENSHOT_REGRESSION_RELEASE_V319/);
});
