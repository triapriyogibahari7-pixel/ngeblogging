import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const wrangler = JSON.parse(read("wrangler.jsonc"));
const production = JSON.parse(read("wrangler.production.jsonc"));
const worker = read("cloudflare/worker-v69.mjs");
const workflow = read(".github/workflows/cloudflare-token-diagnostic.yml");
const finalizer = read("scripts/finalize-cloudflare-routes-v173.mjs");
const serviceWorker = read("public/sw.js");
const release = JSON.parse(read("public/release-v168.json"));

const RELEASE = "2026.07.30-production-route-recovery-v168";
const AUTHORITY = "cloudflare-route-takeover-v168";
const HISTORICAL_ROUTES = ["ngeblogging.com/*", "www.ngeblogging.com/*", "*.ngeblogging.com/*"];
const ACTIVE_PATTERNS = ["ngeblogging.com", "www.ngeblogging.com", "*.ngeblogging.com/*"];
const configs = [wrangler, wrangler.env.production, production];

function verifyActiveV172(config) {
  assert.equal(config.main, "./cloudflare/worker-v69.mjs");
  assert.equal(config.vars.APP_RELEASE, "2026.07.30-production-custom-domain-v172");
  assert.equal(config.vars.PRODUCTION_ROUTE_AUTHORITY, "cloudflare-custom-domain-authority-v172");
  assert.equal(config.vars.PRODUCTION_RECOVERY_RELEASE, RELEASE);
  assert.deepEqual(config.routes.map((route) => route.pattern), ACTIVE_PATTERNS);
  assert.equal(config.routes[0].custom_domain, true);
  assert.equal(config.routes[1].custom_domain, true);
  assert.equal(config.routes[2].zone_name, "ngeblogging.com");
  assert.notEqual(config.routes[2].custom_domain, true);
}

test("v168 historical route recovery remains published without controlling apex or www", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, RELEASE);
  assert.equal(release.routeAuthority, AUTHORITY);
  assert.deepEqual(release.routePatterns, HISTORICAL_ROUTES);
  assert.equal(release.apexRouteTakeover, true);
  assert.equal(release.wwwRouteTakeover, true);
  assert.equal(release.tenantWildcardPreserved, true);
  assert.equal(release.reactShell, true);
  assert.equal(release.pkceSingleFlight, true);
  assert.equal(release.sessionPersistsUntilExplicitLogout, true);
  assert.equal(release.wordLimit, 5000);
  assert.equal(release.legacyWhiteR4, false);
});

test("active v172 exact Custom Domains supersede v168 apex routes and preserve tenant wildcard", () => {
  for (const config of configs) verifyActiveV172(config);
});

test("Worker retains all v168 evidence while publishing v172 as active authority", () => {
  for (const marker of [
    RELEASE,
    "worker-v69-custom-domain-v172",
    "2026.07.30-production-custom-domain-v172",
    "/release-v168.json",
    "/release-v172.json",
    "ngeblogging-production-route-recovery-v168",
    "ngeblogging-production-custom-domain-v172",
    "auth-callback-singleflight-v162-20260730",
    "sessionPersistsUntilExplicitLogout: true",
    "wordLimit: 5000",
    "legacyWhiteR4: false",
  ]) assert.ok(worker.includes(marker), `worker missing ${marker}`);
  assert.ok(worker.includes('responsiveFamilies: ["application", "phone", "mobile", "compact", "tablet", "desktop"]'));
  assert.ok(worker.includes('desktopVariants: ["laptop", "computer"]'));
});

test("v173 production workflow supersedes v168 routes and verifies compatibility", () => {
  for (const marker of [
    "Ngeblogging Cloudflare production v173",
    "npm run build",
    "build-active-zone-wrangler.mjs",
    "finalize-cloudflare-routes-v173.mjs",
    "/release-v172.json",
    "PRODUCTION_ROUTE_FINALIZER_V173_VERIFY_FAILED",
    "WHITE-R4-2026.07.12",
    "firstSiteBeforeStudio !== true",
    "maxSitesPerAccount !== 25",
    "sessionPersistsUntilExplicitLogout !== true",
    "ngeblogging-mobile-public-v171",
    "issue_number: 243",
  ]) assert.ok(workflow.includes(marker), `workflow missing ${marker}`);
  for (const marker of [
    '"ngeblogging.com/*"',
    '"www.ngeblogging.com/*"',
    'TENANT_WILDCARD_PATTERN = "*.ngeblogging.com/*"',
    "deleteLegacyExactRoutes",
    "verifyFinalState",
  ]) assert.ok(finalizer.includes(marker), `finalizer missing ${marker}`);
});

test("active v171 cache preserves v168 and v169 compatibility without caching auth callbacks", () => {
  for (const marker of [
    "ngeblogging-app-v171-mobile-public-20260730",
    "mobile-public-cache-v171",
    "ngeblogging-app-v170-theme-layout-20260730",
    "ngeblogging-app-v169-first-site-20260730",
    "ngeblogging-app-v168-route-recovery-20260730",
    "route-recovery-cache-v168",
    'url.pathname === "/login"',
    'url.pathname.startsWith("/auth/")',
    "networkFirst(request",
  ]) assert.ok(serviceWorker.includes(marker), `service worker marker missing ${marker}`);
});
