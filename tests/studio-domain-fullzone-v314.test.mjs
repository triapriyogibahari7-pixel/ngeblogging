import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('v314 selects Full Zone in production without weakening verified-active semantics', async () => {
  const [wrangler, handler, release] = await Promise.all([
    read('wrangler.production.jsonc'),
    read('server/domain-handler.mjs'),
    read('public/release-v314.json'),
  ]);
  assert.match(wrangler, /"CUSTOM_DOMAIN_PROVIDER": "cloudflare-full-zone"/);
  assert.match(wrangler, /"CUSTOM_DOMAIN_MIGRATION_RELEASE": "domain-legacy-to-full-zone-v314-20260806"/);
  assert.match(handler, /DOMAIN_FULL_ZONE_MIGRATION_RELEASE_V314/);
  assert.match(handler, /zoneState\.active && attached/);
  assert.match(handler, /workerDomainsReady\(workerDomains\)/);
  assert.match(release, /"fakeActiveStatusAllowed": false/);
  assert.match(release, /"activeRequiresZoneAndWorkerCertificate": true/);
});

test('v314 migrates legacy rows during refresh and clears the stale primary URL first', async () => {
  const handler = await read('server/domain-handler.mjs');
  assert.match(handler, /migratingLegacyDomain/);
  assert.match(handler, /customDomainProvider\(env\) === "cloudflare-full-zone"/);
  assert.match(handler, /domain\.provider !== "cloudflare-full-zone"/);
  assert.match(handler, /return registerFullZoneDomain\(/);
  assert.match(handler, /custom_domain: null/);
  assert.match(handler, /migratedFromProvider/);
  assert.doesNotMatch(handler, /code: "DOMAIN_PROVIDER_MISMATCH"/);
});

test('v314 keeps the free subdomain and v312 domain auto-reconcile UI', async () => {
  const [domainPanel, release] = await Promise.all([
    read('src/DomainPanelV124.jsx'),
    read('public/release-v314.json'),
  ]);
  assert.match(domainPanel, /SUBDOMAIN GRATIS/);
  assert.match(domainPanel, /ngeblogging\.com/);
  assert.match(domainPanel, /routing Worker sedang disinkronkan otomatis/);
  assert.match(release, /"freeSubdomainPreserved": true/);
  assert.match(release, /"customDomainAutoReconcilePreserved": true/);
});

test('v314 domain release cannot touch sidebar, Nara or shared editor source', async () => {
  const patch = await read('scripts/patch-domain-fullzone-v314.mjs');
  assert.doesNotMatch(patch, /studio-sidebar|sn-side|sn-logo-mark|ContentEditor\.jsx|NaraAssistant\.jsx/);
  assert.match(patch, /server\/domain-handler\.mjs/);
  assert.match(patch, /wrangler\.production\.jsonc/);
});
