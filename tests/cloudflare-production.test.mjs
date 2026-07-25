import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const wrangler = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const temporary = JSON.parse(readFileSync(new URL("../wrangler.temporary.jsonc", import.meta.url), "utf8"));
const productionConfig = JSON.parse(readFileSync(new URL("../wrangler.production.jsonc", import.meta.url), "utf8"));
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const worker = readFileSync(new URL("../cloudflare/worker.mjs", import.meta.url), "utf8");
const workersAi = readFileSync(new URL("../server/workers-ai-nara.mjs", import.meta.url), "utf8");
const headers = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
const production = wrangler.env?.production || {};

function routePatterns(config) {
  return new Set((config?.routes || []).map((route) => typeof route === "string" ? route : route.pattern));
}

function assertPublicSupabaseConfig(vars, label) {
  assert.match(String(vars?.SUPABASE_URL || ""), /^https:\/\/[a-z0-9-]+\.supabase\.co$/i, `${label} Supabase URL`);
  assert.match(String(vars?.SUPABASE_PUBLISHABLE_KEY || ""), /^(sb_publishable_|eyJ)/, `${label} publishable key`);
}

test("Cloudflare is the production runtime and Worker runs before SPA assets", () => {
  assert.equal(wrangler.main, "./cloudflare/worker.mjs");
  assert.equal(wrangler.assets?.directory, "./dist/");
  assert.equal(wrangler.assets?.not_found_handling, "single-page-application");
  assert.equal(wrangler.assets?.run_worker_first, true);
  assert.equal(wrangler.ai?.binding, "AI");
});

test("default Git deployment owns production routes while temporary browser audits remain isolated", () => {
  const defaultRoutes = routePatterns(wrangler);
  for (const pattern of ["ngeblogging.com/*", "www.ngeblogging.com/*", "*.ngeblogging.com/*"]) {
    assert.ok(defaultRoutes.has(pattern), `default deployment must bind ${pattern}`);
  }
  assert.equal(temporary.routes, undefined);
  assert.equal(temporary.secrets, undefined);
  assert.match(String(wrangler.vars?.NARA_RUNTIME || ""), /^cloudflare-worker-default-v\d+$/);
  assert.equal(wrangler.vars?.CF_AI_MODEL, "@cf/zai-org/glm-4.7-flash");
  assertPublicSupabaseConfig(wrangler.vars, "default");
  assertPublicSupabaseConfig(temporary.vars, "temporary");
  assert.match(packageJson.scripts["cloudflare:preview-dry-run"], /wrangler versions upload/);
});

test("apex www and every Ngeblogging tenant subdomain are routed in production", () => {
  const routes = routePatterns(production);
  for (const pattern of ["ngeblogging.com/*", "www.ngeblogging.com/*", "*.ngeblogging.com/*"]) {
    assert.ok(routes.has(pattern), `production must bind ${pattern}`);
  }
  assert.equal(production.name, "ngeblogging");
  assert.match(String(production.vars?.NARA_RUNTIME || ""), /^cloudflare-worker-production-v\d+$/);
  assert.equal(production.ai?.binding, "AI");
  assertPublicSupabaseConfig(production.vars, "production");
});

test("only public Supabase configuration is stored in vars and every real secret remains server-only", () => {
  const optional = new Set(production.secrets?.optional || []);
  for (const name of ["QWEN_API_KEY", "QWEN_WORKSPACE_ID"]) {
    assert.ok(optional.has(name), `${name} must remain optional because Workers AI is the independent fallback`);
    assert.equal(Object.hasOwn(production.vars || {}, name), false, `${name} must not be a plaintext var`);
  }

  for (const vars of [wrangler.vars || {}, production.vars || {}, temporary.vars || {}, productionConfig.vars || {}]) {
    assertPublicSupabaseConfig(vars, "Worker");
    for (const name of [
      "SUPABASE_SERVICE_ROLE_KEY", "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID",
      "LOCAL_PAYMENT_GATEWAY_SECRET", "QWEN_API_KEY",
    ]) {
      assert.equal(Object.hasOwn(vars, name), false, `${name} must not be a plaintext var`);
    }
  }

  for (const scriptName of ["deploy:cloudflare", "cloudflare:dry-run"]) {
    const script = String(packageJson.scripts[scriptName] || "");
    assert.match(script, /--config wrangler\.production\.jsonc/, `${scriptName} must use the route-preserving production config`);
    assert.doesNotMatch(script, /--env production/, `${scriptName} must not redeclare existing production routes`);
  }
  assert.equal(productionConfig.routes, undefined);
  assert.equal(productionConfig.env, undefined);
  assert.equal(productionConfig.keep_vars, true);
});

test("Worker uses portable Nara, Workers AI fallback, billing, image, and tenant SEO handlers", () => {
  assert.match(worker, /server\/nara-runtime\.mjs/);
  assert.match(worker, /server\/workers-ai-nara\.mjs/);
  assert.match(worker, /handleWorkersAiNara/);
  assert.match(worker, /workersAiReady/);
  assert.match(workersAi, /env\.AI\.run\(model/);
  assert.match(workersAi, /consume_nara_quota/);
  assert.match(workersAi, /DEFAULT_SUPABASE_URL/);
  assert.match(workersAi, /DEFAULT_SUPABASE_PUBLISHABLE_KEY/);
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
