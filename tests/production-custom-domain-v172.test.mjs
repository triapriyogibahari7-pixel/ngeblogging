import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const wrangler = JSON.parse(read("wrangler.jsonc"));
const production = JSON.parse(read("wrangler.production.jsonc"));
const worker = read("cloudflare/worker-v69.mjs");
const workflow = read(".github/workflows/deploy-production.yml");
const attach = read("scripts/attach-cloudflare-domains-v165.mjs");
const release = JSON.parse(read("public/release-v172.json"));
const packageJson = JSON.parse(read("package.json"));

const RELEASE = "2026.07.30-production-custom-domain-v172";
const AUTHORITY = "cloudflare-custom-domain-authority-v172";
const ACTIVE_PATTERNS = ["ngeblogging.com", "www.ngeblogging.com", "*.ngeblogging.com/*"];
const configs = [wrangler, wrangler.env.production, production];

test("v172 makes apex and www exact Worker Custom Domains and preserves tenant wildcard", () => {
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

test("v172 Worker publishes React login Studio onboarding and mobile layout authority", () => {
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

test("v172 deploys Worker first, attaches exact domains, then verifies every production surface", () => {
  for (const marker of [
    "Deploy Ngeblogging Production v172", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN",
    "npm run test:production", "npm run build", "npm run cloudflare:dry-run",
    "npm run deploy:cloudflare", "npm run cloudflare:attach-domains",
    "/release-v172.json", "/api/auth-proxy/auth/v1/token",
    "WHITE-R4-2026.07.12", "DEPLOY_VERIFY_PRODUCTION_CUSTOM_DOMAIN_V172_FAILED",
    "x-ngeblogging-production-custom-domain", "x-ngeblogging-mobile-public",
    "x-ngeblogging-first-site", "issue_number: 243",
  ]) assert.ok(workflow.includes(marker), `workflow missing ${marker}`);
  assert.ok(workflow.indexOf("npm run deploy:cloudflare") < workflow.indexOf("npm run cloudflare:attach-domains"));
  assert.ok(workflow.indexOf("npm run cloudflare:attach-domains") < workflow.indexOf("Verify root login signup Studio"));
});

test("v172 uses the audited Workers Domains API without touching tenant wildcard", () => {
  for (const marker of [
    "/workers/domains", 'method: "PUT"', 'method: "GET"',
    'hostname,', 'service: SERVICE', 'zone_name: ZONE_NAME',
    'HOSTNAMES = Object.freeze(["ngeblogging.com", "www.ngeblogging.com"])',
    'tenantWildcardUntouched: "*.ngeblogging.com/*"',
  ]) assert.ok(attach.includes(marker), `attach utility missing ${marker}`);
  assert.doesNotMatch(attach, /HOSTNAMES[^\n]*\*\.ngeblogging\.com/);
});

test("v172 public release is factual and does not make unsupported capacity claims", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, RELEASE);
  assert.equal(release.authority, AUTHORITY);
  assert.equal(release.worker, "worker-v69-custom-domain-v172");
  assert.equal(release.apex.customDomain, true);
  assert.equal(release.apex.service, "ngeblogging");
  assert.equal(release.www.customDomain, true);
  assert.equal(release.www.service, "ngeblogging");
  assert.equal(release.tenantWildcard.routePreserved, true);
  assert.equal(release.reactShell, true);
  assert.equal(release.legacyWhiteR4, false);
  assert.equal(release.firstSiteBeforeStudio, true);
  assert.equal(release.maxSitesPerAccount, 25);
  assert.deepEqual(release.loginProviders, ["google", "linkedin", "email-password", "magic-link"]);
  assert.equal(release.sessionPersistsUntilExplicitLogout, true);
  assert.equal(release.themeLayoutRelease, "theme-layout-v170-20260730");
  assert.equal(release.mobilePublicRelease, "mobile-public-v171-20260730");
  assert.equal(release.wordLimit, 5000);
  assert.equal(release.productionCapacityClaimed, false);
});

test("v172 regression is mandatory in focused and production commands", () => {
  assert.ok(packageJson.scripts["verify:v172"].includes("tests/production-custom-domain-v172.test.mjs"));
  assert.ok(packageJson.scripts["test:production"].includes("tests/production-custom-domain-v172.test.mjs"));
  assert.equal(packageJson.scripts["cloudflare:attach-domains"], "node scripts/attach-cloudflare-domains-v165.mjs");
});
