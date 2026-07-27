import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("production explicitly reports the unresolved Cloudflare for SaaS account action", async () => {
  const [wranglerSource, worker] = await Promise.all([
    read("wrangler.production.jsonc"),
    read("cloudflare/worker-v67.mjs"),
  ]);
  const wrangler = JSON.parse(wranglerSource);
  assert.equal(wrangler.vars.CLOUDFLARE_SAAS_ENABLED, "false");
  assert.equal(wrangler.vars.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET, "connect.ngeblogging.com");

  for (const marker of [
    "CLOUDFLARE_SAAS_NOT_ENABLED",
    "cloudflareCode: 100327",
    "accountActionRequired",
    "saasEnablement",
    "activationReady: Boolean(payload?.activationReady && account.saasEnabled)",
    "enrichDomainResponse",
    "providerBlocker",
  ]) assert.ok(worker.includes(marker), marker);
});
