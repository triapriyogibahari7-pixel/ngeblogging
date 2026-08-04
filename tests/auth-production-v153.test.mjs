import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const client = read("src/lib/supabase.js");
const modal = read("src/AuthModal.jsx");
const callbackAuthority = read("src/auth-callback-authority-v107.js");
const callbackConsumer = read("src/lib/auth-callback-v162.js");
const bootstrap = read("src/auth-studio-bootstrap-v106.js");
const gateway = read("server/auth-gateway-v108.mjs");
const authWorker = read("cloudflare/worker-v67.mjs");
const entryWorker = read("cloudflare/worker-v69.mjs");
const compatibilityWorker = read("cloudflare/worker-v68.mjs");
const cloudflareDefault = JSON.parse(read("wrangler.jsonc"));
const production = JSON.parse(read("wrangler.production.jsonc"));
const pwa = read("src/pwa-runtime.js");
const serviceWorker = read("public/sw.js");
const workflow = read(".github/workflows/cloudflare-token-diagnostic.yml");
const finalizer = read("scripts/finalize-cloudflare-routes-v175.mjs");
const cutover = read("scripts/finalize-cloudflare-route-cutover-v182.mjs");
const index = read("index.html");

const providers = ["google", "github", "linkedin_oidc"];
const occurrences = (source, marker) => source.split(marker).length - 1;

test("all requested login buttons remain connected to real Supabase actions", () => {
  for (const provider of providers) {
    assert.ok(modal.includes(`id: "${provider}"`), `AuthModal missing ${provider}`);
    assert.ok(client.includes(`"${provider}"`), `auth client missing ${provider}`);
  }
  for (const marker of [
    "signInWithPassword", "signInWithMagicLink", "signUpWithPassword",
    "requestPasswordReset", "resendSignUpConfirmation", "updatePassword",
  ]) assert.ok(modal.includes(marker), `AuthModal missing ${marker}`);
});

test("production auth requests use the same-origin gateway and persistent session", () => {
  for (const marker of [
    "auth-production-v153-20260730", "/api/auth-proxy", "authAwareFetch",
    "global: {", "fetch: authAwareFetch", "same-origin-gateway",
  ]) assert.ok(client.includes(marker), `client missing ${marker}`);
  assert.match(client, /skipBrowserRedirect:\s*true/);
  assert.match(client, /window\.location\.assign\(destination\)/);
  assert.match(client, /persistSession:\s*true/);
  assert.match(client, /autoRefreshToken:\s*true/);
});

test("legacy login and signup routes open the React auth surface", () => {
  for (const route of ["/login", "/signin", "/signup"]) assert.ok(client.includes(route));
  assert.match(client, /installAuthEntryBridge/);
  assert.match(client, /button\.nav-cta/);
  assert.match(client, /\.auth-switch button/);
});

test("PKCE callbacks exchange each code exactly once", () => {
  assert.equal(occurrences(callbackConsumer, "exchangeCodeForSession(code)"), 1);
  assert.match(callbackConsumer, /auth-callback-singleflight-v162-20260730/);
  assert.match(callbackConsumer, /Symbol\.for\("ngeblogging\.auth\.callbackOperationV162"\)/);
  assert.doesNotMatch(callbackAuthority, /exchangeCodeForSession/);
  assert.match(callbackAuthority, /consumeAuthCallbackV162/);
  assert.match(callbackAuthority, /ngeblogging:auth-session-ready/);
  assert.match(bootstrap, /auth-callback-authority-v107\.js/);
  assert.ok(index.indexOf("auth-studio-bootstrap-v106.js") < index.indexOf("main.jsx"));
});

test("Cloudflare auth gateway accepts production and preview surfaces", () => {
  for (const marker of [
    "2026.07.30-auth-gateway-v153", "PUBLIC_ALLOWED_ORIGINS", ".ngeblogging.com",
    ".netlify.app", ".pages.dev", ".workers.dev", "/auth/v1/",
  ]) assert.ok(gateway.includes(marker), `gateway missing ${marker}`);
  assert.match(gateway, /redirect:\s*"manual"/);
  assert.match(gateway, /responseHeaders\.set\("x-ngeblogging-auth-gateway"/);
});

test("active v172 retains auth v153 and historical production compatibility", () => {
  for (const config of [cloudflareDefault, cloudflareDefault.env.production, production]) {
    assert.equal(config.main, "./cloudflare/worker-v69.mjs");
    assert.equal(config.vars.APP_RELEASE, "2026.07.30-production-custom-domain-v172");
    assert.equal(config.vars.UI_AUTHORITY_RELEASE, "2026.07.30-studio-ui-contract-v160");
    assert.equal(config.vars.AUTH_GATEWAY_RELEASE, "2026.07.30-auth-gateway-v153");
    assert.equal(config.vars.AUTH_ENTRY_RELEASE, "2026.07.30-auth-entry-v158");
    assert.equal(config.vars.PRODUCTION_ROUTE_AUTHORITY, "cloudflare-custom-domain-authority-v172");
    assert.ok(config.routes.some((route) => route.pattern === "ngeblogging.com" && route.custom_domain === true));
    assert.ok(config.routes.some((route) => route.pattern === "www.ngeblogging.com" && route.custom_domain === true));
    assert.ok(config.routes.some((route) => route.pattern === "*.ngeblogging.com/*" && route.zone_name === "ngeblogging.com"));
  }
  assert.equal(cloudflareDefault.assets.run_worker_first, true);
  assert.equal(production.assets.run_worker_first, true);
  for (const marker of [
    './worker-v67.mjs', "2026.07.30-production-route-authority-v163",
    "2026.07.30-production-custom-domain-authority-v164",
    "2026.07.30-production-route-recovery-v168",
    "2026.07.30-production-custom-domain-v172",
    "first-site-onboarding-v169-20260730",
  ]) assert.ok(entryWorker.includes(marker), `entry Worker missing ${marker}`);
  assert.ok(compatibilityWorker.includes("2026.07.30-production-entry-v154"));
});

test("auth metadata and PWA preserve v153 callbacks", () => {
  for (const marker of [
    "2026.07.30-auth-production-v153", "authProduction", "authTransport",
    "emailPassword", "magicLink", "google", "linkedin",
  ]) assert.ok(authWorker.includes(marker), `auth worker missing ${marker}`);
  for (const marker of [
    "ngeblogging-pwa-v153-20260730", "pwa-v153-auth-production",
    "auth-production-v153", 'authMode === "signin"', 'authMode === "signup"',
  ]) assert.ok(pwa.includes(marker), `PWA missing ${marker}`);
  for (const marker of [
    "ngeblogging-app-v153-auth-production-20260730", "auth-production-cache-v153",
    "service-worker-activated-auth-production-v153", 'authMode === "callback"',
  ]) assert.ok(serviceWorker.includes(marker), `service worker missing ${marker}`);
});

test("deployment v184 rejects WHITE-R4 and verifies auth plus current Studio releases", () => {
  for (const marker of [
    "Ngeblogging production route cutover v184",
    "environment: cloudflare-production",
    "Run v183 and v184 regression",
    "Build production application",
    "Deploy Worker and assets",
    "Preserve compatibility routing before cutover",
    "finalize-cloudflare-routes-v175.mjs",
    "Cut over apex and www to authoritative zone routes v184",
    "finalize-cloudflare-route-cutover-v182.mjs",
    "Verify live apex, auth routes, Studio and release markers",
    "/release-v183.json", "/release-v184.json",
    "/login", "/signup", "/studio",
    "WHITE-R4-2026.07.12",
    "PRODUCTION_ROUTE_CUTOVER_V184_VERIFY_FAILED",
  ]) assert.ok(workflow.includes(marker), `workflow missing ${marker}`);
  for (const marker of [
    'EXACT_HOSTNAMES = Object.freeze(["ngeblogging.com", "www.ngeblogging.com"])',
    'TENANT_WILDCARD_PATTERN = "*.ngeblogging.com/*"',
    'LEGACY_EXACT_ROUTE_PATTERNS = new Set(["ngeblogging.com/*", "www.ngeblogging.com/*"])',
    "deleteLegacyExactRoutes", "verifyFinalState",
  ]) assert.ok(finalizer.includes(marker), `finalizer missing ${marker}`);
  for (const marker of ["EXACT_ROUTES", "TENANT_ROUTE", "detachExactWorkerDomains", "installAuthoritativeRoutes", "verifyFinalState"]) {
    assert.ok(cutover.includes(marker), `cutover missing ${marker}`);
  }
});