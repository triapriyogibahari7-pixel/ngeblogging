import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const worker = read("cloudflare/worker-v69.mjs");
const release = JSON.parse(read("public/release-v163.json"));

const historicalRoutes = ["ngeblogging.com/*", "www.ngeblogging.com/*", "*.ngeblogging.com/*"];

test("v163 remains recorded as the explicit zone-route compatibility release", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, "2026.07.30-production-route-authority-v163");
  assert.equal(release.routeAuthority, "cloudflare-zone-route-v163");
  assert.deepEqual(release.routePatterns, historicalRoutes);
  assert.equal(release.apexRouteExplicit, true);
  assert.equal(release.wwwRouteExplicit, true);
  assert.equal(release.tenantWildcardPreserved, true);
  assert.equal(release.legacyWhiteR4, false);
});

test("v164 Worker preserves v163 markers for diagnostics without making v163 current authority", () => {
  for (const marker of [
    "2026.07.30-production-route-authority-v163",
    "ngeblogging-production-route-v163",
    "/release-v163.json",
  ]) assert.ok(worker.includes(marker), `worker missing v163 compatibility marker ${marker}`);

  assert.ok(worker.includes("2026.07.30-production-custom-domain-authority-v164"));
  assert.ok(worker.includes("cloudflare-custom-domain-v164"));
  assert.ok(worker.includes("worker-v69-custom-domain-v164"));
  assert.doesNotMatch(worker, /WHITE-R4-2026\.07\.12/);
});

test("all critical React shell routes remain protected after the v164 routing migration", () => {
  for (const route of ["/login", "/signup", "/auth/callback", "/studio", "/dashboard", "/workspace"]) {
    assert.ok(worker.includes(`"${route}"`), `worker shell route missing ${route}`);
  }
});
