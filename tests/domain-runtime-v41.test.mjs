import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("current health reports safe full-zone readiness without service role", async () => {
  const worker = await read("cloudflare/worker-v41.mjs");
  for (const marker of [
    "2026.07.27-full-zone-domains-v65",
    "cloudflare-full-zone",
    "full-zone-nameserver",
    "apiToken",
    "accountId",
    "workerService",
    "databaseAccess",
    "serviceRoleRequired: false",
    'databaseMode: "user-jwt-rls"',
    "customDomainServiceRoleRequired",
    "canonicalCustomDomain",
  ]) assert.ok(worker.includes(marker), marker);
  assert.doesNotMatch(worker, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("domain storage uses authenticated user JWT and Supabase RLS", async () => {
  const handler = await read("server/domain-handler.mjs");
  for (const marker of ["userHeaders", "userJson", "authorization: `Bearer ${token}`", 'databaseMode: "user-jwt-rls"']) assert.ok(handler.includes(marker), marker);
  assert.doesNotMatch(handler, /SUPABASE_SERVICE_ROLE_KEY|adminHeaders|adminJson/);
});

test("production routes preserve the v41 full-zone audit while SaaS remains optional", async () => {
  const [wrangler, workflow, index, studio, workerV67, handlerV67, dnsUiV67] = await Promise.all([
    read("wrangler.production.jsonc"),
    read(".github/workflows/custom-domains-v41.yml"),
    read("index.html"),
    read("src/studio-domain-v41.js"),
    read("cloudflare/worker-v67.mjs"),
    read("server/domain-dns-v67-handler.mjs"),
    read("src/domain-dns-v67.js"),
  ]);

  for (const marker of [
    '"main": "./cloudflare/worker-v67.mjs"',
    '"CUSTOM_DOMAIN_PROVIDER": "cloudflare-full-zone"',
    '"CUSTOM_DOMAIN_DNS_V67": "false"',
    '"CLOUDFLARE_SAAS_ENABLED": "false"',
    '"FREE_SUBDOMAIN_MODE": "persistent"',
    '"CUSTOM_DOMAIN_REDIRECT_MODE": "canonical-308"',
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

  for (const marker of [
    'import baseWorker from "./worker-v41.mjs"',
    "shouldUseSaasDomainEngine",
    "state.active",
    "handleDomainDnsV67Request",
    "freeSubdomainPersistent: true",
    "freeSubdomainDeletedOnCustomDomain: false",
    "customDomainPaidSaasRequired: false",
  ]) assert.ok(workerV67.includes(marker), marker);

  for (const marker of [
    "connect.ngeblogging.com",
    "cloudflare-custom-hostnames",
    "user-jwt-rls",
    "verifyDnsContract",
    "findOrCreateProvider",
    'method: "http"',
    "status: state.status",
  ]) assert.ok(handlerV67.includes(marker), marker);
  assert.doesNotMatch(handlerV67, /SUPABASE_SERVICE_ROLE_KEY|service_role/);

  for (const marker of ["2 RECORD DNS WAJIB", "Host:", "DNS only / proxy nonaktif", "Salin 2 record"]) {
    assert.ok(dnsUiV67.includes(marker), marker);
  }

  assert.doesNotMatch(workflow, /custom_hostnames\?per_page|CLOUDFLARE_CUSTOM_HOSTNAMES_READY|wrangler secret bulk/);
  assert.ok(index.includes('/src/studio-layout-device-v40.js'));
  assert.ok(index.includes('/src/studio-domain-v41.js'));
  assert.ok(index.includes('/src/domain-full-zone-v54.js'));
  assert.ok(index.includes('/src/domain-operation-authority-v65.js'));
  assert.ok(index.includes('src="/src/domain-dns-v67.js" data-disabled-authority="full-zone-free-v71"'));
  assert.ok(index.includes('href="/src/domain-dns-v67.css" rel="stylesheet" media="not all"'));
  assert.ok(studio.includes("Penyimpanan JWT + RLS"));
  assert.ok(studio.includes("service-role server tidak diperlukan"));
});
