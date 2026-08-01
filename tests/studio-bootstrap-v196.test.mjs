import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const chain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-studio-bootstrap-v196.mjs");
const gate = read("src/StudioOnboardingGate.jsx");
const worker = read("public/sw.js");
const workflow = read(".github/workflows/cloudflare-token-diagnostic.yml");
const release = JSON.parse(read("public/release-v196.json"));

const RELEASE = "studio-bootstrap-live-recovery-v196-20260802";

test("v196 runs only after the complete v195 bootstrap authority", () => {
  assert.match(chain, /patch-studio-bootstrap-v195-publish-fix\.mjs/);
  assert.match(chain, /patch-studio-bootstrap-v195\.mjs/);
  assert.match(chain, /patch-studio-bootstrap-v195-compat\.mjs/);
  assert.match(chain, /patch-studio-bootstrap-v196\.mjs/);
  assert.ok(chain.indexOf("patch-studio-bootstrap-v195-compat.mjs") < chain.indexOf("patch-studio-bootstrap-v196.mjs"));
});

test("transient Studio failure gets bounded automatic direct and client recovery", () => {
  assert.match(patch, /recoverStudioMembershipV196/);
  assert.match(patch, /RECOVERY_RETRY_DELAYS_V196 = \[650, 1_400, 2_800\]/);
  assert.match(patch, /listUserSitesDirectV192\(userId, token\)/);
  assert.match(patch, /direct-supabase-rls-recovery/);
  assert.match(patch, /listUserSites\(userId\)/);
  assert.match(patch, /supabase-client-recovery/);
  assert.match(patch, /status === 401 \|\| status === 403/);
  assert.match(gate, /STUDIO_BOOTSTRAP_RECOVERY_V196/);
  assert.match(gate, /studioBootstrapRecoveryV196/);
});

test("v196 never turns a temporary data problem into logout", () => {
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/);
  assert.doesNotMatch(patch, /getVerifiedSession\(\{ force: true \}\)/);
  assert.match(gate, /Sesi login tetap tersimpan/);
});

test("service worker cache rotates without forced navigation", () => {
  assert.match(worker, /ngeblogging-app-v196-live-recovery-20260802/);
  assert.match(worker, /studio-bootstrap-live-recovery-cache-v196/);
  assert.match(worker, /STUDIO_BOOTSTRAP_LIVE_RECOVERY_RELEASE_V196/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
});

test("production gate must reject the old WHITE-R4 route and require v196", () => {
  assert.match(workflow, /WHITE-R4-2026\.07\.12/);
  assert.match(workflow, /\/release-v196\.json/);
  assert.match(workflow, /studio-bootstrap-live-recovery-v196-20260802/);
});

test("v196 release stays factual and preserves requested product scope", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.authentication.persistSession, true);
  assert.equal(release.authentication.autoRefreshToken, true);
  assert.equal(release.authentication.transientNetworkFailureDoesNotLogout, true);
  assert.equal(release.studioBootstrap.automaticRecovery, true);
  assert.equal(release.studioBootstrap.recoveryRefreshesTokenOnlyAfter401Or403, true);
  assert.equal(release.productionRoute.legacyWorkerMarkerRejected, "WHITE-R4-2026.07.12");
  assert.equal(release.preserved.postsPagesWordLimit, 5000);
  assert.equal(release.preserved.themeMinimum, 100);
  assert.equal(release.validation.databaseMembershipOrphansObserved, 0);
  assert.equal(release.validation.massCapacityClaimed, false);
  assert.equal(release.validation.realDeviceVerificationRequiredBefore100PercentClaim, true);
});
