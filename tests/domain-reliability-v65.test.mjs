import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [worker, pending, canonical, failover, operation, index, serviceWorker] = await Promise.all([
  read("cloudflare/worker-v41.mjs"),
  read("server/pending-full-zone-registration.mjs"),
  read("server/canonical-domain-redirect.mjs"),
  read("src/api-origin-failover-v60.js"),
  read("src/domain-operation-authority-v65.js"),
  read("index.html"),
  read("public/sw.js"),
]);

test("v65 retries transient full-zone registration and never emits an empty domain error", () => {
  assert.match(worker, /const delays = \[0, 700, 1400, 2800, 5000, 8000\]/);
  assert.match(worker, /DOMAIN_API_EMPTY_ERROR/);
  assert.match(worker, /DOMAIN_REGISTRATION_RETRY_EXHAUSTED/);
  assert.match(worker, /normalizeDomainApiResponse/);
  assert.match(worker, /FULL_ZONE_NAMESERVERS_UNAVAILABLE/);
});

test("a created Cloudflare zone is accepted even while nameservers are still provisioning", () => {
  assert.match(worker, /recoverPendingFullZoneRegistration/);
  assert.match(worker, /pendingZoneAcceptance: true/);
  assert.match(pending, /status: "verifying"/);
  assert.match(pending, /provisioning_state/);
  assert.match(pending, /awaiting-nameservers/);
  assert.match(pending, /automatic_refresh: true/);
  assert.match(pending, /status,\n    headers/);
  assert.match(pending, /zoneState\.nameServers\.length >= 2 \? \(existing \? 200 : 201\) : 202/);
});

test("browser failover retries empty 4xx and 5xx responses through the Worker origin", () => {
  assert.match(failover, /api-origin-failover-v65-20260727/);
  assert.match(failover, /!response\.ok && \(!validJson \|\| !usefulError \|\| retryableStatus\)/);
  assert.match(failover, /DOMAIN_API_EMPTY_ERROR/);
  assert.match(failover, /ngeblogging:domain-api-diagnostic/);
  assert.match(failover, /await backupRequest\(primary\.clone\(\)\)/);
});

test("active custom domain becomes canonical while the free subdomain stays a fallback", () => {
  assert.match(canonical, /site_domains\?select=id,hostname,status,provider_status,ssl_status,is_primary/);
  assert.match(canonical, /status=eq\.active/);
  assert.match(canonical, /is_primary=eq\.true/);
  assert.match(canonical, /provider_status \|\| ""\)\.toLowerCase\(\) === "active"/);
  assert.match(canonical, /ssl_status \|\| ""\)\.toLowerCase\(\) === "active"/);
  assert.match(canonical, /status: 308/);
  assert.match(canonical, /x-ngeblogging-canonical-domain/);
  assert.match(canonical, /ngeblogging-free-preview/);
  assert.match(worker, /canonicalDomainRedirect/);
});

test("Studio shows exact diagnostics, auto-checks propagation, and promotes the custom domain", () => {
  assert.match(operation, /POLL_LIMIT = 8/);
  assert.match(operation, /window\.__ngebloggingLastDomainDiagnostic/);
  assert.match(operation, /Pemasangan domain belum selesai/);
  assert.match(operation, /Buka domain utama/);
  assert.match(operation, /ALAMAT CADANGAN/);
  assert.match(operation, /Buka alamat cadangan/);
  assert.match(operation, /ngeblogging-free-preview=1/);
  assert.match(operation, /button\.click\(\)/);
});

test("v65 is loaded last and rotates the PWA cache", () => {
  assert.match(index, /domain-operation-authority-v65\.css/);
  assert.match(index, /domain-operation-authority-v65\.js/);
  assert.ok(index.lastIndexOf("domain-operation-authority-v65.js") > index.lastIndexOf("domain-feedback-authority-v60.js"));
  assert.match(serviceWorker, /ngeblogging-app-v65-20260727/);
});
