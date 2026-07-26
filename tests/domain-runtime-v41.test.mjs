import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v55 health reports safe full-zone readiness without service role", async () => {
  const worker = await read("cloudflare/worker-v41.mjs");
  for (const marker of [
    "2026.07.26-full-zone-domains-v55",
    "cloudflare-full-zone",
    "full-zone-nameserver",
    "apiToken",
    "accountId",
    "workerService",
    "databaseAccess",
    "serviceRoleRequired: false",
    'databaseMode: "user-jwt-rls"',
    "customDomainServiceRoleRequired",
  ]) assert.ok(worker.includes(marker), marker);
  assert.doesNotMatch(worker, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("domain storage uses authenticated user JWT and Supabase RLS", async () => {
  const handler = await read("server/domain-handler.mjs");
  for (const marker of ["userHeaders", "userJson", "authorization: `Bearer ${token}`", 'databaseMode: "user-jwt-rls"']) assert.ok(handler.includes(marker), marker);
  assert.doesNotMatch(handler, /SUPABASE_SERVICE_ROLE_KEY|adminHeaders|adminJson/);
});

test("production routes and full-zone post-deploy audit are preserved", async () => {
  const [wrangler, workflow, index, studio] = await Promise.all([
    read("wrangler.production.jsonc"),
    read(".github/workflows/custom-domains-v41.yml"),
    read("index.html"),
    read("src/studio-domain-v41.js"),
  ]);

  for (const marker of [
    '"main": "./cloudflare/worker-v41.mjs"',
    '"CUSTOM_DOMAIN_PROVIDER": "cloudflare-full-zone"',
    '"CLOUDFLARE_WORKER_SERVICE": "ngeblogging"',
    '"CUSTOM_DOMAIN_DATABASE_MODE": "user-jwt-rls"',
    '"pattern": "ngeblogging.com/*"',
    '"pattern": "*.ngeblogging.com/*"',
  ]) assert.ok(wrangler.includes(marker), marker);

  for (const marker of [
    "cloudflare-full-zone",
    "full-zone-nameserver",
    "workers/scripts",
    "wrangler.production.active-zone.jsonc",
    "build-active-zone-wrangler.mjs",
    "RESOLVED_CLOUDFLARE_ACCOUNT_ID",
    "customDomainServiceRoleRequired",
    "Ngeblogging custom domains",
    "siteCapacity",
  ]) assert.ok(workflow.includes(marker), marker);

  assert.doesNotMatch(workflow, /custom_hostnames\?per_page|CLOUDFLARE_CUSTOM_HOSTNAMES_READY|wrangler secret bulk/);
  assert.ok(index.includes('/src/studio-layout-device-v40.js'));
  assert.ok(index.includes('/src/studio-domain-v41.js'));
  assert.ok(index.includes('/src/domain-full-zone-v54.js'));
  assert.ok(studio.includes("Penyimpanan JWT + RLS"));
  assert.ok(studio.includes("service-role server tidak diperlukan"));
});
