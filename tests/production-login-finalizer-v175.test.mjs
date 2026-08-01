import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const builder = read("scripts/build-active-zone-wrangler.mjs");
const finalizer = read("scripts/finalize-cloudflare-routes-v175.mjs");
const cutover = read("scripts/finalize-cloudflare-route-cutover-v182.mjs");
const activeWorkflow = read(".github/workflows/cloudflare-token-diagnostic.yml");
const fallbackWorkflow = read(".github/workflows/deploy-production.yml");
const wrangler = JSON.parse(read("wrangler.production.jsonc"));
const release174 = JSON.parse(read("public/release-v174.json"));
const packageJson = JSON.parse(read("package.json"));

const RELEASE = "2026.07.31-production-login-finalizer-v175";

test("active-zone builder preserves exact domains, wildcard tenant and v174 UI", () => {
  for (const marker of [
    RELEASE,
    '{ pattern: "ngeblogging.com", custom_domain: true }',
    '{ pattern: "www.ngeblogging.com", custom_domain: true }',
    '{ pattern: "*.ngeblogging.com/*", zone_id: zoneId }',
    'APP_RELEASE: "2026.07.30-production-custom-domain-v172"',
    'PRODUCTION_ROUTE_AUTHORITY: "cloudflare-custom-domain-authority-v172"',
    'MOBILE_INTERACTION_RELEASE: "mobile-interaction-v174-20260731"',
  ]) assert.ok(builder.includes(marker), `builder missing ${marker}`);
  assert.ok(!builder.includes('const requiredPatterns = [\n  "ngeblogging.com/*"'));
  assert.ok(!builder.includes("config.routes = requiredPatterns.map"));
});

test("v175 finalizer attaches exact domains before deleting only legacy apex routes", () => {
  for (const marker of [
    RELEASE,
    'EXACT_HOSTNAMES = Object.freeze(["ngeblogging.com", "www.ngeblogging.com"])',
    'LEGACY_EXACT_ROUTE_PATTERNS = new Set(["ngeblogging.com/*", "www.ngeblogging.com/*"])',
    'TENANT_WILDCARD_PATTERN = "*.ngeblogging.com/*"',
    "/workers/domains", "/workers/routes", 'method: "PUT"', 'method: "DELETE"',
    "attachExactWorkerDomains", "deleteLegacyExactRoutes", "verifyFinalState",
  ]) assert.ok(finalizer.includes(marker), `finalizer missing ${marker}`);
  assert.ok(finalizer.indexOf("attachExactWorkerDomains()") < finalizer.indexOf("deleteLegacyExactRoutes(beforeRoutes)"));
  assert.match(finalizer, /if \(!LEGACY_EXACT_ROUTE_PATTERNS\.has\(pattern\)\) continue/);
  assert.match(finalizer, /if \(!wildcard\) throw new Error\("Wildcard tenant/);
});

test("v184 workflow owns automatic production mutation while preserving v175 compatibility finalization", () => {
  assert.ok(activeWorkflow.includes("push:\n    branches:\n      - production"));
  assert.ok(activeWorkflow.includes("environment: cloudflare-production"));
  for (const marker of [
    "Ngeblogging production route cutover v184",
    "Run v183 and v184 regression",
    "Build production application",
    "build-active-zone-wrangler.mjs",
    "Deploy Worker and assets",
    "Preserve compatibility routing before cutover",
    "finalize-cloudflare-routes-v175.mjs",
    "Cut over apex and www to authoritative zone routes v184",
    "finalize-cloudflare-route-cutover-v182.mjs",
    "Verify live apex, auth routes, Studio and release markers",
    "/release-v183.json",
    "/release-v184.json",
    "WHITE-R4-2026.07.12",
    "PRODUCTION_ROUTE_CUTOVER_V184_VERIFY_FAILED",
  ]) assert.ok(activeWorkflow.includes(marker), `workflow missing ${marker}`);
  assert.ok(activeWorkflow.indexOf("Deploy Worker and assets") < activeWorkflow.indexOf("Preserve compatibility routing before cutover"));
  assert.ok(activeWorkflow.indexOf("Preserve compatibility routing before cutover") < activeWorkflow.indexOf("Cut over apex and www to authoritative zone routes v184"));
  assert.ok(activeWorkflow.indexOf("Cut over apex and www to authoritative zone routes v184") < activeWorkflow.indexOf("Verify live apex, auth routes, Studio and release markers"));

  for (const marker of ["detachExactWorkerDomains", "installAuthoritativeRoutes", "verifyFinalState", "EXACT_ROUTES", "TENANT_ROUTE"]) {
    assert.ok(cutover.includes(marker), `cutover missing ${marker}`);
  }

  assert.ok(fallbackWorkflow.includes("manual fallback"));
  assert.ok(fallbackWorkflow.includes("workflow_dispatch"));
  assert.ok(!fallbackWorkflow.includes("push:\n    branches"));
  assert.ok(!fallbackWorkflow.includes("npm run deploy:cloudflare"));
});

test("standalone Wrangler keeps v172 exact domains and wildcard", () => {
  assert.equal(wrangler.vars.APP_RELEASE, "2026.07.30-production-custom-domain-v172");
  assert.deepEqual(wrangler.routes[0], { pattern: "ngeblogging.com", custom_domain: true });
  assert.deepEqual(wrangler.routes[1], { pattern: "www.ngeblogging.com", custom_domain: true });
  assert.deepEqual(wrangler.routes[2], { pattern: "*.ngeblogging.com/*", zone_name: "ngeblogging.com" });
  assert.ok(!wrangler.routes.some((item) => ["ngeblogging.com/*", "www.ngeblogging.com/*"].includes(item.pattern)));
});

test("v174 UI compatibility release remains factual without fake scale claims", () => {
  assert.equal(release174.authority, "mobile-interaction-v174-20260731");
  assert.equal(release174.legacyWhiteR4, false);
  assert.equal(release174.viewportAudit, "/studio-viewport-audit-v174.html");
  for (const value of Object.values(release174.fixes)) assert.equal(value, true);
  assert.ok(!JSON.stringify(release174).includes("900 juta"));
});

test("v175 regression and finalizer command remain mandatory", () => {
  assert.equal(packageJson.scripts["cloudflare:finalize-login-routes"], "node scripts/finalize-cloudflare-routes-v175.mjs");
  assert.equal(packageJson.scripts["cloudflare:cutover-routes"], "node scripts/finalize-cloudflare-route-cutover-v182.mjs");
  assert.ok(packageJson.scripts["verify:v175"].includes("tests/production-login-finalizer-v175.test.mjs"));
  assert.ok(packageJson.scripts["test:production"].includes("tests/production-login-finalizer-v175.test.mjs"));
  assert.ok(packageJson.scripts["test:production"].includes("tests/mobile-interaction-v174.test.mjs"));
});
