import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const chain = read("scripts/patch-service-worker-v179.mjs");
const primer = read("scripts/patch-studio-persisted-session-v198-primer.mjs");
const patch = read("scripts/patch-studio-persisted-session-v198.mjs");
const gate = read("src/StudioOnboardingGate.jsx");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v198.json"));

const RELEASE = "studio-persisted-session-recovery-v198-20260802";

test("v198 primer runs before stable v195 and finalizer runs after v197", () => {
  assert.match(chain, /patch-studio-persisted-session-v198-primer\.mjs/);
  assert.match(chain, /patch-studio-bootstrap-v195\.mjs/);
  assert.match(chain, /patch-studio-session-race-v197\.mjs/);
  assert.match(chain, /patch-studio-persisted-session-v198\.mjs/);
  assert.ok(chain.indexOf("patch-studio-persisted-session-v198-primer.mjs") < chain.indexOf("patch-studio-bootstrap-v195.mjs"));
  assert.ok(chain.indexOf("patch-studio-session-race-v197.mjs") < chain.indexOf("patch-studio-persisted-session-v198.mjs"));
});

test("Studio reads only the current Supabase project persisted auth key before waiting on the client lock", () => {
  assert.match(primer, /function supabaseProjectRefV198/);
  assert.match(gate, /function readPersistedSupabaseSessionV198/);
  assert.match(gate, /sb-\$\{projectRef\}-auth-token/);
  assert.match(gate, /persisted\.user\?\.id !== userId/);
  assert.match(gate, /persisted-storage-v198/);
  assert.match(gate, /persisted-storage-first/);
  const localStart = gate.indexOf("async function readLocalStudioSessionV195");
  const localEnd = gate.indexOf("\n}\n", localStart);
  const localBody = gate.slice(localStart, localEnd + 3);
  const persistedIndex = localBody.indexOf("readPersistedSupabaseSessionV198(userId)");
  const clientIndex = localBody.indexOf("supabase.auth.getSession()");
  assert.ok(persistedIndex >= 0);
  assert.ok(clientIndex > persistedIndex);
});

test("v198 preserves direct user bearer RLS, v197 single-flight, onboarding and all non-destructive session rules", () => {
  assert.match(gate, /listUserSitesDirectV192/);
  assert.match(gate, /studioMembershipSingleFlightV197/);
  assert.match(gate, /studioRecoverySingleFlightV197/);
  assert.match(gate, /FirstSiteOnboarding/);
  assert.match(gate, /newer-local-token-reused/);
  assert.doesNotMatch(gate, /service_role|SUPABASE_SERVICE_ROLE/);
  assert.doesNotMatch(gate, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/);
  assert.doesNotMatch(primer, /service_role|SUPABASE_SERVICE_ROLE/);
  assert.doesNotMatch(patch, /service_role|SUPABASE_SERVICE_ROLE/);
});

test("service worker rotates to v198 while retaining v197 evidence and never forcing navigation", () => {
  assert.match(worker, /ngeblogging-app-v198-persisted-session-20260802/);
  assert.match(worker, /studio-persisted-session-cache-v198/);
  assert.match(worker, /STUDIO_PERSISTED_SESSION_RELEASE_V198/);
  assert.match(worker, /ngeblogging-app-v197-session-race-20260802/);
  assert.match(worker, /studio-session-race-cache-v197/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
});

test("v198 release stays factual and does not claim unsupported scale or physical verification", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.authentication.persistedSupabaseStorageReadBeforeClientLock, true);
  assert.equal(release.authentication.persistedSessionMustMatchStudioUser, true);
  assert.equal(release.authentication.transientNetworkFailureDoesNotLogout, true);
  assert.equal(release.studioBootstrap.membershipSingleFlightPerUserPreserved, true);
  assert.equal(release.productionRoute.legacyWorkerMarkerRejected, "WHITE-R4-2026.07.12");
  assert.equal(release.preserved.postsPagesWordLimit, 5000);
  assert.equal(release.preserved.themeMinimum, 100);
  assert.equal(release.evidence.massCapacityClaimed, false);
  assert.equal(release.evidence.physicalDeviceVerificationRequiredBefore100PercentClaim, true);
});
