import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const worker = read("cloudflare/worker-v69.mjs");
const wrangler = JSON.parse(read("wrangler.jsonc"));
const production = JSON.parse(read("wrangler.production.jsonc"));
const netlify = read("scripts/write-netlify-redirects.mjs");
const release = JSON.parse(read("public/release-v160.json"));

const configs = [wrangler, wrangler.env.production, production];

function hasNoStoreBlock(source, path) {
  const actualNewline = `${path}\n  Cache-Control: no-store`;
  const escapedNewline = String.raw`${path}\n  Cache-Control: no-store`;
  return source.includes(actualNewline) || source.includes(escapedNewline);
}

test("v160 Worker entry remains protected under active v168 route authority", () => {
  for (const config of configs) {
    assert.equal(config.name, "ngeblogging");
    assert.equal(config.main, "./cloudflare/worker-v69.mjs");
    assert.equal(config.vars.APP_RELEASE, "2026.07.30-production-route-recovery-v168");
    assert.equal(config.vars.UI_AUTHORITY_RELEASE, "2026.07.30-studio-ui-contract-v160");
    assert.equal(config.vars.AUTH_ENTRY_RELEASE, "2026.07.30-auth-entry-v158");
    assert.equal(config.vars.STUDIO_ROUTE_RELEASE, "2026.07.30-studio-route-v160");
    assert.equal(config.vars.PRODUCTION_ROUTE_AUTHORITY, "cloudflare-route-takeover-v168");
  }
  assert.equal(wrangler.assets.run_worker_first, true);
  assert.equal(production.assets.run_worker_first, true);
});

test("apex www and tenant wildcard use explicit zone routes during v168 recovery", () => {
  for (const config of configs) {
    const routes = config.routes || [];
    assert.ok(routes.some((route) => route.pattern === "ngeblogging.com/*" && route.zone_name === "ngeblogging.com"));
    assert.ok(routes.some((route) => route.pattern === "www.ngeblogging.com/*" && route.zone_name === "ngeblogging.com"));
    assert.ok(routes.some((route) => route.pattern === "*.ngeblogging.com/*" && route.zone_name === "ngeblogging.com"));
    assert.ok(!routes.some((route) => route.custom_domain === true));
  }
});

test("Worker v69 still forces React for root auth and Studio routes", () => {
  for (const marker of [
    "2026.07.30-production-authority-v160",
    "2026.07.30-auth-entry-v158",
    "2026.07.30-studio-route-v160",
    "2026.07.30-studio-ui-contract-v160",
    "2026.07.30-production-route-authority-v163",
    "2026.07.30-production-custom-domain-authority-v164",
    "2026.07.30-production-route-recovery-v168",
    "react-dist-index",
    "worker-v69-route-recovery-v168",
    "legacyWhiteR4: false",
    "env.ASSETS.fetch",
    "no-store, max-age=0, must-revalidate",
  ]) assert.ok(worker.includes(marker), `worker missing ${marker}`);

  for (const path of [
    "/studio", "/dashboard", "/workspace", "/login", "/signin", "/signup",
    "/forgot-password", "/reset-password", "/auth/callback", "/auth/recovery",
    "/release-v154.json", "/release-v158.json", "/release-v159.json", "/release-v160.json",
    "/release-v163.json", "/release-v164.json", "/release-v168.json",
  ]) assert.ok(worker.includes(`"${path}"`), `worker route missing ${path}`);

  assert.ok(worker.includes('if (url.pathname.startsWith("/api/")) return false'));
  assert.ok(worker.includes("return baseWorker.fetch(request, env, context)"));
  assert.ok(!worker.includes("WHITE-R4-2026.07.12"));
});

test("Netlify fallback preserves v160 through v165 compatibility", () => {
  for (const marker of [
    "2026.07.30-production-authority-v160",
    "2026.07.30-auth-entry-v158",
    "2026.07.30-studio-route-v160",
    "2026.07.30-studio-ui-contract-v160",
    "2026.07.30-production-route-authority-v163",
    "2026.07.30-production-custom-domain-authority-v164",
    "release-v160.json",
    "release-v163.json",
    "release-v164.json",
    "legacyWhiteR4: false",
    "netlify-fallback-v164",
    "/*       /index.html",
    "Cache-Control: no-store, max-age=0, must-revalidate",
  ]) assert.ok(netlify.includes(marker), `Netlify publisher missing ${marker}`);

  for (const path of ["/", "/studio", "/dashboard", "/workspace", "/login", "/signin", "/signup"]) {
    assert.ok(hasNoStoreBlock(netlify, path), `no-store missing for ${path}`);
  }
});

test("public v160 probe remains available as historical compatibility", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, "2026.07.30-production-authority-v160");
  assert.equal(release.customDomainAuthority, "worker-v69");
  assert.equal(release.legacyWhiteR4, false);
  assert.deepEqual(release.responsiveFamilies, ["application", "phone", "mobile", "compact", "tablet", "desktop"]);
  assert.deepEqual(release.desktopVariants, ["laptop", "computer"]);
  assert.equal(release.viewportMatrix.length, 14);
});
