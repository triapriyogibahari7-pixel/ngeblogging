import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const wrangler = JSON.parse(read("wrangler.jsonc"));
const production = JSON.parse(read("wrangler.production.jsonc"));
const worker = read("cloudflare/worker-v69.mjs");
const release = JSON.parse(read("public/release-v164.json"));

const activeConfigs = [wrangler, wrangler.env.production, production];
const historicalPatterns = ["ngeblogging.com", "www.ngeblogging.com", "*.ngeblogging.com/*"];
const recoveryPatterns = ["ngeblogging.com/*", "www.ngeblogging.com/*", "*.ngeblogging.com/*"];

test("v164 Custom Domain contract remains published as historical compatibility", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, "2026.07.30-production-custom-domain-authority-v164");
  assert.equal(release.routeAuthority, "cloudflare-custom-domain-v164");
  assert.deepEqual(release.routePatterns, historicalPatterns);
  assert.deepEqual(release.exactCustomDomains, ["ngeblogging.com", "www.ngeblogging.com"]);
  assert.equal(release.tenantWildcardRoute, "*.ngeblogging.com/*");
  assert.equal(release.apexCustomDomain, true);
  assert.equal(release.wwwCustomDomain, true);
  assert.equal(release.tenantWildcardPreserved, true);
  assert.equal(release.rootUsesReactShell, true);
  assert.equal(release.authUsesReactShell, true);
  assert.equal(release.studioUsesReactShell, true);
  assert.equal(release.legacyWhiteR4, false);
});

test("active production may recover through v168 routes without deleting v164 evidence", () => {
  for (const config of activeConfigs) {
    assert.equal(config.main, "./cloudflare/worker-v69.mjs");
    assert.equal(config.vars.APP_RELEASE, "2026.07.30-production-route-recovery-v168");
    assert.equal(config.vars.PRODUCTION_ROUTE_AUTHORITY, "cloudflare-route-takeover-v168");
    assert.deepEqual(config.routes.map((route) => route.pattern), recoveryPatterns);
    for (const route of config.routes) {
      assert.equal(route.zone_name, "ngeblogging.com");
      assert.notEqual(route.custom_domain, true);
    }
  }
});

test("Worker keeps v164 markers while v168 becomes the active authority", () => {
  for (const marker of [
    "2026.07.30-production-custom-domain-authority-v164",
    "ngeblogging-production-custom-domain-v164",
    "2026.07.30-production-route-recovery-v168",
    "cloudflare-route-takeover-v168",
    "worker-v69-route-recovery-v168",
    "x-ngeblogging-production-authority",
    "/release-v164.json",
    "/release-v168.json",
  ]) assert.ok(worker.includes(marker), `worker missing ${marker}`);
});

test("v164 compatibility does not regress auth callback editor six modes or explicit logout", () => {
  for (const marker of [
    "auth-callback-singleflight-v162-20260730",
    "pkceSingleFlight: true",
    "callbackProcessors: 1",
    "emailPasswordSessionHandoff: true",
    "sessionPersistsUntilExplicitLogout: true",
    "wordLimit: 5000",
    '["application", "phone", "mobile", "compact", "tablet", "desktop"]',
    "legacyWhiteR4: false",
  ]) assert.ok(worker.includes(marker), `worker missing protected contract ${marker}`);
});
