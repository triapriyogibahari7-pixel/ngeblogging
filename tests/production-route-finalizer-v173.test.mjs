import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const builder = read("scripts/build-active-zone-wrangler.mjs");
const finalizer = read("scripts/finalize-cloudflare-routes-v173.mjs");
const workflow = read(".github/workflows/cloudflare-token-diagnostic.yml");
const wrangler = JSON.parse(read("wrangler.production.jsonc"));
const packageJson = JSON.parse(read("package.json"));

const RELEASE = "2026.07.30-production-route-finalizer-v173";
const LEGACY_ROUTES = ["ngeblogging.com/*", "www.ngeblogging.com/*"];

test("active-zone builder no longer converts apex and www Custom Domains back into routes", () => {
  for (const marker of [
    RELEASE,
    '{ pattern: "ngeblogging.com", custom_domain: true }',
    '{ pattern: "www.ngeblogging.com", custom_domain: true }',
    '{ pattern: "*.ngeblogging.com/*", zone_id: zoneId }',
    'APP_RELEASE: "2026.07.30-production-custom-domain-v172"',
    'PRODUCTION_ROUTE_AUTHORITY: "cloudflare-custom-domain-authority-v172"',
  ]) assert.ok(builder.includes(marker), `active-zone builder missing ${marker}`);
  assert.ok(!builder.includes('const requiredPatterns = [\n  "ngeblogging.com/*"'));
  assert.ok(!builder.includes("config.routes = requiredPatterns.map"));
});

test("route finalizer attaches exact Worker Domains before deleting only two legacy routes", () => {
  for (const marker of [
    RELEASE,
    'EXACT_HOSTNAMES = Object.freeze(["ngeblogging.com", "www.ngeblogging.com"])',
    '"ngeblogging.com/*"',
    '"www.ngeblogging.com/*"',
    'TENANT_WILDCARD_PATTERN = "*.ngeblogging.com/*"',
    "/workers/domains",
    "/workers/routes",
    'method: "PUT"',
    'method: "DELETE"',
    "attachExactWorkerDomains",
    "deleteLegacyExactRoutes",
    "verifyFinalState",
  ]) assert.ok(finalizer.includes(marker), `finalizer missing ${marker}`);
  assert.ok(finalizer.indexOf("attachExactWorkerDomains()") < finalizer.indexOf("deleteLegacyExactRoutes(beforeRoutes)"));
  assert.match(finalizer, /if \(!LEGACY_EXACT_ROUTE_PATTERNS\.has\(pattern\)\) continue/);
  assert.match(finalizer, /if \(!wildcard\) throw new Error\("Wildcard tenant/);
  assert.doesNotMatch(finalizer, /LEGACY_EXACT_ROUTE_PATTERNS[^;]*\*\.ngeblogging\.com\/\*/s);
});

test("primary GitHub production workflow uses cloudflare-production secrets and v173 finalization", () => {
  for (const marker of [
    "Ngeblogging Cloudflare production v173",
    "environment: cloudflare-production",
    "CLOUDFLARE_ZONE_ID",
    "npm run build",
    "build-active-zone-wrangler.mjs",
    "wrangler.production.active-zone.jsonc",
    "finalize-cloudflare-routes-v173.mjs",
    "release-v172.json",
    "maxSitesPerAccount !== 25",
    "ngeblogging-mobile-public-v171",
    "WHITE-R4-2026.07.12",
    "PRODUCTION_ROUTE_FINALIZER_V173_VERIFY_FAILED",
    "issue_number: 243",
  ]) assert.ok(workflow.includes(marker), `production workflow missing ${marker}`);
  assert.ok(workflow.indexOf("Deploy Worker v172") < workflow.indexOf("Attach exact Worker Domains"));
  assert.ok(workflow.indexOf("Attach exact Worker Domains") < workflow.indexOf("Verify workers.dev apex"));
  assert.ok(!workflow.includes("defaultLimit !== 12"));
  assert.ok(!workflow.includes("siteLimits?.free !== 12"));
  assert.ok(!workflow.includes("2026.07.27-full-zone-domains-v62"));
});

test("standalone production Wrangler keeps exact Custom Domains and wildcard tenant", () => {
  assert.equal(wrangler.vars.APP_RELEASE, "2026.07.30-production-custom-domain-v172");
  assert.deepEqual(wrangler.routes[0], { pattern: "ngeblogging.com", custom_domain: true });
  assert.deepEqual(wrangler.routes[1], { pattern: "www.ngeblogging.com", custom_domain: true });
  assert.deepEqual(wrangler.routes[2], { pattern: "*.ngeblogging.com/*", zone_name: "ngeblogging.com" });
  for (const route of LEGACY_ROUTES) assert.ok(!wrangler.routes.some((item) => item.pattern === route));
});

test("v173 regression is mandatory in focused and production commands", () => {
  assert.ok(packageJson.scripts["verify:v173"].includes("tests/production-route-finalizer-v173.test.mjs"));
  assert.ok(packageJson.scripts["test:production"].includes("tests/production-route-finalizer-v173.test.mjs"));
});
