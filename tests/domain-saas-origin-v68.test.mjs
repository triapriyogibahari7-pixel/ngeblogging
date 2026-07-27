import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Wrangler keeps native routes and production disables the optional SaaS engine", async () => {
  const [wranglerSource, builder] = await Promise.all([
    read("wrangler.production.jsonc"),
    read("scripts/build-active-zone-wrangler.mjs"),
  ]);
  const wrangler = JSON.parse(wranglerSource);
  assert.deepEqual(wrangler.routes.map((route) => route.pattern), [
    "ngeblogging.com/*",
    "www.ngeblogging.com/*",
    "*.ngeblogging.com/*",
  ]);
  assert.equal(wrangler.vars.CUSTOM_DOMAIN_PROVIDER, "cloudflare-full-zone");
  assert.equal(wrangler.vars.CUSTOM_DOMAIN_DNS_V67, "false");
  assert.equal(wrangler.vars.CLOUDFLARE_SAAS_ENABLED, "false");
  assert.equal(wrangler.vars.FREE_SUBDOMAIN_MODE, "persistent");
  assert.ok(builder.includes("route SaaS catch-all dikelola terpisah melalui API"));
  assert.ok(!builder.includes('"*/*",'));
});

test("the paid SaaS audit is manual, optional, and read-only", async () => {
  const workflow = await read(".github/workflows/custom-domain-saas-v68.yml");

  for (const marker of [
    "Cloudflare for SaaS optional manual audit",
    "workflow_dispatch:",
    "manual-read-only",
    "productionProvider: 'cloudflare-full-zone'",
    "requiredForProduction: false",
    "/custom_hostnames?per_page=5",
    "customHostnamesTokenProbes",
    "source: 'domain'",
    "source: 'deploy'",
    "customDomainPaidSaasRequired",
    "freeSubdomainPersistent",
    "fs.writeFileSync(evidencePath",
    "Upload optional SaaS audit evidence",
  ]) assert.ok(workflow.includes(marker), marker);

  assert.doesNotMatch(workflow, /branches:\s*\[main\]|createCommitStatus|method:\s*'POST'|method:\s*'PUT'|workers\/routes|fallback_origin|100::|proxied:\s*true/);
  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY|service_role/);
});
