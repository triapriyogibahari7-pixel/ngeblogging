import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const attach = read("scripts/attach-cloudflare-domains-v165.mjs");
const workflow = read(".github/workflows/cloudflare-token-diagnostic.yml");
const finalizer = read("scripts/finalize-cloudflare-routes-v175.mjs");
const cutover = read("scripts/finalize-cloudflare-route-cutover-v182.mjs");
const worker = read("cloudflare/worker-v69.mjs");
const netlify = read("scripts/write-netlify-redirects.mjs");
const release = JSON.parse(read("public/release-v165.json"));
const packageJson = JSON.parse(read("package.json"));
const wrangler = JSON.parse(read("wrangler.jsonc"));
const production = JSON.parse(read("wrangler.production.jsonc"));

const RELEASE = "2026.07.30-production-domain-attach-v165";
const EXACT_HOSTS = ["ngeblogging.com", "www.ngeblogging.com"];
const ACTIVE_PATTERNS = ["ngeblogging.com", "www.ngeblogging.com", "*.ngeblogging.com/*"];

test("v165 official Workers Domains utility remains secret-safe and exact-host only", () => {
  for (const marker of [
    RELEASE, "/workers/domains", 'method: "PUT"', 'method: "GET"',
    "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_WORKER_SERVICE",
    "CLOUDFLARE_ZONE_NAME", "service: SERVICE", "zone_name: ZONE_NAME",
  ]) assert.ok(attach.includes(marker), `domain attach script missing ${marker}`);
  assert.match(attach, /HOSTNAMES = Object\.freeze\(\["ngeblogging\.com", "www\.ngeblogging\.com"\]\)/);
  assert.doesNotMatch(attach, /HOSTNAMES[^\n]*\*\.ngeblogging\.com/);
  assert.match(attach, /tenantWildcardUntouched: "\*\.ngeblogging\.com\/\*"/);
  assert.doesNotMatch(attach, /Bearer\s+[A-Za-z0-9_-]{20,}/);
});

test("v165 utility verifies every hostname points to service ngeblogging", () => {
  assert.match(attach, /domains\.find\(\(item\) => item\?\.hostname === hostname\)/);
  assert.match(attach, /domain\.service !== SERVICE/);
  assert.match(attach, /tidak ditemukan pada daftar Worker Domains/);
  assert.match(attach, /for \(const hostname of HOSTNAMES\) attached\.push\(await attach\(hostname\)\)/);
  assert.match(attach, /const verified = await verify\(\)/);
});

test("v184 production preserves v165/v175 domain utilities before authoritative route cutover", () => {
  assert.equal(packageJson.scripts["cloudflare:attach-domains"], "node scripts/attach-cloudflare-domains-v165.mjs");
  assert.equal(packageJson.scripts["cloudflare:finalize-login-routes"], "node scripts/finalize-cloudflare-routes-v175.mjs");
  assert.equal(packageJson.scripts["cloudflare:cutover-routes"], "node scripts/finalize-cloudflare-route-cutover-v182.mjs");
  assert.ok(packageJson.scripts["test:production"].includes("tests/production-domain-attach-v165.test.mjs"));

  for (const marker of [
    "Deploy Worker and assets",
    "Preserve compatibility routing before cutover",
    "finalize-cloudflare-routes-v175.mjs",
    "Cut over apex and www to authoritative zone routes v184",
    "finalize-cloudflare-route-cutover-v182.mjs",
    "/release-v183.json",
    "/release-v184.json",
    "PRODUCTION_ROUTE_CUTOVER_V184_VERIFY_FAILED",
  ]) assert.ok(workflow.includes(marker), `production workflow missing ${marker}`);

  assert.ok(workflow.indexOf("Deploy Worker and assets") < workflow.indexOf("Preserve compatibility routing before cutover"));
  assert.ok(workflow.indexOf("Preserve compatibility routing before cutover") < workflow.indexOf("Cut over apex and www to authoritative zone routes v184"));

  for (const marker of ["/workers/domains", 'method: "PUT"', "attachExactWorkerDomains", "verifyFinalState"]) {
    assert.ok(finalizer.includes(marker), `v175 finalizer missing ${marker}`);
  }
  for (const marker of ["ngeblogging.com/*", "www.ngeblogging.com/*", "verifyZoneRoutes", "PRODUCTION_ROUTE_CUTOVER_V184_VERIFIED"]) {
    assert.ok(cutover.includes(marker), `v184 route cutover missing ${marker}`);
  }
});

test("active configs use exact Custom Domains while tenant wildcard remains a route", () => {
  for (const config of [wrangler, wrangler.env.production, production]) {
    assert.deepEqual(config.routes.map((route) => route.pattern), ACTIVE_PATTERNS);
    assert.equal(config.routes[0].custom_domain, true);
    assert.equal(config.routes[1].custom_domain, true);
    assert.equal(config.routes[2].zone_name, "ngeblogging.com");
    assert.notEqual(config.routes[2].custom_domain, true);
  }
});

test("v165 compatibility release remains factual under v172-v184 authority", () => {
  for (const marker of [
    RELEASE, "/release-v165.json", "ngeblogging-production-domain-attach-v165",
    "2026.07.30-production-custom-domain-v172", "legacyWhiteR4: false",
  ]) assert.ok(worker.includes(marker), `Worker compatibility missing ${marker}`);
  for (const source of [attach, netlify]) assert.ok(source.includes("cloudflare-workers-domains-api-v165"), "domain attachment authority marker missing");
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
