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
const release184 = JSON.parse(read("public/release-v184.json"));

const RELEASE = "production-route-cutover-v184-20260731";

test("v184 detaches stale Worker Domains and installs exact zone routes", () => {
  for (const marker of [
    RELEASE,
    'EXACT_HOSTNAMES = Object.freeze(["ngeblogging.com", "www.ngeblogging.com"])',
    'EXACT_ROUTES = Object.freeze(["ngeblogging.com/*", "www.ngeblogging.com/*"])',
    'TENANT_ROUTE = "*.ngeblogging.com/*"',
    "/workers/domains/", "/workers/routes", 'method: "DELETE"',
    'method: "PUT"', 'method: "POST"', "detachExactWorkerDomains",
    "installAuthoritativeRoutes", "verifyFinalState",
  ]) assert.ok(finalizer.includes(marker), `v184 finalizer missing ${marker}`);
  assert.ok(finalizer.indexOf("detachExactWorkerDomains()") < finalizer.indexOf("installAuthoritativeRoutes()"));
  assert.match(finalizer, /if \(String\(route\.script \|\| ""\) !== SERVICE\)/);
  assert.doesNotMatch(finalizer, /console\.log\([^)]*API_TOKEN/);
});

test("v184 deploy workflow keeps v182 and v183 then verifies the live domain", () => {
  for (const marker of [
    "Ngeblogging production route cutover v184",
    "Run complete v147-v183 regression and build",
    "finalize-cloudflare-routes-v175.mjs",
    "finalize-cloudflare-route-cutover-v182.mjs",
    "Cut over apex and www to authoritative zone routes v184",
    "Verify v182 site policy, v183 UI, and v184 route authority",
    "/release-v182.json",
    "/release-v183.json",
    "/release-v184.json",
    "WHITE-R4-2026.07.12",
    "PRODUCTION_ROUTE_CUTOVER_V184_VERIFIED",
    "production route cutover v184",
  ]) assert.ok(workflow.includes(marker), `v184 workflow missing ${marker}`);
  assert.ok(workflow.indexOf("Deploy Worker and assets") < workflow.indexOf("Attach exact Worker Domains and remove only conflicting apex routes"));
  assert.ok(workflow.indexOf("Attach exact Worker Domains and remove only conflicting apex routes") < workflow.indexOf("Cut over apex and www to authoritative zone routes v184"));
  assert.ok(workflow.indexOf("Cut over apex and www to authoritative zone routes v184") < workflow.indexOf("Verify v182 site policy, v183 UI, and v184 route authority"));
});

test("v182 site policy and v183 UI remain loaded before v184 route authority", () => {
  assert.match(studioEntry, /studio-mobile-runtime-v179\.js/);
  assert.match(studioEntry, /studio-production-recovery-v180\.js/);
  assert.match(studioEntry, /studio-mobile-hardening-v181\.js/);
  assert.match(studioEntry, /studio-screenshot-authority-v183\.js/);
  assert.ok(studioEntry.indexOf("studio-screenshot-authority-v183.js") > studioEntry.indexOf("studio-mobile-hardening-v181.js"));
  assert.equal(release181.release, "studio-mobile-hardening-v181-20260731");
  assert.equal(release182.release, "site-limit-summary-v182-20260731");
  assert.equal(release182.maxSitesPerAccount, 25);
  assert.equal(release182.repairs.domainLoadingStopsWithoutActiveSite, true);
  assert.equal(release182.repairs.summaryViewSiteActionPreserved, true);
  assert.equal(release182.repairs.topbarViewSiteActionPreserved, true);
  assert.equal(release183.release, "studio-screenshot-authority-v183-20260731");
  assert.equal(release183.repairs.drawerMenuRemainsInteractive, true);
  assert.equal(release183.repairs.headingsDoNotBreakPerLetter, true);
  assert.equal(release183.repairs.naraSmallMediumRemainNonmodal, true);
});

test("v184 route probe is factual and unsupported scale claims remain disabled", () => {
  assert.equal(release184.release, RELEASE);
  assert.equal(release184.status, "candidate");
  assert.equal(release184.basedOn, "studio-screenshot-authority-v183-20260731");
  assert.equal(release184.routeAuthority.apex, "ngeblogging.com/*");
  assert.equal(release184.routeAuthority.www, "www.ngeblogging.com/*");
  assert.equal(release184.routeAuthority.tenantWildcard, "*.ngeblogging.com/*");
  assert.equal(release184.routeAuthority.legacyWhiteR4Rejected, true);
  assert.equal(release184.preserved.maxSitesPerAccount, 25);
  assert.equal(release184.preserved.summaryViewSiteAction, true);
  assert.equal(release184.preserved.sessionUntilExplicitLogout, true);
  assert.equal(release184.authentication.providerEndToEndVerificationRequired, true);
  assert.equal(release184.authentication.massLoginCapacityClaimed, false);
  assert.equal(release183.verification.providerLoginEndToEndStillRequiresRealProviderInteraction, true);
  assert.equal(release183.verification.massLoginCapacityClaimed, false);
  assert.doesNotMatch(JSON.stringify({ release182, release183, release184 }), /900\s*(juta|miliar)/i);
});
