import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildCapacityReport,
  LOGICAL_USER_TARGET,
  modelBurst,
  modelDailyActivity,
} from "../scripts/auth-capacity-model-v162.mjs";
import {
  MAX_SAFE_CONCURRENCY,
  MAX_SAFE_REQUESTS,
  runSmoke,
  validateSmokePlan,
} from "../scripts/auth-smoke-load-v162.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const staticReport = JSON.parse(read("public/auth-capacity-v162.json"));
const visualization = read("public/auth-capacity-v162.html");

function withoutGeneratedAt(value) {
  const copy = structuredClone(value);
  delete copy.generatedAt;
  return copy;
}

test("900 juta miliar is modeled with BigInt and is never claimed as proven production capacity", () => {
  assert.equal(LOGICAL_USER_TARGET, 900_000_000_000_000_000n);
  const report = buildCapacityReport();
  assert.equal(report.status, "model-only");
  assert.equal(report.interpretation.logicalUsers, "900000000000000000");
  assert.match(report.warning, /tidak membuktikan infrastruktur produksi/i);
  assert.equal(report.safetyPolicy.realProviderPasswordsInCI, false);
  assert.equal(report.safetyPolicy.massAccountCreation, false);
  assert.equal(report.safetyPolicy.productionCredentialLoadTest, false);
  assert.deepEqual(withoutGeneratedAt(staticReport), withoutGeneratedAt(report));
});

test("daily activity model exposes the required rate and reference shard count", () => {
  const onePercent = modelDailyActivity({ numerator: 1, denominator: 100 });
  assert.equal(onePercent.activeUsers, "9000000000000000");
  assert.equal(onePercent.loginAttemptsPerSecondCeil, "104166666667");
  assert.equal(onePercent.authRequestsPerSecondCeil, "520833333335");
  assert.equal(onePercent.referenceShardsAt5000Rps, "104166667");
});

test("staged burst models remain mathematical simulations", () => {
  const staging = modelBurst({ virtualLogins: 10_000, concurrency: 500, latencyMs: 250 });
  assert.equal(staging.requests, "50000");
  assert.equal(staging.modeledRequestsPerSecond, "2000");
  assert.equal(staging.modeledDurationMs, "25000");
  assert.equal(staging.proof, "model-only");
});

test("public smoke harness has hard request, concurrency and path safety limits", () => {
  assert.equal(MAX_SAFE_REQUESTS, 200);
  assert.equal(MAX_SAFE_CONCURRENCY, 20);
  assert.throws(() => validateSmokePlan({ requests: 201, concurrency: 1 }), /1–200/);
  assert.throws(() => validateSmokePlan({ requests: 1, concurrency: 21 }), /1–20/);
  assert.throws(() => validateSmokePlan({ requests: 1, concurrency: 1, paths: ["/auth/v1/token"] }), /tidak diizinkan/);
});

test("smoke harness measures public GET responses without credentials or account creation", async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });
  };
  const result = await runSmoke({
    origin: "https://preview.example.test",
    requests: 14,
    concurrency: 4,
    fetchImpl: fakeFetch,
  });
  assert.equal(calls.length, 14);
  assert.equal(result.statuses[200], 14);
  assert.equal(result.failureRate, 0);
  assert.equal(result.credentialsUsed, false);
  assert.equal(result.accountsCreated, false);
  for (const call of calls) {
    assert.equal(call.options.method, "GET");
    assert.equal(call.options.headers.authorization, undefined);
    assert.equal(call.options.headers.cookie, undefined);
  }
});

test("capacity visualization is responsive and prominently labels the result as a model", () => {
  assert.match(visualization, /MODEL, BUKAN KLAIM PRODUKSI/);
  assert.match(visualization, /auth-capacity-v162\.json/);
  assert.match(visualization, /@media\(max-width:820px\)/);
  assert.match(visualization, /@media\(max-width:430px\)/);
  assert.match(visualization, /prefers-reduced-motion/);
  assert.match(visualization, /overflow-wrap:anywhere/);
});
