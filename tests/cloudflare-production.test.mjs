import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const wrangler = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const worker = readFileSync(new URL("../cloudflare/worker.mjs", import.meta.url), "utf8");
const headers = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
const production = wrangler.env?.production || {};

function routePatterns() {
  return new Set((production.routes || []).map((route) => typeof route === "string" ? route : route.pattern));
}

test("Cloudflare is the production runtime and Worker runs before SPA assets", () => {
  assert.equal(wrangler.main, "./cloudflare/worker.mjs");
  assert.equal(wrangler.assets?.directory, "./dist/");
  assert.equal(wrangler.assets?.not_found_handling, "single-page-application");
  assert.equal(wrangler.assets?.run_worker_first, true);
});

test("preview builds do not claim production routes or require production secrets", () => {
  assert.equal(wrangler.routes, undefined);
  assert.equal(wrangler.secrets, undefined);
  assert.equal(wrangler.vars?.NARA_RUNTIME, "cloudflare-worker-preview-v3");
  assert.match(packageJson.scripts["cloudflare:preview-dry-run"], /wrangler versions upload/);
});

test("apex and every Ngeblogging tenant subdomain are routed in production", () => {
  const routes = routePatterns();
  assert.ok(routes.has("ngeblogging.com/*"));
  assert.ok(routes.has("*.ngeblogging.com/*"));
  assert.equal(production.name, "ngeblogging");
  assert.equal(production.vars?.NARA_RUNTIME, "cloudflare-worker-v3");
});

test("required production secrets are declared and never stored as plaintext vars", () => {
  const required = new Set(production.secrets?.required || []);
  for (const name of ["QWEN_API_KEY", "QWEN_WORKSPACE_ID", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"]) {
    assert.ok(required.has(name), `${name} must be required`);
    assert.equal(Object.hasOwn(production.vars || {}, name), false, `${name} must not be a plaintext var`);
  }
  for (const name of ["SUPABASE_SERVICE_ROLE_KEY", "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "LOCAL_PAYMENT_GATEWAY_SECRET"]) {
    assert.equal(Object.hasOwn(production.vars || {}, name), false, `${name} must not be a plaintext var`);
  }
  assert.match(packageJson.scripts["deploy:cloudflare"], /--env production/);
  assert.match(packageJson.scripts["cloudflare:dry-run"], /--env production/);
});

test("Worker uses portable Nara billing image and tenant SEO handlers", () => {
  assert.match(worker, /server\/nara-runtime\.mjs/);
  assert.match(worker, /handleNaraImage/);
  assert.match(worker, /handleBillingRequest/);
  assert.match(worker, /seoEndpoint/);
  assert.match(worker, /injectTenantSeo/);
  assert.match(worker, /endsWith\("\.ngeblogging\.com"\)/);
  assert.match(worker, /ORIGIN_NOT_ALLOWED/);
  assert.match(worker, /PAYLOAD_TOO_LARGE/);
});

test("Cloudflare static assets receive security and immutable asset headers", () => {
  assert.match(headers, /Content-Security-Policy:/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /\/assets\/\*/);
  assert.match(headers, /max-age=31536000, immutable/);
});

test("obsolete deployment configuration and runtime directory are removed", () => {
  assert.equal(existsSync(new URL("../netlify.toml", import.meta.url)), false);
  assert.equal(existsSync(new URL("../netlify/", import.meta.url)), false);
});
