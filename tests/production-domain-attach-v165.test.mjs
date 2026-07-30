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

test("v165 attaches only exact production hostnames through the official Workers Domains endpoint", () => {
  for (const marker of [
    RELEASE,
    "/workers/domains",
    'method: "PUT"',
    'method: "GET"',
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_WORKER_SERVICE",
    "CLOUDFLARE_ZONE_NAME",
    'service: SERVICE',
    'zone_name: ZONE_NAME',
  ]) assert.ok(attach.includes(marker), `domain attach script missing ${marker}`);

  assert.match(attach, /HOSTNAMES = Object\.freeze\(\["ngeblogging\.com", "www\.ngeblogging\.com"\]\)/);
  assert.doesNotMatch(attach, /HOSTNAMES[^\n]*\*\.ngeblogging\.com/);
  assert.match(attach, /tenantWildcardUntouched: "\*\.ngeblogging\.com\/\*"/);
  assert.doesNotMatch(attach, /console\.log\([^\n]*(?:API_TOKEN|authorization)/);
  assert.doesNotMatch(attach, /Bearer\s+[A-Za-z0-9_-]{20,}/);
});

test("v165 verifies each hostname points to the ngeblogging service after attachment", () => {
  assert.match(attach, /domains\.find\(\(item\) => item\?\.hostname === hostname\)/);
  assert.match(attach, /domain\.service !== SERVICE/);
  assert.match(attach, /tidak ditemukan pada daftar Worker Domains/);
  assert.match(attach, /bukan \$\{SERVICE\}/);
  assert.match(attach, /for \(const hostname of HOSTNAMES\) attached\.push\(await attach\(hostname\)\)/);
  assert.match(attach, /const verified = await verify\(\)/);
});

test("package and production workflow execute domain attachment before final verification", () => {
  assert.equal(packageJson.scripts["cloudflare:attach-domains"], "node scripts/attach-cloudflare-domains-v165.mjs");
  assert.ok(packageJson.scripts["test:production"].includes("tests/production-domain-attach-v165.test.mjs"));
  for (const marker of [
    "npm run deploy:cloudflare",
    "npm run cloudflare:attach-domains",
    "CLOUDFLARE_WORKER_SERVICE",
    "CLOUDFLARE_ZONE_NAME",
    RELEASE,
    "/release-v165.json",
    "DEPLOY_VERIFY_PRODUCTION_DOMAIN_ATTACH_V165_FAILED",
  ]) assert.ok(workflow.includes(marker), `production workflow missing ${marker}`);
  assert.ok(workflow.indexOf("npm run deploy:cloudflare") < workflow.indexOf("npm run cloudflare:attach-domains"));
});

test("v165 keeps exact Custom Domains and the tenant wildcard route separated", () => {
  for (const config of [wrangler, wrangler.env.production, production]) {
    assert.ok(config.routes.some((route) => route.pattern === EXACT_HOSTS[0] && route.custom_domain === true));
    assert.ok(config.routes.some((route) => route.pattern === EXACT_HOSTS[1] && route.custom_domain === true));
    assert.ok(config.routes.some((route) => route.pattern === "*.ngeblogging.com/*" && route.zone_name === "ngeblogging.com"));
    assert.ok(!config.routes.some((route) => route.pattern === "*.ngeblogging.com/*" && route.custom_domain === true));
  }
});

test("Worker Netlify and static probe publish the same v165 authority markers", () => {
  for (const source of [worker, netlify]) {
    for (const marker of [
      RELEASE,
      "/release-v165.json",
      "ngeblogging-production-domain-attach-v165",
      "cloudflare-workers-domains-api-v165",
      "legacyWhiteR4: false",
    ]) assert.ok(source.includes(marker), `publisher missing ${marker}`);
  }
  assert.ok(worker.includes("x-ngeblogging-domain-attach"));
  assert.ok(netlify.includes("X-Ngeblogging-Domain-Attach"));

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
