import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("active-zone config resolves and exports the account that owns ngeblogging.com", async () => {
  const script = await read("scripts/build-active-zone-wrangler.mjs");

  assert.match(script, /fetch\(`https:\/\/api\.cloudflare\.com\/client\/v4\/zones\/\$\{zoneId\}`/);
  assert.match(script, /zone\?\.account\?\.id/);
  assert.match(script, /zone\.name !== "ngeblogging\.com"/);
  assert.match(script, /config\.account_id = accountId/);
  assert.match(script, /CLOUDFLARE_ACCOUNT_ID=\$\{accountId\}/);
  assert.match(script, /RESOLVED_CLOUDFLARE_ACCOUNT_ID=\$\{accountId\}/);
  assert.match(script, /berbeda dari pemilik zone aktif/);
});

test("workflow builds the account-locked config before dry-run and deployment", async () => {
  const workflow = await read(".github/workflows/cloudflare.yml");
  const build = workflow.indexOf("Build active-zone Wrangler configuration");
  const dryRun = workflow.indexOf("Validate Cloudflare production bundle");
  const deploy = workflow.indexOf("Deploy apex, wildcard tenants, full-zone domains, assets, Nara, and API");

  assert.ok(build >= 0);
  assert.ok(dryRun > build);
  assert.ok(deploy > dryRun);
  assert.match(workflow, /wrangler\.production\.active-zone\.jsonc/);
  assert.match(workflow, /CUSTOM_DOMAIN_PROVIDER: cloudflare-full-zone/);
});
