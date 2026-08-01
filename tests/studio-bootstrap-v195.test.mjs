import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const gate = read("src/StudioOnboardingGate.jsx");
const fastGate = read("src/StudioFastGate.jsx");
const auth = read("src/lib/auth-session-v76.js");
const supabase = read("src/lib/supabase.js");
const worker = read("public/sw.js");
const chain = read("scripts/patch-service-worker-v179.mjs");
const release = JSON.parse(read("public/release-v195.json"));

const RELEASE = "studio-bootstrap-session-first-v195-20260801";

test("v195 is chained after v194, repairs active-site publication, then applies compatibility guard", () => {
  assert.match(chain, /patch-studio-nara-theme-v194\.mjs/);
  assert.match(chain, /patch-studio-bootstrap-v195-publish-fix\.mjs/);
  assert.match(chain, /patch-studio-bootstrap-v195\.mjs/);
  assert.match(chain, /patch-studio-bootstrap-v195-compat\.mjs/);
  assert.ok(chain.indexOf("patch-studio-nara-theme-v194.mjs") < chain.indexOf("patch-studio-bootstrap-v195-publish-fix.mjs"));
  assert.ok(chain.indexOf("patch-studio-bootstrap-v195-publish-fix.mjs") < chain.indexOf("patch-studio-bootstrap-v195.mjs"));
  assert.ok(chain.indexOf("patch-studio-bootstrap-v195.mjs") < chain.indexOf("patch-studio-bootstrap-v195-compat.mjs"));
});

test("Studio startup reads the persisted browser session before conditional network verification", () => {
  assert.match(gate, /readLocalStudioSessionV195/);
  assert.match(gate, /supabase\.auth\.getSession\(\)/);
  assert.match(gate, /local-session-first-v195/);
  assert.match(gate, /async function refreshRejectedSessionV195/);
  assert.match(gate, /getVerifiedSession\(\{ force: attempt > 0 \}\)/);
  const start = gate.indexOf("async function loadStudioMembership(userId)");
  const end = gate.indexOf("\n}\n", start);
  const body = gate.slice(start, end + 3);
  assert.ok(body.indexOf("readLocalStudioSessionV195") >= 0);
  assert.ok(body.indexOf("refreshRejectedSessionV195(rejectedToken)") > body.indexOf("readLocalStudioSessionV195"));
  assert.doesNotMatch(gate, /getVerifiedSession\(\{ force: true \}\)/);
  assert.match(supabase, /persistSession: true/);
  assert.match(supabase, /autoRefreshToken: true/);
});

test("critical membership read remains user-token RLS and refreshes only after rejection", () => {
  assert.match(gate, /listUserSitesDirectV192\(userId, accessToken\)/);
  assert.match(gate, /studioMembershipTransportV195 = "direct-supabase-rls"/);
  assert.match(gate, /studioMembershipTransportV192 = "client-gateway-fallback"/);
  assert.match(gate, /directStatus === 401 \|\| directStatus === 403/);
  assert.match(gate, /refreshRejectedSessionV195\(rejectedToken\)/);
  assert.match(gate, /supabase-client-fallback/);
  assert.doesNotMatch(gate, /service_role|SUPABASE_SERVICE_ROLE/);
});

test("active-site publication actually writes the user-scoped v192 and v195 snapshots", () => {
  assert.match(gate, /function publishActiveSite\(site, userId = ""\)/);
  assert.match(gate, /rememberActiveSiteV192\(site, userId\);/);
  assert.match(gate, /rememberActiveSiteV195\(site, userId\);/);
  const publishStart = gate.indexOf('function publishActiveSite(site, userId = "")');
  const publishEnd = gate.indexOf("\n}\n", publishStart);
  const publishBody = gate.slice(publishStart, publishEnd + 3);
  assert.ok(publishBody.indexOf("rememberActiveSiteV192(site, userId);") >= 0);
  assert.ok(publishBody.indexOf("rememberActiveSiteV195(site, userId);") > publishBody.indexOf("rememberActiveSiteV192(site, userId);"));
});

test("fast resume cache is bound to the authenticated user", () => {
  assert.match(gate, /ACTIVE_SITE_SNAPSHOT_V195/);
  assert.match(gate, /cached\?\.__userId === userId/);
  assert.match(gate, /rememberActiveSiteV195/);
  assert.match(gate, /session-first-cache-v195/);
  assert.match(fastGate, /ngeblogging-active-site-snapshot-v195/);
});

test("transient bootstrap failures cannot clear or sign out the session", () => {
  assert.doesNotMatch(gate, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/);
  assert.doesNotMatch(worker, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.match(auth, /retainSessionDuringNetworkFailure/);
  assert.match(gate, /Sesi login tetap disimpan dan tidak ada logout otomatis/);
});

test("v195 rotates service worker cache without forced navigation", () => {
  assert.match(worker, /ngeblogging-app-v195-session-first-20260801/);
  assert.match(worker, /studio-bootstrap-session-first-cache-v195/);
  assert.match(worker, /STUDIO_BOOTSTRAP_SESSION_FIRST_RELEASE_V195/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
});

test("release metadata is factual and preserves requested platform scope", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.authentication.localSessionFirst, true);
  assert.equal(release.authentication.remoteVerificationOnlyAfterTokenRejection, true);
  assert.equal(release.studioBootstrap.cachedResumeRequiresMatchingUser, true);
  assert.equal(release.studioBootstrap.newUserOnboardingPreserved, true);
  assert.equal(release.preserved.postsPagesWordLimit, 5000);
  assert.equal(release.preserved.themeMinimum, 100);
  assert.equal(release.preserved.naraSmallMediumNonModal, true);
  assert.equal(release.evidence.massCapacityClaimed, false);
  assert.equal(release.evidence.physicalDeviceVerificationRequiredBefore100PercentClaim, true);
});