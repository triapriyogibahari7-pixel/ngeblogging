import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { freeDomainReadiness } from "../server/free-domain-handler.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("free Netlify provider is ready without paid SaaS or service-role key", () => {
  const state = freeDomainReadiness({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "publishable",
    NETLIFY_SITE_HOSTNAME: "ngeblogging.netlify.app",
  });
  assert.equal(state.enabled, true);
  assert.equal(state.provider, "netlify");
  assert.equal(state.mode, "netlify-manual");
  assert.equal(state.automation, false);
  assert.equal(state.serviceRoleRequired, false);
  assert.equal(state.apexTarget, "75.2.60.5");
});

test("Netlify API mode becomes automatic only when token and site ID exist", () => {
  const state = freeDomainReadiness({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "publishable",
    NETLIFY_SITE_HOSTNAME: "ngeblogging.netlify.app",
    NETLIFY_AUTH_TOKEN: "secret",
    NETLIFY_SITE_ID: "site-id",
  });
  assert.equal(state.enabled, true);
  assert.equal(state.mode, "netlify-api");
  assert.equal(state.automation, true);
});

test("worker selects the free provider and keeps Cloudflare compatibility", () => {
  const worker = read("cloudflare/worker-v41.mjs");
  assert.match(worker, /handleFreeDomainRequest/);
  assert.match(worker, /CUSTOM_DOMAIN_PROVIDER/);
  assert.match(worker, /cloudflare-for-saas/);
  assert.match(worker, /customDomainPaidSaasRequired:\s*false/);
});

test("Studio exposes apex and nested subdomain flows", () => {
  const studio = read("src/studio-domains-v41.js");
  assert.match(studio, /addressType.*apex/s);
  assert.match(studio, /addressType.*subdomain/s);
  assert.match(studio, /cloud\.console/);
  assert.match(studio, /Mode gratis tanpa pembayaran aktif/);
  assert.match(studio, /Service-role server tidak diperlukan/);
});

test("Netlify bridge redirects are generated only by Netlify builds and never proxy back to itself", () => {
  const redirectWriter = read("scripts/write-netlify-redirects.mjs");
  const command = read("scripts/netlify-domain-alias.mjs");
  const pkg = JSON.parse(read("package.json"));
  const sw = read("public/sw.js");
  assert.match(redirectWriter, /process\.env\.NETLIFY/);
  assert.match(redirectWriter, /https:\/\/ngeblogging\.triapriyogibahari7\.workers\.dev/);
  assert.match(redirectWriter, /NGEBLOGGING_API_ORIGIN/);
  assert.doesNotMatch(redirectWriter, /"\/api\/\*\s+https:\/\/ngeblogging\.com\/api\/:splat/);
  assert.match(redirectWriter, /dist, "_redirects"/);
  assert.match(command, /domain_aliases/);
  assert.match(command, /75\.2\.60\.5/);
  assert.equal(pkg.scripts.build, "vite build && node scripts/write-netlify-redirects.mjs");
  assert.equal(pkg.scripts["domain:netlify"], "node scripts/netlify-domain-alias.mjs");
  assert.match(sw, /ngeblogging-app-v60-20260727/);
});
