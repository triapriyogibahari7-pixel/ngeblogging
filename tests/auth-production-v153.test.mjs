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
const workflow = read(".github/workflows/deploy-production.yml");
const index = read("index.html");

const providers = ["google", "github", "linkedin_oidc"];

function occurrences(source, marker) {
  return source.split(marker).length - 1;
}

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

test("production auth requests use the same-origin gateway", () => {
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

test("PKCE callbacks retain v153 compatibility but exchange each code exactly once through v162", () => {
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

test("active route v168 retains auth v153 entry v154 and custom-domain v164 compatibility", () => {
  for (const config of [cloudflareDefault, cloudflareDefault.env.production, production]) {
    assert.equal(config.main, "./cloudflare/worker-v69.mjs");
    assert.equal(config.vars.APP_RELEASE, "2026.07.30-production-route-recovery-v168");
    assert.equal(config.vars.UI_AUTHORITY_RELEASE, "2026.07.30-studio-ui-contract-v160");
    assert.equal(config.vars.AUTH_GATEWAY_RELEASE, "2026.07.30-auth-gateway-v153");
    assert.equal(config.vars.AUTH_ENTRY_RELEASE, "2026.07.30-auth-entry-v158");
    assert.equal(config.vars.PRODUCTION_ROUTE_AUTHORITY, "cloudflare-route-takeover-v168");
    assert.ok(config.routes.some((route) => route.pattern === "ngeblogging.com/*" && route.zone_name === "ngeblogging.com"));
    assert.ok(config.routes.some((route) => route.pattern === "www.ngeblogging.com/*" && route.zone_name === "ngeblogging.com"));
    assert.ok(config.routes.some((route) => route.pattern === "*.ngeblogging.com/*" && route.zone_name === "ngeblogging.com"));
    assert.ok(!config.routes.some((route) => route.custom_domain === true));
  }
  assert.equal(cloudflareDefault.assets.run_worker_first, true);
  assert.equal(production.assets.run_worker_first, true);
  assert.ok(entryWorker.includes('./worker-v67.mjs'));
  assert.ok(entryWorker.includes("2026.07.30-production-route-authority-v163"));
  assert.ok(entryWorker.includes("2026.07.30-production-custom-domain-authority-v164"));
  assert.ok(entryWorker.includes("2026.07.30-production-route-recovery-v168"));
  assert.ok(entryWorker.includes("first-site-onboarding-v169-20260730"));
  assert.ok(compatibilityWorker.includes("2026.07.30-production-entry-v154"));
});

test("auth worker metadata and health expose v153 readiness", () => {
  for (const marker of [
    "2026.07.30-auth-production-v153", "authProduction", "authTransport",
    "emailPassword", "magicLink", "google", "linkedin",
  ]) assert.ok(authWorker.includes(marker), `auth worker missing ${marker}`);
});

test("PWA cache never destroys an authentication callback", () => {
  for (const marker of [
    "ngeblogging-pwa-v153-20260730", "pwa-v153-auth-production",
    "auth-production-v153", 'authMode === "signin"', 'authMode === "signup"',
  ]) assert.ok(pwa.includes(marker), `PWA missing ${marker}`);
  for (const marker of [
    "ngeblogging-app-v153-auth-production-20260730", "auth-production-cache-v153",
    "service-worker-activated-auth-production-v153", 'authMode === "callback"',
  ]) assert.ok(serviceWorker.includes(marker), `service worker missing ${marker}`);
});

test("deployment v168-v169 rejects WHITE-R4 and verifies the real login plus onboarding authority", () => {
  for (const marker of [
    "2026.07.30-production-route-recovery-v168",
    "first-site-onboarding-v169-20260730",
    "site-policy-v169-20260730",
    "2026.07.30-auth-gateway-v153",
    "WHITE-R4-2026.07.12",
    "/release-v168.json",
    "/release-v169.json",
    "/studio",
    "/api/auth-proxy/auth/v1/token",
    "npm run deploy:cloudflare",
    "DEPLOY_VERIFY_PRODUCTION_V168_V169_FAILED",
  ]) assert.ok(workflow.includes(marker), `workflow missing ${marker}`);
  assert.ok(!workflow.includes("npm run cloudflare:attach-domains"));
});
