import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("production routes every Cloudflare for SaaS hostname through the Worker", async () => {
  const [wranglerSource, builder] = await Promise.all([
    read("wrangler.production.jsonc"),
    read("scripts/build-active-zone-wrangler.mjs"),
  ]);
  const wrangler = JSON.parse(wranglerSource);
  const patterns = wrangler.routes.map((route) => route.pattern);

  assert.deepEqual(patterns, [
    "*/*",
    "ngeblogging.com/*",
    "www.ngeblogging.com/*",
    "*.ngeblogging.com/*",
  ]);
  assert.equal(wrangler.vars.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET, "connect.ngeblogging.com");
  assert.equal(wrangler.vars.CLOUDFLARE_CUSTOM_ORIGIN, "connect.ngeblogging.com");
  assert.equal(wrangler.vars.CUSTOM_DOMAIN_DNS_V67, "true");

  for (const marker of [
    '"*/*"',
    '"ngeblogging.com/*"',
    '"www.ngeblogging.com/*"',
    '"*.ngeblogging.com/*"',
    "requiredPatterns",
    "route catch-all SaaS",
  ]) assert.ok(builder.includes(marker), marker);
});

test("deployment provisions and audits the complete SaaS origin chain", async () => {
  const workflow = await read(".github/workflows/custom-domain-saas-v68.yml");

  for (const marker of [
    "Ngeblogging SaaS origin v68",
    "/custom_hostnames?per_page=5",
    "/custom_hostnames/fallback_origin",
    "connect.ngeblogging.com",
    "100::",
    "proxied: true",
    "pattern === '*/*'",
    "script === workerService",
    "customDomainDnsV67",
    "activationReady === true",
    "dnsMode === 'two-cname'",
    "dns.google/resolve",
    "customHostnamesApi = true",
    "catchAllWorkerRoute = true",
    "fallbackOrigin",
    "publicDns",
  ]) assert.ok(workflow.includes(marker), marker);

  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE_KEY|service_role/);
});
