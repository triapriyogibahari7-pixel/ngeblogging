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

test("Cloudflare workflow provisions and verifies all domain server bindings", async () => {
  const workflow = await read(".github/workflows/cloudflare.yml");
  for (const marker of [
    "Synchronize custom-domain runtime secrets",
    "put_secret CLOUDFLARE_API_TOKEN",
    "put_secret CLOUDFLARE_ZONE_ID",
    "put_secret CLOUDFLARE_CUSTOM_HOSTNAME_TARGET",
    "put_secret SUPABASE_SERVICE_ROLE_KEY",
    "health.customDomains",
    "health.customDomainBindings",
    "service-worker-v39",
  ]) assert.ok(workflow.includes(marker), marker);
});
