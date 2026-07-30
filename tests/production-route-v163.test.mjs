import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const wrangler = JSON.parse(read("wrangler.jsonc"));
const production = JSON.parse(read("wrangler.production.jsonc"));
const worker = read("cloudflare/worker-v69.mjs");
const netlify = read("scripts/write-netlify-redirects.mjs");
const release = JSON.parse(read("public/release-v163.json"));

const expectedRoutes = ["ngeblogging.com/*", "www.ngeblogging.com/*", "*.ngeblogging.com/*"];
const configs = [wrangler, wrangler.env.production, production];

test("v163 replaces Custom Domains with explicit zone routes on all deploy configs", () => {
  for (const config of configs) {
    assert.equal(config.main, "./cloudflare/worker-v69.mjs");
    assert.equal(config.vars.APP_RELEASE, "2026.07.30-production-route-authority-v163");
    assert.equal(config.vars.PRODUCTION_ROUTE_AUTHORITY, "cloudflare-zone-route-v163");
    assert.equal(config.vars.CUSTOM_DOMAIN_PROVIDER, "cloudflare-worker-zone-route-v163");
    assert.deepEqual(config.routes.map((route) => route.pattern), expectedRoutes);
    for (const route of config.routes) {
      assert.equal(route.zone_name, "ngeblogging.com");
      assert.equal(route.custom_domain, undefined);
    }
  }
});

test("specific apex and www routes precede the tenant wildcard", () => {
  for (const config of configs) {
    assert.equal(config.routes[0].pattern, "ngeblogging.com/*");
    assert.equal(config.routes[1].pattern, "www.ngeblogging.com/*");
    assert.equal(config.routes[2].pattern, "*.ngeblogging.com/*");
  }
});

test("Worker publishes route authority marker on root auth Studio and release probes", () => {
  for (const marker of [
    "2026.07.30-production-route-authority-v163",
    "cloudflare-zone-route-v163",
    "worker-v69-zone-route",
    "ngeblogging-production-route-v163",
    "x-ngeblogging-production-route",
    "/release-v163.json",
    "legacyWhiteR4: false",
  ]) assert.ok(worker.includes(marker), `worker missing ${marker}`);
  for (const route of ["/login", "/signup", "/auth/callback", "/studio", "/dashboard", "/workspace"]) {
    assert.ok(worker.includes(`"${route}"`), `worker shell route missing ${route}`);
  }
  assert.doesNotMatch(worker, /WHITE-R4-2026\.07\.12/);
});

test("static probe truthfully describes the v163 takeover contract", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, "2026.07.30-production-route-authority-v163");
  assert.equal(release.routeAuthority, "cloudflare-zone-route-v163");
  assert.deepEqual(release.routePatterns, expectedRoutes);
  for (const key of [
    "apexRouteExplicit", "wwwRouteExplicit", "tenantWildcardPreserved",
    "customDomainPreemptionRemoved", "rootUsesReactShell", "authUsesReactShell",
    "studioUsesReactShell", "apiDelegated",
  ]) assert.equal(release[key], true, `${key} must be enabled`);
  assert.equal(release.legacyWhiteR4, false);
});

test("Netlify fallback exposes the same route release marker without pretending to own Cloudflare DNS", () => {
  for (const marker of [
    "2026.07.30-production-route-authority-v163",
    "release-v163.json",
    "ngeblogging-production-route-v163",
    "X-Ngeblogging-Production-Route",
    "netlify-fallback-v163",
  ]) assert.ok(netlify.includes(marker), `Netlify fallback missing ${marker}`);
});
