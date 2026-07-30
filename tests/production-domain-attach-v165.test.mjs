import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const attach = read("scripts/attach-cloudflare-domains-v165.mjs");
const workflow = read(".github/workflows/deploy-production.yml");
const worker = read("cloudflare/worker-v69.mjs");
const netlify = read("scripts/write-netlify-redirects.mjs");
const release = JSON.parse(read("public/release-v165.json"));
const packageJson = JSON.parse(read("package.json"));
const wrangler = JSON.parse(read("wrangler.jsonc"));
const production = JSON.parse(read("wrangler.production.jsonc"));

const RELEASE = "2026.07.30-production-domain-attach-v165";
const EXACT_HOSTS = ["ngeblogging.com", "www.ngeblogging.com"];
const RECOVERY_ROUTES = ["ngeblogging.com/*", "www.ngeblogging.com/*", "*.ngeblogging.com/*"];

test("v165 official Workers Domains attachment utility is retained as an audited fallback", () => {
  for (const marker of [
    RELEASE,
    "/workers/domains",
    'method: "PUT"',
    'method: "GET"',
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_WORKER_SERVICE",
    "CLOUDFLARE_ZONE_NAME",
    "service: SERVICE",
    "zone_name: ZONE_NAME",
  ]) assert.ok(attach.includes(marker), `domain attach script missing ${marker}`);
  assert.match(attach, /HOSTNAMES = Object\.freeze\(\["ngeblogging\.com", "www\.ngeblogging\.com"\]\)/);
  assert.doesNotMatch(attach, /HOSTNAMES[^\n]*\*\.ngeblogging\.com/);
  assert.match(attach, /tenantWildcardUntouched: "\*\.ngeblogging\.com\/\*"/);
  assert.doesNotMatch(attach, /Bearer\s+[A-Za-z0-9_-]{20,}/);
});

test("v165 fallback verifies each hostname points to the expected service", () => {
  assert.match(attach, /domains\.find\(\(item\) => item\?\.hostname === hostname\)/);
  assert.match(attach, /domain\.service !== SERVICE/);
  assert.match(attach, /tidak ditemukan pada daftar Worker Domains/);
  assert.match(attach, /bukan \$\{SERVICE\}/);
  assert.match(attach, /for \(const hostname of HOSTNAMES\) attached\.push\(await attach\(hostname\)\)/);
  assert.match(attach, /const verified = await verify\(\)/);
});

test("v168-v169 production deploy no longer blocks on the conflicting v165 attachment step", () => {
  assert.equal(packageJson.scripts["cloudflare:attach-domains"], "node scripts/attach-cloudflare-domains-v165.mjs");
  assert.ok(packageJson.scripts["test:production"].includes("tests/production-domain-attach-v165.test.mjs"));
  assert.ok(packageJson.scripts["test:production"].includes("tests/production-route-recovery-v168.test.mjs"));
  assert.ok(packageJson.scripts["test:production"].includes("tests/first-site-onboarding-v169.test.mjs"));
  for (const marker of [
    "npm run deploy:cloudflare",
    "2026.07.30-production-route-recovery-v168",
    "first-site-onboarding-v169-20260730",
    "/release-v168.json",
    "/release-v169.json",
    "DEPLOY_VERIFY_PRODUCTION_V168_V169_FAILED",
  ]) assert.ok(workflow.includes(marker), `production workflow missing ${marker}`);
  assert.ok(!workflow.includes("npm run cloudflare:attach-domains"));
});

test("active configs use route recovery while preserving the tenant wildcard", () => {
  for (const config of [wrangler, wrangler.env.production, production]) {
    assert.deepEqual(config.routes.map((route) => route.pattern), RECOVERY_ROUTES);
    for (const route of config.routes) {
      assert.equal(route.zone_name, "ngeblogging.com");
      assert.notEqual(route.custom_domain, true);
    }
  }
});

test("Worker preserves v165 compatibility marker while attach authority remains in fallback artifacts", () => {
  for (const marker of [
    RELEASE,
    "/release-v165.json",
    "ngeblogging-production-domain-attach-v165",
    "legacyWhiteR4: false",
  ]) assert.ok(worker.includes(marker), `Worker compatibility missing ${marker}`);

  for (const source of [attach, netlify]) {
    assert.ok(source.includes("cloudflare-workers-domains-api-v165"), "fallback authority marker missing");
  }
  for (const marker of [
    RELEASE,
    "/release-v165.json",
    "ngeblogging-production-domain-attach-v165",
    "legacyWhiteR4: false",
  ]) assert.ok(netlify.includes(marker), `Netlify fallback missing ${marker}`);

  assert.equal(release.status, "ok");
  assert.equal(release.release, RELEASE);
  assert.equal(release.domainAttachAuthority, "cloudflare-workers-domains-api-v165");
  assert.equal(release.workerService, "ngeblogging");
  assert.equal(release.zoneName, "ngeblogging.com");
  assert.deepEqual(release.exactCustomDomains, EXACT_HOSTS);
  assert.equal(release.tenantWildcardRoute, "*.ngeblogging.com/*");
  assert.equal(release.tenantWildcardUntouched, true);
  assert.equal(release.pkceSingleFlight, true);
  assert.equal(release.sessionPersistsUntilExplicitLogout, true);
  assert.equal(release.wordLimit, 5000);
  assert.equal(release.legacyWhiteR4, false);
});
