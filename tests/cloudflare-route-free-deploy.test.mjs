import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("production deploy uploads the existing Worker without rewriting domain routes", () => {
  const pkg = JSON.parse(read("package.json"));
  const configText = read("wrangler.production.jsonc");
  const config = JSON.parse(configText);

  assert.equal(pkg.scripts["deploy:cloudflare"], "wrangler deploy --config wrangler.production.jsonc --keep-vars");
  assert.equal(pkg.scripts["cloudflare:dry-run"], "wrangler deploy --config wrangler.production.jsonc --dry-run --outdir .wrangler-build");
  assert.equal(config.name, "ngeblogging");
  assert.equal(config.workers_dev, true);
  assert.equal(config.assets.binding, "ASSETS");
  assert.equal(config.ai.binding, "AI");
  assert.equal(config.routes, undefined);
  assert.doesNotMatch(configText, /"routes"\s*:/);
});

test("the canonical Wrangler config still documents the pre-existing apex and wildcard routes", () => {
  const canonical = read("wrangler.jsonc");
  for (const route of ["ngeblogging.com/*", "www.ngeblogging.com/*", "*.ngeblogging.com/*"]) {
    assert.ok(canonical.includes(route), route);
  }
});
