import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const builder = read("scripts/build-precutover-wrangler-v217.mjs");
const workflow = read(".github/workflows/production-route-v217.yml");
const cutover = read("scripts/finalize-cloudflare-route-cutover-v182.mjs");
const release = JSON.parse(read("public/release-v216.json"));

const ACTIVATION = "production-route-activation-v217-20260802";

test("v217 pre-cutover upload cannot claim apex or www before the stale Worker Domain is removed", () => {
  assert.match(builder, new RegExp(ACTIVATION));
  assert.match(builder, /config\.routes = \[/);
  assert.match(builder, /\*\.ngeblogging\.com\/\*/);
  assert.match(builder, /zone_id: zoneId/);
  assert.doesNotMatch(builder, /custom_domain:\s*true/);
  assert.doesNotMatch(builder, /pattern:\s*"ngeblogging\.com"/);
  assert.doesNotMatch(builder, /pattern:\s*"www\.ngeblogging\.com"/);
  assert.match(builder, /CURRENT_STUDIO_UI_RELEASE:\s*"studio-production-v216-20260802"/);
});

test("v217 deployment proves workers.dev first and only then mutates apex routes", () => {
  for (const marker of [
    "Ngeblogging production route activation v217",
    "environment: cloudflare-production",
    "npm run build",
    "build-precutover-wrangler-v217.mjs",
    "wrangler.production.precutover-v217.jsonc",
    "Deploy new Worker and assets before apex cutover",
    "Verify v216 bundle on workers.dev before route mutation",
    "Detach stale Worker Domains and install authoritative apex routes v217",
    "finalize-cloudflare-route-cutover-v182.mjs",
    "/release-v216.json",
    "WHITE-R4-2026.07.12",
    "PRODUCTION_ROUTE_V217_VERIFIED",
    "Ngeblogging production route v217",
  ]) assert.ok(workflow.includes(marker), `workflow missing ${marker}`);

  const deploy = workflow.indexOf("Deploy new Worker and assets before apex cutover");
  const workerVerify = workflow.indexOf("Verify v216 bundle on workers.dev before route mutation");
  const cutoverStep = workflow.indexOf("Detach stale Worker Domains and install authoritative apex routes v217");
  const liveVerify = workflow.indexOf("Verify live apex auth Studio tenant and v216 marker");
  assert.ok(deploy >= 0 && workerVerify > deploy && cutoverStep > workerVerify && liveVerify > cutoverStep);
  assert.doesNotMatch(workflow, /run:\s*node scripts\/finalize-cloudflare-routes-v175\.mjs/);
});

test("v217 retains the v184 authoritative route finalizer contract", () => {
  for (const marker of [
    'EXACT_HOSTNAMES = Object.freeze(["ngeblogging.com", "www.ngeblogging.com"])',
    'EXACT_ROUTES = Object.freeze(["ngeblogging.com/*", "www.ngeblogging.com/*"])',
    'TENANT_ROUTE = "*.ngeblogging.com/*"',
    "detachExactWorkerDomains",
    "installAuthoritativeRoutes",
    "verifyFinalState",
  ]) assert.ok(cutover.includes(marker), `cutover missing ${marker}`);
});

test("v217 live gate validates the factual v216 release instead of unsupported capacity claims", () => {
  assert.equal(release.release, "studio-production-v216-20260802");
  assert.equal(release.preserved.themeCount, 100);
  assert.equal(release.preserved.widgetCount, 26);
  assert.equal(release.preserved.fourLeftAndFourRightWidgetAreas, true);
  assert.equal(release.preserved.postPageWordLimit, 5000);
  assert.equal(release.validation.fakeProductionAnalyticsAdded, false);
  assert.equal(release.validation.massCapacityClaimed, false);
  assert.equal(release.validation.nineHundredMillionOrBillionLoginSimulationClaimed, false);
  assert.match(workflow, /massCapacityClaimed!==false/);
});
