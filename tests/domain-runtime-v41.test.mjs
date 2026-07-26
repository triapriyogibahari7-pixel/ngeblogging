import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v41 health reports safe custom-domain readiness without service role", async () => {
  const worker = await read("cloudflare/worker-v41.mjs");
  for (const marker of ["2026.07.26-custom-domains-v41", "apiToken", "zoneId", "cnameTarget", "databaseAccess", "providerApi", "CLOUDFLARE_CUSTOM_HOSTNAMES_READY", "serviceRoleRequired: false", 'databaseMode: "user-jwt-rls"', "customDomainServiceRoleRequired"]) assert.ok(worker.includes(marker), marker);
  assert.doesNotMatch(worker, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("domain storage uses authenticated user JWT and Supabase RLS", async () => {
  const handler = await read("server/domain-handler.mjs");
  for (const marker of ["userHeaders", "userJson", "authorization: `Bearer ${token}`", 'databaseMode: "user-jwt-rls"']) assert.ok(handler.includes(marker), marker);
  assert.doesNotMatch(handler, /SUPABASE_SERVICE_ROLE_KEY|adminHeaders|adminJson/);
});

test("production routes and authoritative post-deploy activation are preserved", async () => {
  const [wrangler, workflow, index, studio, domains] = await Promise.all([read("wrangler.production.jsonc"), read(".github/workflows/custom-domains-v41.yml"), read("index.html"), read("src/studio-domain-v41.js"), read("src/studio-domains-v41.js")]);
  for (const marker of ['"main": "./cloudflare/worker-v41.mjs"', '"CLOUDFLARE_CUSTOM_HOSTNAME_TARGET": "ngeblogging.com"', '"CUSTOM_DOMAIN_DATABASE_MODE": "user-jwt-rls"', '"pattern": "ngeblogging.com/*"', '"pattern": "*.ngeblogging.com/*"']) assert.ok(wrangler.includes(marker), marker);
  for (const marker of ["zones?name=ngeblogging.com&status=active", "/custom_hostnames?per_page=5", "wrangler secret bulk", "wrangler.production.active-zone.jsonc", "build-active-zone-wrangler.mjs", "CLOUDFLARE_CUSTOM_HOSTNAMES_READY", "RESOLVED_ZONE_ID", "customDomainServiceRoleRequired", "Ngeblogging custom domains"]) assert.ok(workflow.includes(marker), marker);
  assert.ok(index.includes('/src/studio-layout-device-v40.js'));
  assert.ok(index.includes('/src/studio-domain-v41.js'));
  assert.ok(studio.includes("Penyimpanan JWT + RLS"));
  assert.ok(studio.includes("service-role server tidak diperlukan"));
  assert.ok(domains.includes("CLOUDFLARE CUSTOM HOSTNAMES API"));
  assert.ok(domains.includes("SSL and Certificates Read/Write"));
});
