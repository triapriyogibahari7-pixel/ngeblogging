import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const wrangler = JSON.parse(read("wrangler.jsonc"));
const production = JSON.parse(read("wrangler.production.jsonc"));
const worker = read("cloudflare/worker-v69.mjs");
const workflow = read(".github/workflows/deploy-production.yml");
const serviceWorker = read("public/sw.js");
const release = JSON.parse(read("public/release-v168.json"));

const RELEASE = "2026.07.30-production-route-recovery-v168";
const AUTHORITY = "cloudflare-route-takeover-v168";
const ROUTES = ["ngeblogging.com/*", "www.ngeblogging.com/*", "*.ngeblogging.com/*"];
const configs = [wrangler, wrangler.env.production, production];

test("v168 takes over apex and www with explicit Worker routes while preserving tenant wildcard", () => {
  for (const config of configs) {
    assert.equal(config.main, "./cloudflare/worker-v69.mjs");
    assert.equal(config.vars.APP_RELEASE, RELEASE);
    assert.equal(config.vars.PRODUCTION_ROUTE_AUTHORITY, AUTHORITY);
    assert.deepEqual(config.routes.map((route) => route.pattern), ROUTES);
    for (const route of config.routes) {
      assert.equal(route.zone_name, "ngeblogging.com");
      assert.notEqual(route.custom_domain, true);
    }
  }
});

test("v168 Worker serves the React shell and release probe on system routes", () => {
  for (const marker of [
    RELEASE,
    AUTHORITY,
    "worker-v69-route-recovery-v168",
    "/release-v168.json",
    "ngeblogging-production-route-recovery-v168",
    "x-ngeblogging-production-recovery",
    "auth-callback-singleflight-v162-20260730",
    "sessionPersistsUntilExplicitLogout: true",
    "wordLimit: 5000",
    "legacyWhiteR4: false",
  ]) assert.ok(worker.includes(marker), `worker missing ${marker}`);
  assert.ok(worker.includes('responsiveFamilies: ["application", "phone", "mobile", "compact", "tablet", "desktop"]'));
  assert.ok(worker.includes('desktopVariants: ["laptop", "computer"]'));
});

test("v168 workflow deploys route config directly and verifies all login surfaces", () => {
  for (const marker of [
    "Deploy Ngeblogging Production v168",
    "npm run test:production",
    "npm run cloudflare:dry-run",
    "npm run deploy:cloudflare",
    "/release-v168.json",
    "DEPLOY_VERIFY_PRODUCTION_ROUTE_RECOVERY_V168_FAILED",
    "WHITE-R4-2026.07.12",
    "x-ngeblogging-production-recovery",
    "issue_number: 243",
  ]) assert.ok(workflow.includes(marker), `workflow missing ${marker}`);
  assert.ok(!workflow.includes("npm run cloudflare:attach-domains"));
});

test("v168 release is factual and keeps protected platform contracts", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, RELEASE);
  assert.equal(release.routeAuthority, AUTHORITY);
  assert.deepEqual(release.routePatterns, ROUTES);
  assert.equal(release.apexRouteTakeover, true);
  assert.equal(release.wwwRouteTakeover, true);
  assert.equal(release.tenantWildcardPreserved, true);
  assert.equal(release.reactShell, true);
  assert.equal(release.pkceSingleFlight, true);
  assert.equal(release.sessionPersistsUntilExplicitLogout, true);
  assert.equal(release.wordLimit, 5000);
  assert.equal(release.legacyWhiteR4, false);
});

test("service worker cache is bumped for route recovery and auth pages stay network-first", () => {
  assert.ok(serviceWorker.includes("ngeblogging-app-v168-route-recovery-20260730"));
  assert.ok(serviceWorker.includes("route-recovery-cache-v168"));
  assert.ok(serviceWorker.includes('url.pathname === "/login"'));
  assert.ok(serviceWorker.includes('url.pathname.startsWith("/auth/")'));
  assert.ok(serviceWorker.includes("networkFirst(request"));
});
