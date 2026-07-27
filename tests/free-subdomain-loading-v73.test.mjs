import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("persistent free subdomain is recovered independently from custom-domain API", async () => {
  const runtime = await read("src/domain-free-subdomain-recovery-v73.js");
  for (const marker of [
    "domain-free-subdomain-recovery-v73-20260727",
    "ACTIVE_SITE_STORAGE_KEY",
    "listUserSites",
    "Memuat subdomain gratis…",
    ".ngeblogging.com",
    "Subdomain gratis aktif permanen",
    "ngeblogging:active-site-ready",
    "ngeblogging-free-preview=1",
    "MutationObserver",
    "SITE_CONTEXT_TIMEOUT",
  ]) assert.ok(runtime.includes(marker), marker);
  assert.doesNotMatch(runtime, /SUPABASE_SERVICE_ROLE_KEY|service_role/);
});

test("domain API failover has bounded primary and backup latency", async () => {
  const source = await read("src/api-origin-failover-v60.js");
  for (const marker of [
    "api-origin-failover-v73-20260727",
    "PRIMARY_TIMEOUT_MS = 8_000",
    "BACKUP_TIMEOUT_MS = 10_000",
    "timedNativeFetch",
    "TimeoutError",
    "DOMAIN_API_TIMEOUT",
    "Subdomain gratis tetap dapat digunakan",
  ]) assert.ok(source.includes(marker), marker);
  assert.ok(source.includes("timedNativeFetch(primary.clone(), PRIMARY_TIMEOUT_MS"));
  assert.ok(source.includes("timedNativeFetch(secondaryRequest, BACKUP_TIMEOUT_MS"));
});

test("recovery loads before the full-zone domain authority and invalidates stale PWA caches", async () => {
  const [index, worker] = await Promise.all([
    read("index.html"),
    read("public/sw.js"),
  ]);
  const recoveryTag = '<script type="module" src="/src/domain-free-subdomain-recovery-v73.js"></script>';
  const fullZoneTag = '<script type="module" src="/src/domain-full-zone-v54.js"></script>';
  const recovery = index.indexOf(recoveryTag);
  const fullZone = index.indexOf(fullZoneTag);
  assert.ok(recovery > 0, "recovery runtime missing");
  assert.ok(fullZone > recovery, "recovery must load before full-zone UI");
  assert.ok(index.includes('name="ngeblogging-free-subdomain-runtime"'));
  assert.ok(worker.includes('const VERSION = "ngeblogging-app-v73-20260727"'));
  assert.ok(worker.includes("ngeblogging-app-v65-20260727"));
});
