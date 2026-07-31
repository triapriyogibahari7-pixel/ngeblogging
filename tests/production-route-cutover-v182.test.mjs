import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const finalizer = read("scripts/finalize-cloudflare-route-cutover-v182.mjs");
const workflow = read(".github/workflows/cloudflare-token-diagnostic.yml");
const studioEntry = read("src/Studio.jsx");
const release181 = JSON.parse(read("public/release-v181.json"));
const release182 = JSON.parse(read("public/release-v182.json"));
const release183 = JSON.parse(read("public/release-v183.json"));

const RELEASE = "production-route-cutover-v182-20260731";

test("v182 detaches stale Worker Domains and installs exact zone routes", () => {
  for (const marker of [
    RELEASE,
    'EXACT_HOSTNAMES = Object.freeze(["ngeblogging.com", "www.ngeblogging.com"])',
    'EXACT_ROUTES = Object.freeze(["ngeblogging.com/*", "www.ngeblogging.com/*"])',
    'TENANT_ROUTE = "*.ngeblogging.com/*"',
    "/workers/domains/", "/workers/routes", 'method: "DELETE"',
    'method: "PUT"', 'method: "POST"', "detachExactWorkerDomains",
    "installAuthoritativeRoutes", "verifyFinalState",
  ]) assert.ok(finalizer.includes(marker), `v182 finalizer missing ${marker}`);
  assert.ok(finalizer.indexOf("detachExactWorkerDomains()") < finalizer.indexOf("installAuthoritativeRoutes()"));
  assert.match(finalizer, /if \(String\(route\.script \|\| ""\) !== SERVICE\)/);
  assert.doesNotMatch(finalizer, /console\.log\([^)]*API_TOKEN/);
});

test("v182 deploy workflow runs after v175 compatibility finalizer and verifies v183 on the live domain", () => {
  for (const marker of [
    "Ngeblogging production route cutover v182",
    "Run complete v147-v181 regression and build",
    "finalize-cloudflare-routes-v175.mjs",
    "finalize-cloudflare-route-cutover-v182.mjs",
    "Cut over apex and www to authoritative zone routes v182",
    "Verify v181 and v183 UI plus v182 route authority on production",
    "/release-v181.json",
    "/release-v182.json",
    "/release-v183.json",
    "WHITE-R4-2026.07.12",
    "PRODUCTION_ROUTE_CUTOVER_V182_VERIFIED",
    "PRODUCTION_SCREENSHOT_AUTHORITY_V183_VERIFIED",
    "production route cutover v182",
  ]) assert.ok(workflow.includes(marker), `v182/v183 workflow missing ${marker}`);
  assert.ok(workflow.indexOf("Deploy Worker and assets") < workflow.indexOf("Attach exact Worker Domains and remove only conflicting apex routes"));
  assert.ok(workflow.indexOf("Attach exact Worker Domains and remove only conflicting apex routes") < workflow.indexOf("Cut over apex and www to authoritative zone routes v182"));
  assert.ok(workflow.indexOf("Cut over apex and www to authoritative zone routes v182") < workflow.indexOf("Verify v181 and v183 UI plus v182 route authority on production"));
});

test("v182 preserves v181 and loads v183 last instead of replacing features", () => {
  assert.match(studioEntry, /studio-mobile-runtime-v179\.js/);
  assert.match(studioEntry, /studio-production-recovery-v180\.js/);
  assert.match(studioEntry, /studio-mobile-hardening-v181\.js/);
  assert.match(studioEntry, /studio-screenshot-authority-v183\.js/);
  assert.ok(studioEntry.indexOf("studio-screenshot-authority-v183.js") > studioEntry.indexOf("studio-mobile-hardening-v181.js"));
  assert.equal(release181.release, "studio-mobile-hardening-v181-20260731");
  assert.equal(release181.repairs.contentEditorMobileGeometryBounded, true);
  assert.equal(release181.repairs.operationalPagesNormalFlowOnMobile, true);
  assert.equal(release181.repairs.drawerRemainsInteractive, true);
  assert.equal(release181.repairs.naraSmallMediumRemainNonmodal, true);
  assert.equal(release183.release, "studio-screenshot-authority-v183-20260731");
  assert.equal(release183.repairs.drawerMenuRemainsInteractive, true);
  assert.equal(release183.repairs.headingsDoNotBreakPerLetter, true);
  assert.equal(release183.repairs.naraSmallMediumRemainNonmodal, true);
});

test("v182 and v183 release probes are factual and keep unsupported scale claims disabled", () => {
  assert.equal(release182.release, RELEASE);
  assert.equal(release182.status, "candidate");
  assert.equal(release182.basedOn, "studio-mobile-hardening-v181-20260731");
  assert.equal(release182.routeAuthority.apex, "ngeblogging.com/*");
  assert.equal(release182.routeAuthority.www, "www.ngeblogging.com/*");
  assert.equal(release182.routeAuthority.tenantWildcard, "*.ngeblogging.com/*");
  assert.equal(release182.routeAuthority.legacyWhiteR4Rejected, true);
  assert.equal(release182.preserved.sessionUntilExplicitLogout, true);
  assert.equal(release182.authentication.providerEndToEndVerificationRequired, true);
  assert.equal(release182.authentication.massLoginCapacityClaimed, false);
  assert.equal(release183.status, "candidate");
  assert.equal(release183.verification.providerLoginEndToEndStillRequiresRealProviderInteraction, true);
  assert.equal(release183.verification.massLoginCapacityClaimed, false);
  assert.doesNotMatch(JSON.stringify({ release182, release183 }), /900\s*(juta|miliar)/i);
});
