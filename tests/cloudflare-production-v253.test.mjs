import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workflow = read(".github/workflows/cloudflare-production-v227.yml");
const wrangler = read("wrangler.production.jsonc");
const release = JSON.parse(read("public/release-v253.json"));

test("Cloudflare production workflow is the v253 authority on production pushes", () => {
  assert.match(workflow, /name: Ngeblogging production v253 live authority/);
  assert.match(workflow, /branches:\s*\n\s*- production/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /group: ngeblogging-production-v253/);
  assert.match(workflow, /deploy-v253:/);
  assert.match(workflow, /environment: cloudflare-production/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
  assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID: \$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/);
});

test("workflow deploys the built Worker and assets rather than stopping at dry-run", () => {
  assert.match(workflow, /npm run test:production/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /wrangler deploy --config wrangler\.production\.active-zone\.jsonc --dry-run/);
  assert.match(workflow, /Deploy Worker and current assets[\s\S]*wrangler deploy --config wrangler\.production\.active-zone\.jsonc --keep-vars/);
  assert.match(workflow, /finalize-cloudflare-route-cutover-v182\.mjs/);
});

test("live workflow requires v253 on Workers.dev, apex Studio and tenant and rejects WHITE-R4", () => {
  assert.match(workflow, /release-v253\.json/);
  assert.match(workflow, /studio-shell-nara-v253-20260804/);
  assert.match(workflow, /WORKERS_DEV_V253_VERIFIED/);
  assert.match(workflow, /PRODUCTION_V253_APEX_AUTH_STUDIO_TENANT_VERIFIED/);
  assert.match(workflow, /WHITE-R4-2026\.07\.12/);
  assert.match(workflow, /--v253-side-open/);
  assert.match(workflow, /nara-floating-button/);
  assert.match(workflow, /\/login \/signup \/studio \/release-v253\.json/);
  assert.match(workflow, /TENANT_SMOKE_TEST_URL/);
  assert.match(workflow, /context:'ngeblogging\/production-v253'/);
});

test("v253 release marker is factual and keeps unverified scale/OAuth claims false", () => {
  assert.equal(release.release, "studio-shell-nara-v253-20260804");
  assert.equal(release.responsive.largeSidebarAlwaysPresent, true);
  assert.equal(release.sidebar.singleNControl, true);
  assert.equal(release.nara.launcherFixedToLowerRightSafeArea, true);
  assert.equal(release.nara.attachmentMenuNotClipped, true);
  assert.equal(release.serviceWorker.version, "ngeblogging-app-v253-shell-nara-20260804");
  assert.equal(release.serviceWorker.cache, "studio-shell-nara-cache-v253");
  assert.equal(release.serviceWorker.forcedWindowNavigation, false);
  assert.equal(release.authentication.persistSessionPreserved, true);
  assert.equal(release.authentication.automaticLogoutAdded, false);
  assert.equal(release.claims.massCapacityClaimed, false);
  assert.equal(release.claims.providerOAuthEndToEndClaimed, false);
  assert.equal(release.claims.liveCloudflareVerificationRequired, true);
});

test("production Worker remains authoritative for apex, www and wildcard tenant assets", () => {
  assert.match(wrangler, /"pattern": "ngeblogging\.com", "custom_domain": true/);
  assert.match(wrangler, /"pattern": "www\.ngeblogging\.com", "custom_domain": true/);
  assert.match(wrangler, /"pattern": "\*\.ngeblogging\.com\/\*", "zone_name": "ngeblogging\.com"/);
  assert.match(wrangler, /"directory": "\.\/dist\/"/);
  assert.match(wrangler, /"run_worker_first": true/);
});
