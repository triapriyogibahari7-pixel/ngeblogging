import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [worker, handler, feedback, styles] = await Promise.all([
  read("cloudflare/worker-v41.mjs"),
  read("server/quick-domain-detach-handler.mjs"),
  read("src/domain-feedback-authority-v60.js"),
  read("src/domain-feedback-authority-v60.css"),
]);

test("full-zone removal defaults to reversible detach", () => {
  assert.match(worker, /handleQuickDomainDetach/);
  assert.match(worker, /reversible-domain-detach-v64/);
  assert.match(worker, /url\.pathname === "\/api\/domains\/remove"/);
  assert.match(handler, /deleteZone === true \|\| body\?\.confirmFinal === true/);
  assert.match(handler, /zonePreserved: Boolean\(domain\.provider_hostname_id\)/);
  assert.match(handler, /nameserverChangeRequired: false/);
  assert.match(handler, /dapat dipasang kembali kapan saja/);
});

test("detach removes only site binding and Worker Domains", () => {
  assert.match(handler, /detachWorkerDomain/);
  assert.match(handler, /site_domains\?id=eq\./);
  assert.match(handler, /method: "DELETE"/);
  assert.match(handler, /custom_domain: null/);
  assert.doesNotMatch(handler, /deleteFullZone/);
});

test("reattach reuses the preserved zone and activates an already active zone", () => {
  assert.match(worker, /activateRegistrationWhenZoneIsAlreadyActive/);
  assert.match(worker, /\/api\/domains\/refresh/);
  assert.match(worker, /x-ngeblogging-domain-reattach/);
  assert.match(worker, /runRegistrationWithRecovery/);
});

test("Studio exposes one-click reattach while preserving the free address", () => {
  assert.match(feedback, /ngeblogging:last-reversible-domain-detach:v64/);
  assert.match(feedback, /Pasang kembali/);
  assert.match(feedback, /Alamat gratis/);
  assert.match(feedback, /Lepaskan dari situs/);
  assert.match(feedback, /form\.requestSubmit/);
  assert.match(styles, /\.d64-reattach/);
  assert.match(styles, /dapat dipasang lagi/);
});
