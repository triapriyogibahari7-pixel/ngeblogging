import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("legacy recovery source preserves the permanent free-subdomain contract", async () => {
  const runtime = await read("src/domain-free-subdomain-recovery-v73.js");
  for (const marker of [
    "domain-loading-recovery-v74-20260727",
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

test("legacy recovery source has bounded latency but is quarantined from production ownership", async () => {
  const [runtime, index] = await Promise.all([
    read("src/domain-free-subdomain-recovery-v73.js"),
    read("index.html"),
  ]);
  for (const marker of [
    "DOMAIN_API_DEADLINE_MS = 12_000",
    "DOMAIN_SPINNER_DEADLINE_MS = 14_000",
    "boundedDomainFetch",
    "DOMAIN_API_HARD_DEADLINE",
    "deadlineResponse",
    "stopInfiniteSpinner",
    "Panel domain berhenti menunggu.",
    "data-action=\"reload\"",
    "Subdomain gratis tetap aktif",
    "ngeblogging:domain-api-diagnostic",
  ]) assert.ok(runtime.includes(marker), marker);
  assert.ok(index.includes('type="application/x-disabled" src="/src/domain-free-subdomain-recovery-v73.js" data-disabled-authority="domain-v76"'));
  assert.ok(!index.includes('<script type="module" src="/src/domain-free-subdomain-recovery-v73.js"></script>'));
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

test("single v75 domain authority replaces every active legacy owner and PWA moves to v76", async () => {
  const [index, worker] = await Promise.all([
    read("index.html"),
    read("public/sw.js"),
  ]);
  assert.ok(index.includes('name="ngeblogging-free-subdomain-runtime" content="/src/domain-authority-v75.js"'));
  assert.ok(index.includes('name="ngeblogging-domain-authority" content="single-domain-authority-v76"'));
  for (const legacy of [
    "domain-full-zone-v54.js",
    "domain-layout-authority-v56.js",
    "domain-experience-authority-v59.js",
    "domain-feedback-authority-v60.js",
    "domain-mobile-precision-v61.js",
    "domain-operation-authority-v65.js",
  ]) assert.ok(index.includes(`type="application/x-disabled" src="/src/${legacy}"`), legacy);
  assert.ok(worker.includes('const VERSION = "ngeblogging-app-v76-20260727"'));
  assert.ok(worker.includes("ngeblogging-app-v75-20260727"));
  assert.ok(worker.includes("ngeblogging-app-v74-20260727"));
  assert.ok(worker.includes("ngeblogging-app-v73-20260727"));
  assert.ok(worker.includes("ngeblogging-app-v65-20260727"));
});
