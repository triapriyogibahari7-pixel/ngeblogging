import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const wrangler = JSON.parse(read("wrangler.jsonc"));
const production = JSON.parse(read("wrangler.production.jsonc"));
const worker = read("cloudflare/worker-v69.mjs");
const release = JSON.parse(read("public/release-v164.json"));

const configs = [wrangler, wrangler.env.production, production];
const expectedPatterns = ["ngeblogging.com", "www.ngeblogging.com", "*.ngeblogging.com/*"];

function assertProductionAuthority(config) {
  assert.equal(config.main, "./cloudflare/worker-v69.mjs");
  assert.equal(config.vars.APP_RELEASE, "2026.07.30-production-custom-domain-authority-v164");
  assert.equal(config.vars.PRODUCTION_ROUTE_AUTHORITY, "cloudflare-custom-domain-v164");
  assert.equal(config.vars.CUSTOM_DOMAIN_PROVIDER, "cloudflare-worker-custom-domain-v164");
  assert.deepEqual(config.routes.map((route) => route.pattern), expectedPatterns);

  assert.equal(config.routes[0].custom_domain, true);
  assert.equal(config.routes[0].zone_name, undefined);
  assert.equal(config.routes[1].custom_domain, true);
  assert.equal(config.routes[1].zone_name, undefined);
  assert.equal(config.routes[2].custom_domain, undefined);
  assert.equal(config.routes[2].zone_name, "ngeblogging.com");
}

test("v164 makes the current Worker the exact origin for apex and www", () => {
  for (const config of configs) assertProductionAuthority(config);
});

test("v164 preserves tenant wildcard routing without pretending wildcard Custom Domains exist", () => {
  for (const config of configs) {
    assert.equal(config.routes[2].pattern, "*.ngeblogging.com/*");
    assert.equal(config.routes[2].zone_name, "ngeblogging.com");
    assert.notEqual(config.routes[2].custom_domain, true);
  }
});

test("Worker and release probe expose the same production authority contract", () => {
  for (const marker of [
    "2026.07.30-production-custom-domain-authority-v164",
    "cloudflare-custom-domain-v164",
    "worker-v69-custom-domain-v164",
    "ngeblogging-production-custom-domain-v164",
    "x-ngeblogging-production-authority",
    "/release-v164.json",
  ]) assert.ok(worker.includes(marker), `worker missing ${marker}`);

  assert.equal(release.status, "ok");
  assert.equal(release.release, "2026.07.30-production-custom-domain-authority-v164");
  assert.equal(release.routeAuthority, "cloudflare-custom-domain-v164");
  assert.deepEqual(release.routePatterns, expectedPatterns);
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

test("v164 does not regress auth callback, editor, six modes, or explicit logout contracts", () => {
  for (const marker of [
    "auth-callback-singleflight-v162-20260730",
    "pkceSingleFlight: true",
    "callbackProcessors: 1",
    "emailPasswordSessionHandoff: true",
    "wordLimit: 5000",
    '["application", "phone", "mobile", "compact", "tablet", "desktop"]',
    "legacyWhiteR4: false",
  ]) assert.ok(worker.includes(marker), `worker missing protected contract ${marker}`);
});
