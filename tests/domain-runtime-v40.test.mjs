import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("health exposes full-zone runtime binding readiness without secret values", async () => {
  const worker = await read("cloudflare/worker-v37.mjs");
  for (const marker of [
    "customDomainBindings",
    "CUSTOM_DOMAIN_PROVIDER",
    "apiToken",
    "accountId",
    "workerService",
    "databaseAccess",
    "customDomains: domain.ready",
  ]) {
    assert.ok(worker.includes(marker), marker);
  }
  assert.doesNotMatch(worker, /customDomainBindings[\s\S]{0,500}CLOUDFLARE_API_TOKEN\s*:/);
  assert.doesNotMatch(worker, /serviceRole/);
});

test("Cloudflare workflow safely provisions full-zone bindings and reports missing ones", async () => {
  const workflow = await read(".github/workflows/cloudflare.yml");
  for (const marker of [
    "Resolve the active ngeblogging.com zone",
    "Build active-zone Wrangler configuration",
    "Synchronize available custom-domain runtime secrets",
    "put_secret_if_present CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_ACCOUNT_ID",
    "CUSTOM_DOMAIN_PROVIDER",
    "CLOUDFLARE_WORKER_SERVICE",
    "SUPABASE_PUBLISHABLE_KEY",
    "DOMAIN_RUNTIME_EXPECTED",
    "health.customDomains",
    "health.customDomainBindings",
    "service-worker-v40",
  ]) assert.ok(workflow.includes(marker), marker);
  assert.match(workflow, /cloudflare-full-zone/);
});
