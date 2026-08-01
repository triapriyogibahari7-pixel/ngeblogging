import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const gate = read("src/StudioOnboardingGate.jsx");
const patch = read("scripts/patch-production-v192.mjs");
const chain = read("scripts/patch-production-v191.mjs");
const auth = read("src/lib/supabase.js");
const dataGateway = read("server/data-gateway-v110.mjs");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v192.json"));

test("v192 runs after v191 and records a factual release", () => {
  assert.match(chain, /patch-production-v192\.mjs/);
  assert.match(patch, /studio-data-bootstrap-v192-20260801/);
  assert.equal(release.release, "studio-data-bootstrap-v192-20260801");
  assert.equal(release.repairs.membershipQueryIsCriticalPath, true);
  assert.equal(release.repairs.dataGatewayTimeoutFallsBackDirect, true);
  assert.equal(release.validation.massCapacityClaimed, false);
});

test("Studio membership is checked before remote auth re-verification", () => {
  const start = gate.indexOf("async function loadStudioMembership(userId)");
  const end = gate.indexOf("\n}\n", start);
  const membership = gate.slice(start, end);
  assert.ok(start >= 0, "membership function missing");
  assert.match(membership, /membership-first-cloud-ready/);
  assert.match(membership, /readMembership\(userId\)/);
  assert.match(membership, /listUserSites\(id\)/);
  assert.match(membership, /getVerifiedSession\(\{ force: false \}\)/);
  assert.ok(
    membership.indexOf("readMembership(userId)") < membership.indexOf("getVerifiedSession({ force: false })"),
    "remote verification must not block a successful membership query",
  );
  assert.doesNotMatch(membership, /getVerifiedSession\(\{ force: true \}\)/);
});

test("empty membership is rechecked after persisted-session recovery before onboarding", () => {
  assert.match(gate, /AUTH_SESSION_RECOVERY_PENDING/);
  assert.match(gate, /session-recovered-cloud-ready/);
  assert.match(gate, /verified-first-site-required/);
  assert.match(gate, /readMembership\(verified\.user\.id \|\| userId\)/);
});

test("transient failures retain cached workspace and never destroy login", () => {
  assert.match(gate, /cached-site-session-retained/);
  assert.match(gate, /cachedActiveSiteV186/);
  assert.match(gate, /retainedDuringNetworkFailure: true/);
  assert.doesNotMatch(gate, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(gate, /signOut\s*\(/);
  assert.match(auth, /persistSession: true/);
  assert.match(auth, /autoRefreshToken: true/);
});

test("Cloudflare data gateway is bounded while client direct fallback stays intact", () => {
  assert.match(dataGateway, /UPSTREAM_TIMEOUT_MS_V192 = 2_500/);
  assert.match(dataGateway, /DATA_UPSTREAM_TIMEOUT/);
  assert.match(dataGateway, /controller\.abort\("ngeblogging-data-upstream-timeout-v192"\)/);
  assert.match(dataGateway, /signal:\s*controller\.signal/);
  assert.match(auth, /return nativeFetch\(directInput, init\)/);
});

test("startup is bounded and does not loop forever", () => {
  assert.match(gate, /MEMBERSHIP_TIMEOUT_V192 = 8_000/);
  assert.match(gate, /AUTH_RECOVERY_TIMEOUT_V192 = 6_000/);
  assert.match(gate, /attempt < 2/);
  assert.match(gate, /setPhase\("error"\)/);
  assert.match(gate, /onRetry=\{\(\) => setRun/);
});

test("v192 service worker rotates cache without forced navigation", () => {
  assert.match(worker, /ngeblogging-app-v192-data-bootstrap-20260801/);
  assert.match(worker, /data-bootstrap-cache-v192/);
  assert.match(worker, /DATA_BOOTSTRAP_RELEASE_V192/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
});
