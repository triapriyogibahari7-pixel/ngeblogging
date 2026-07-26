import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("health exposes custom-domain runtime binding readiness without secret values", async () => {
  const worker = await read("cloudflare/worker-v37.mjs");
  for (const marker of ["customDomainBindings", "apiToken", "zoneId", "cnameTarget", "serviceRole", "customDomains: domain.ready"]) {
    assert.ok(worker.includes(marker), marker);
  }
  assert.doesNotMatch(worker, /customDomainBindings[\s\S]{0,500}CLOUDFLARE_API_TOKEN\s*:/);
});

test("Cloudflare workflow safely provisions available domain bindings and reports missing ones", async () => {
  const workflow = await read(".github/workflows/cloudflare.yml");
  for (const marker of [
    "Synchronize available custom-domain runtime secrets",
    "put_secret_if_present CLOUDFLARE_API_TOKEN",
    "put_secret_if_present CLOUDFLARE_ZONE_ID",
    "put_secret_if_present CLOUDFLARE_CUSTOM_HOSTNAME_TARGET",
    "put_secret_if_present SUPABASE_SERVICE_ROLE_KEY",
    "DOMAIN_RUNTIME_EXPECTED",
    "health.customDomains",
    "health.customDomainBindings",
    "service-worker-v39",
  ]) assert.ok(workflow.includes(marker), marker);
  assert.match(workflow, /Custom domain tetap dikunci, fitur inti tetap dideploy/);
});
