import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const wrangler = JSON.parse(read("wrangler.jsonc"));
const production = JSON.parse(read("wrangler.production.jsonc"));
const worker = read("cloudflare/worker-v69.mjs");
const release = JSON.parse(read("public/release-v164.json"));

const activeConfigs = [wrangler, wrangler.env.production, production];
const patterns = ["ngeblogging.com", "www.ngeblogging.com", "*.ngeblogging.com/*"];

test("v164 Custom Domain contract remains published as historical compatibility", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, "2026.07.30-production-custom-domain-authority-v164");
  assert.equal(release.routeAuthority, "cloudflare-custom-domain-v164");
  assert.deepEqual(release.routePatterns, patterns);
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

test("active v172 restores exact Custom Domains without deleting v164 or v168 evidence", () => {
  for (const config of activeConfigs) {
    assert.equal(config.main, "./cloudflare/worker-v69.mjs");
    assert.equal(config.vars.APP_RELEASE, "2026.07.30-production-custom-domain-v172");
    assert.equal(config.vars.PRODUCTION_ROUTE_AUTHORITY, "cloudflare-custom-domain-authority-v172");
    assert.equal(config.vars.PRODUCTION_RECOVERY_RELEASE, "2026.07.30-production-route-recovery-v168");
    assert.deepEqual(config.routes.map((route) => route.pattern), patterns);
    assert.equal(config.routes[0].custom_domain, true);
    assert.equal(config.routes[1].custom_domain, true);
    assert.equal(config.routes[2].zone_name, "ngeblogging.com");
    assert.notEqual(config.routes[2].custom_domain, true);
  }
});

test("Worker keeps v164 and v168 compatibility while v172 is active", () => {
  for (const marker of [
    "2026.07.30-production-custom-domain-authority-v164",
    "ngeblogging-production-custom-domain-v164",
    "2026.07.30-production-route-recovery-v168",
    "ngeblogging-production-route-recovery-v168",
    "2026.07.30-production-custom-domain-v172",
    "ngeblogging-production-custom-domain-v172",
    "worker-v69-custom-domain-v172",
    "x-ngeblogging-production-authority",
    "x-ngeblogging-production-custom-domain",
    "/release-v164.json",
    "/release-v168.json",
    "/release-v172.json",
  ]) assert.ok(worker.includes(marker), `worker missing ${marker}`);
});

test("Custom Domain evolution does not regress auth editor six modes or explicit logout", () => {
  for (const marker of [
    "auth-callback-singleflight-v162-20260730",
    "pkceSingleFlight: true",
    "callbackProcessors: 1",
    "emailPasswordSessionHandoff: true",
    "sessionPersistsUntilExplicitLogout: true",
    "wordLimit: 5000",
    '["application", "phone", "mobile", "compact", "tablet", "desktop"]',
    "mobile-public-v171-20260730",
    "legacyWhiteR4: false",
  ]) assert.ok(worker.includes(marker), `worker missing protected contract ${marker}`);
});
