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

test("v172 Worker preserves v163 through v169 markers for diagnostics", () => {
  for (const marker of [
    "2026.07.30-production-route-authority-v163",
    "ngeblogging-production-route-v163",
    "/release-v163.json",
    "2026.07.30-production-custom-domain-authority-v164",
    "ngeblogging-production-custom-domain-v164",
    "2026.07.30-production-domain-attach-v165",
    "ngeblogging-production-domain-attach-v165",
    "2026.07.30-production-route-recovery-v168",
    "ngeblogging-production-route-recovery-v168",
    "first-site-onboarding-v169-20260730",
    "2026.07.30-production-custom-domain-v172",
    "worker-v69-custom-domain-v172",
  ]) assert.ok(worker.includes(marker), `worker missing compatibility marker ${marker}`);
  assert.doesNotMatch(worker, /WHITE-R4-2026\.07\.12/);
});

test("all critical React shell routes remain protected under v172", () => {
  for (const route of ["/login", "/signup", "/auth/callback", "/studio", "/dashboard", "/workspace"]) {
    assert.ok(worker.includes(`"${route}"`), `worker shell route missing ${route}`);
  }
  assert.ok(worker.includes("ngeblogging-mobile-public-v171"));
  assert.ok(worker.includes("ngeblogging-production-custom-domain-v172"));
});
