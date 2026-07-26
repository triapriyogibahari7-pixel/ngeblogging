import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const requiredRoutes = ["ngeblogging.com/*", "www.ngeblogging.com/*", "*.ngeblogging.com/*"];

function patterns(config) {
  return new Set((config.routes || []).map((route) => typeof route === "string" ? route : route.pattern));
}

test("production deploy updates the current Worker and its official domain routes", () => {
  const pkg = JSON.parse(read("package.json"));
  const configText = read("wrangler.production.jsonc");
  const config = JSON.parse(configText);
  const routes = patterns(config);

  assert.equal(pkg.scripts["deploy:cloudflare"], "wrangler deploy --config wrangler.production.jsonc --keep-vars");
  assert.equal(pkg.scripts["cloudflare:dry-run"], "wrangler deploy --config wrangler.production.jsonc --dry-run --outdir .wrangler-build");
  assert.equal(config.name, "ngeblogging");
  assert.equal(config.workers_dev, true);
  assert.equal(config.assets.binding, "ASSETS");
  assert.equal(config.assets.run_worker_first, true);
  assert.equal(config.ai.binding, "AI");
  for (const route of requiredRoutes) assert.ok(routes.has(route), route);
  assert.match(configText, /"routes"\s*:/);
});

test("canonical and production configs bind the same apex www and wildcard routes", () => {
  const canonical = JSON.parse(read("wrangler.jsonc"));
  const production = JSON.parse(read("wrangler.production.jsonc"));
  const canonicalRoutes = patterns(canonical);
  const productionRoutes = patterns(production);
  for (const route of requiredRoutes) {
    assert.ok(canonicalRoutes.has(route), `canonical:${route}`);
    assert.ok(productionRoutes.has(route), `production:${route}`);
  }
});
