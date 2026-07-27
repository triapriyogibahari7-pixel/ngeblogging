import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("production uses the free full-zone provider and keeps SaaS optional", async () => {
  const [wranglerSource, worker, index] = await Promise.all([
    read("wrangler.production.jsonc"),
    read("cloudflare/worker-v67.mjs"),
    read("index.html"),
  ]);
  const wrangler = JSON.parse(wranglerSource);

  assert.equal(wrangler.vars.CUSTOM_DOMAIN_PROVIDER, "cloudflare-full-zone");
  assert.equal(wrangler.vars.CUSTOM_DOMAIN_DNS_V67, "false");
  assert.equal(wrangler.vars.CLOUDFLARE_SAAS_ENABLED, "false");
  assert.equal(wrangler.vars.FREE_SUBDOMAIN_MODE, "persistent");
  assert.equal(wrangler.vars.CUSTOM_DOMAIN_REDIRECT_MODE, "canonical-308");

  for (const marker of [
    "shouldUseSaasDomainEngine",
    "state.active",
    "freeSubdomainPersistent: true",
    "freeSubdomainDeletedOnCustomDomain: false",
    "pathAndQueryPreserved: true",
    "customDomainPaidSaasRequired: false",
    "Full Zone is the production default",
  ]) assert.ok(worker.includes(marker), marker);

  assert.ok(index.includes('name="ngeblogging-free-subdomain" content="persistent"'));
  assert.ok(index.includes('src="/src/domain-full-zone-v54.js"'));
  assert.ok(index.includes('src="/src/domain-dns-v67.js" data-disabled-authority="full-zone-free-v71"'));
});
