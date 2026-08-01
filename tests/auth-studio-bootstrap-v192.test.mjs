import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const callback = read("src/lib/auth-callback-v162.js");
const gate = read("src/StudioOnboardingGate.jsx");
const fastGate = read("src/StudioFastGate.jsx");
const supabase = read("src/lib/supabase.js");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v192.json"));

test("OAuth consumed-state replay recovers an already valid persisted session", () => {
  assert.match(callback, /recovered-provider-replay-v192/);
  assert.match(callback, /isConsumedCodeError\(oauthError\)/);
  assert.match(callback, /currentSession\(\)\.catch/);
  assert.match(callback, /replayRecovered: true/);
  assert.match(callback, /cleanCallbackUrl\(\{ success: true/);
});

test("Studio bootstrap does not force network auth verification on its first pass", () => {
  assert.match(gate, /getVerifiedSession\(\{ force: attempt > 0 \}\)/);
  assert.doesNotMatch(gate, /getVerifiedSession\(\{ force: true \}\)/);
  assert.match(supabase, /persistSession: true/);
  assert.match(supabase, /autoRefreshToken: true/);
});

test("critical membership bootstrap can bypass a stale same-origin Worker without bypassing RLS", () => {
  assert.match(gate, /listUserSitesDirectV192/);
  assert.match(gate, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(gate, /apikey: key/);
  assert.match(gate, /\/rest\/v1\/site_members/);
  assert.match(gate, /direct-supabase-rls/);
  assert.match(gate, /client-gateway-fallback/);
  assert.doesNotMatch(gate, /service_role|SUPABASE_SERVICE/);
});

test("successful active site is cached for future fast resume and online restores retry", () => {
  assert.match(gate, /ngeblogging-active-site-snapshot-v192/);
  assert.match(gate, /rememberActiveSiteV192/);
  assert.match(gate, /window\.addEventListener\("online", retryWhenOnline\)/);
  assert.match(fastGate, /ngeblogging-active-site-snapshot-v192/);
});

test("v192 service worker rotates cache without forced navigation or session destruction", () => {
  assert.match(worker, /ngeblogging-app-v192-auth-studio-bootstrap-20260801/);
  assert.match(worker, /auth-studio-bootstrap-cache-v192/);
  assert.match(worker, /AUTH_STUDIO_BOOTSTRAP_RELEASE_V192/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
  assert.doesNotMatch(worker, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("v192 release is factual and keeps feature/regression scope explicit", () => {
  assert.equal(release.release, "auth-studio-bootstrap-v192-20260801");
  assert.equal(release.authentication.oauthReplayRecovery, true);
  assert.equal(release.studioBootstrap.firstSessionCheckUsesCachedVerifiedSession, true);
  assert.equal(release.studioBootstrap.criticalMembershipTransport, "direct Supabase REST with user bearer token and RLS");
  assert.equal(release.serviceWorker.forcedNavigation, false);
  assert.equal(release.evidence.massCapacityClaimed, false);
  assert.equal(release.evidence.physicalDeviceVerificationRequiredBefore100PercentClaim, true);
  assert.equal(release.preserved.postsPagesWordLimit, 5000);
  assert.equal(release.preserved.naraSmallMediumNonModal, true);
});
