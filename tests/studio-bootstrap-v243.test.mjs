import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const chain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-studio-bootstrap-v243.mjs");
const studio = read("src/StudioNext.jsx");
const gate = read("src/StudioOnboardingGate.jsx");
const fastGate = read("src/StudioFastGate.jsx");
const auth = read("src/lib/supabase.js");
const vite = read("vite.config.js");
const swLib = read("scripts/service-worker-v243-lib.mjs");
const release = JSON.parse(read("public/release-v243.json"));

const RELEASE = "studio-bootstrap-resilience-v243-20260803";

test("v243 runs only after historical source authority v237", () => {
  const v237 = chain.indexOf('await import("./patch-production-v237.mjs")');
  const v243 = chain.indexOf('await import("./patch-studio-bootstrap-v243.mjs")');
  assert.ok(v237 >= 0);
  assert.ok(v243 > v237);
});

test("Studio bootstrap bridges the user-scoped v195/v192 snapshot before legacy snapshots", () => {
  assert.match(studio, /function readActiveSiteSnapshotV243\(userId\)/);
  assert.match(studio, /ngeblogging-active-site-snapshot-v243/);
  assert.match(studio, /ngeblogging-active-site-snapshot-v195/);
  assert.match(studio, /ngeblogging-active-site-snapshot-v192/);
  assert.match(studio, /cached\.__userId !== userId/);
  assert.match(studio, /readActiveSiteSnapshotV243\(user\.id\) \|\| readActiveSiteSnapshotV186\(\)/);
  assert.match(studio, /rememberActiveSiteV243\(primary, user\.id\)/);
  assert.match(studio, /cached-workspace-retained/);
});

test("v243 keeps the existing resilient v186 retry and does not recreate sites automatically", () => {
  assert.match(studio, /studio-bootstrap-resilient-v186/);
  assert.match(studio, /window\.addEventListener\("online", reconnect/);
  assert.doesNotMatch(studio, /getOrCreatePrimarySite/);
  assert.match(patch, /V243_AUTOMATIC_SITE_CREATION_REINTRODUCED/);
});

test("login remains session-first and transient workspace data cannot clear the session", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(gate, /readLocalStudioSessionV195/);
  assert.match(gate, /session-first-cache-v195/);
  assert.match(fastGate, /ngeblogging-active-site-snapshot-v195/);
  for (const source of [patch, studio, swLib]) {
    assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/);
  }
});

test("v243 rotates the PWA shell after v242 without forced auth navigation", () => {
  assert.match(vite, /finalizeServiceWorkerV242/);
  assert.match(vite, /finalizeServiceWorkerV243/);
  assert.ok(vite.indexOf("finalizeServiceWorkerV243();") > vite.indexOf("finalizeServiceWorkerV242();"));
  assert.match(swLib, /ngeblogging-app-v243-bootstrap-resilience-20260803/);
  assert.match(swLib, /studio-bootstrap-resilience-cache-v243/);
  assert.match(swLib, /V243_AUTH_SURFACE_GUARD_MISSING/);
  assert.match(swLib, /V243_FORCED_NAVIGATION_REMAINS/);
});

test("release claims stay bounded to what build and device testing can prove", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.authentication.persistSessionPreserved, true);
  assert.equal(release.authentication.automaticLogoutOnNetworkFailure, false);
  assert.equal(release.studioBootstrap.userScopedCachePreferred, true);
  assert.equal(release.studioBootstrap.automaticSiteCreation, false);
  assert.equal(release.studioBootstrap.newUserOnboardingPreserved, true);
  assert.equal(release.preserved.themeMinimum, 100);
  assert.equal(release.preserved.widgetCount, 26);
  assert.equal(release.validation.massLoginCapacityClaimed, false);
  assert.equal(release.validation.physicalProviderLoginRequiredBeforeHundredPercentClaim, true);
});
