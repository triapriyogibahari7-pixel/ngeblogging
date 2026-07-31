import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const wrangler = JSON.parse(read("wrangler.jsonc"));
const production = JSON.parse(read("wrangler.production.jsonc"));
const worker = read("cloudflare/worker-v69.mjs");
const fallbackWorkflow = read(".github/workflows/deploy-production.yml");
const activeWorkflow = read(".github/workflows/cloudflare-token-diagnostic.yml");
const attach = read("scripts/attach-cloudflare-domains-v165.mjs");
const release = JSON.parse(read("public/release-v172.json"));
const packageJson = JSON.parse(read("package.json"));

const RELEASE = "2026.07.30-production-custom-domain-v172";
const AUTHORITY = "cloudflare-custom-domain-authority-v172";
const ACTIVE_PATTERNS = ["ngeblogging.com", "www.ngeblogging.com", "*.ngeblogging.com/*"];
const configs = [wrangler, wrangler.env.production, production];

test("v172 exact Worker Domains and tenant wildcard remain unchanged", () => {
  for (const config of configs) {
    assert.equal(config.name, "ngeblogging");
    assert.equal(config.main, "./cloudflare/worker-v69.mjs");
    assert.equal(config.vars.APP_RELEASE, RELEASE);
    assert.equal(config.vars.PRODUCTION_ROUTE_AUTHORITY, AUTHORITY);
    assert.equal(config.vars.PRODUCTION_CUSTOM_DOMAIN_RELEASE, RELEASE);
    assert.deepEqual(config.routes.map((route) => route.pattern), ACTIVE_PATTERNS);
    assert.deepEqual(config.routes[0], { pattern: "ngeblogging.com", custom_domain: true });
    assert.deepEqual(config.routes[1], { pattern: "www.ngeblogging.com", custom_domain: true });
    assert.deepEqual(config.routes[2], { pattern: "*.ngeblogging.com/*", zone_name: "ngeblogging.com" });
  }
  assert.equal(wrangler.assets.run_worker_first, true);
  assert.equal(production.assets.run_worker_first, true);
});

test("v172 Worker still publishes React auth Studio onboarding and mobile authorities", () => {
  for (const marker of [
    RELEASE, AUTHORITY, "worker-v69-custom-domain-v172", "/release-v172.json",
    "ngeblogging-production-custom-domain-v172", "x-ngeblogging-production-custom-domain",
    "mobile-public-v171-20260730", "ngeblogging-mobile-public-v171", "x-ngeblogging-mobile-public",
    "theme-layout-v170-20260730", "first-site-onboarding-v169-20260730",
    "site-policy-v169-20260730", "auth-callback-singleflight-v162-20260730",
    "pkceSingleFlight: true", "emailPasswordSessionHandoff: true",
    "sessionPersistsUntilExplicitLogout: true", "maxSitesPerAccount: 25",
    "wordLimit: 5000", "legacyWhiteR4: false", "react-dist-index",
  ]) assert.ok(worker.includes(marker), `worker missing ${marker}`);
  for (const route of [
    "/login", "/signin", "/signup", "/forgot-password", "/reset-password",
    "/auth/callback", "/auth/recovery", "/studio", "/dashboard", "/workspace",
  ]) assert.ok(worker.includes(`"${route}"`), `Worker shell route missing ${route}`);
  assert.doesNotMatch(worker, /WHITE-R4-2026\.07\.12/);
});

test("v172 deployment is retained as manual validation while v175 owns production mutation", () => {
  assert.ok(fallbackWorkflow.includes("Deploy Ngeblogging Production v172 manual fallback"));
  assert.ok(fallbackWorkflow.includes("workflow_dispatch"));
  assert.ok(!fallbackWorkflow.includes("branches: [main]"));
  assert.ok(!fallbackWorkflow.includes("npm run deploy:cloudflare"));
  for (const marker of [
    "Ngeblogging production login finalizer v175", "environment: cloudflare-production",
    "Run complete v147-v175 regression and build", "Deploy Worker and assets",
    "Attach exact Worker Domains and remove only conflicting apex routes",
    "Verify root login signup Studio mobile audit and tenant",
    "/release-v174.json", "/studio-viewport-audit-v174.html",
    "WHITE-R4-2026.07.12", "PRODUCTION_LOGIN_FINALIZER_V175_VERIFY_FAILED",
  ]) assert.ok(activeWorkflow.includes(marker), `active workflow missing ${marker}`);
  assert.ok(activeWorkflow.indexOf("Deploy Worker and assets") < activeWorkflow.indexOf("Attach exact Worker Domains"));
  assert.ok(activeWorkflow.indexOf("Attach exact Worker Domains") < activeWorkflow.indexOf("Verify root login signup Studio"));
});

test("v172 audited Workers Domains utility remains available without touching wildcard", () => {
  for (const marker of [
    "/workers/domains", 'method: "PUT"', 'method: "GET"',
    'hostname,', 'service: SERVICE', 'zone_name: ZONE_NAME',
    'HOSTNAMES = Object.freeze(["ngeblogging.com", "www.ngeblogging.com"])',
    'tenantWildcardUntouched: "*.ngeblogging.com/*"',
  ]) assert.ok(attach.includes(marker), `attach utility missing ${marker}`);
  assert.doesNotMatch(attach, /HOSTNAMES[^\n]*\*\.ngeblogging\.com/);
});

test("v172 release remains factual and makes no unsupported production capacity claim", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, RELEASE);
  assert.equal(release.authority, AUTHORITY);
  assert.equal(release.worker, "worker-v69-custom-domain-v172");
  assert.equal(release.apex.customDomain, true);
  assert.equal(release.www.customDomain, true);
  assert.equal(release.tenantWildcard.routePreserved, true);
  assert.equal(release.reactShell, true);
  assert.equal(release.legacyWhiteR4, false);
  assert.equal(release.firstSiteBeforeStudio, true);
  assert.equal(release.maxSitesPerAccount, 25);
  assert.deepEqual(release.loginProviders, ["google", "linkedin", "email-password", "magic-link"]);
  assert.equal(release.sessionPersistsUntilExplicitLogout, true);
  assert.equal(release.wordLimit, 5000);
  assert.equal(release.productionCapacityClaimed, false);
});

test("v172 regression remains mandatory under v175", () => {
  assert.ok(packageJson.scripts["verify:v172"].includes("tests/production-custom-domain-v172.test.mjs"));
  assert.ok(packageJson.scripts["test:production"].includes("tests/production-custom-domain-v172.test.mjs"));
  assert.equal(packageJson.scripts["cloudflare:attach-domains"], "node scripts/attach-cloudflare-domains-v165.mjs");
});
