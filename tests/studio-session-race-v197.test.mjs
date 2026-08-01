import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const chain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-studio-session-race-v197.mjs");
const auth = read("src/lib/auth-session-v76.js");
const gate = read("src/StudioOnboardingGate.jsx");
const worker = read("public/sw.js");
const workflow = read(".github/workflows/cloudflare-token-diagnostic.yml");
const release = JSON.parse(read("public/release-v197.json"));

const RELEASE = "studio-session-race-recovery-v197-20260802";

test("v197 is chained after the complete v196 recovery authority", () => {
  assert.match(chain, /patch-studio-bootstrap-v196\.mjs/);
  assert.match(chain, /patch-studio-bootstrap-v196-compat\.mjs/);
  assert.match(chain, /patch-studio-session-race-v197\.mjs/);
  assert.ok(chain.indexOf("patch-studio-bootstrap-v196-compat.mjs") < chain.indexOf("patch-studio-session-race-v197.mjs"));
});

test("forced auth verification is single-flight instead of spawning token rotation races", () => {
  assert.match(auth, /AUTH_SESSION_RACE_RELEASE_V197/);
  assert.match(auth, /if \(verificationPromise\) return verificationPromise/);
  const functionStart = auth.indexOf("export function getVerifiedSession");
  const functionEnd = auth.indexOf("\n}\n", functionStart);
  const body = auth.slice(functionStart, functionEnd + 3);
  assert.ok(body.indexOf("if (verificationPromise) return verificationPromise") < body.indexOf("if (!force && window.__ngebloggingVerifiedSession"));
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/);
});

test("a stale 401 reuses a newer persisted token before any additional remote refresh", () => {
  assert.match(gate, /rotated-local-session-v197/);
  assert.match(gate, /currentSession\.access_token !== rejectedToken/);
  assert.match(gate, /newer-local-token-reused/);
  assert.match(gate, /single-flight-remote-verification/);
  assert.match(gate, /\? accessToken : ""/);
  assert.match(gate, /refreshRejectedSessionV195\(rejectedToken\)/);
  assert.match(gate, /refreshRejectedSessionV195\(rejected\)/);
});

test("initial membership bootstrap and automatic recovery each have one promise per user", () => {
  assert.match(gate, /loadStudioMembershipAttemptV197/);
  assert.match(gate, /studioMembershipPromiseV197/);
  assert.match(gate, /studioMembershipUserV197 === userId/);
  assert.match(gate, /studioMembershipSingleFlightV197 = "joined"/);
  assert.match(gate, /recoverStudioMembershipAttemptV197/);
  assert.match(gate, /studioRecoveryPromiseV197/);
  assert.match(gate, /studioRecoveryUserV197 === userId/);
  assert.match(gate, /studioRecoverySingleFlightV197 = "joined"/);
});

test("v197 keeps the existing user-token RLS, fallback, onboarding and non-destructive session policy", () => {
  assert.match(gate, /listUserSitesDirectV192/);
  assert.match(gate, /listUserSites\(userId\)/);
  assert.match(gate, /FirstSiteOnboarding/);
  assert.doesNotMatch(gate, /service_role|SUPABASE_SERVICE_ROLE/);
  assert.doesNotMatch(gate, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/);
});

test("service worker rotates to v197 while keeping v196 compatibility evidence and never forces navigation", () => {
  assert.match(worker, /ngeblogging-app-v197-session-race-20260802/);
  assert.match(worker, /studio-session-race-cache-v197/);
  assert.match(worker, /STUDIO_SESSION_RACE_RELEASE_V197/);
  assert.match(worker, /ngeblogging-app-v196-live-recovery-20260802/);
  assert.match(worker, /studio-bootstrap-live-recovery-cache-v196/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
});

test("production workflow must prove v197 on workers.dev and reject WHITE-R4 on apex", () => {
  assert.match(workflow, /\/release-v197\.json/);
  assert.match(workflow, /studio-session-race-recovery-v197-20260802/);
  assert.match(workflow, /WHITE-R4-2026\.07\.12/);
  assert.match(workflow, /WORKERS_DEV_V197_VERIFIED/);
});

test("v197 metadata is factual and does not claim unsupported mass capacity", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.authentication.forcedVerificationSingleFlight, true);
  assert.equal(release.authentication.newerLocalTokenReusedAfterStale401, true);
  assert.equal(release.studioBootstrap.membershipSingleFlightPerUser, true);
  assert.equal(release.studioBootstrap.recoverySingleFlightPerUser, true);
  assert.equal(release.productionRoute.legacyWorkerMarkerRejected, "WHITE-R4-2026.07.12");
  assert.equal(release.preserved.postsPagesWordLimit, 5000);
  assert.equal(release.preserved.themeMinimum, 100);
  assert.equal(release.evidence.massCapacityClaimed, false);
  assert.equal(release.evidence.physicalDeviceVerificationRequiredBefore100PercentClaim, true);
});
