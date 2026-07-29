import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const client = read("src/lib/supabase.js");
const modal = read("src/AuthModal.jsx");
const callback = read("src/auth-callback-authority-v107.js");
const bootstrap = read("src/auth-studio-bootstrap-v106.js");
const gateway = read("server/auth-gateway-v108.mjs");
const worker = read("cloudflare/worker-v67.mjs");
const production = JSON.parse(read("wrangler.production.jsonc"));
const pwa = read("src/pwa-runtime.js");
const serviceWorker = read("public/sw.js");
const workflow = read(".github/workflows/deploy-production.yml");
const index = read("index.html");

const providers = ["google", "github", "linkedin_oidc"];

test("all requested login buttons remain connected to real Supabase actions", () => {
  for (const provider of providers) {
    assert.ok(modal.includes(`id: \"${provider}\"`), `AuthModal missing ${provider}`);
    assert.ok(client.includes(`\"${provider}\"`), `auth client missing ${provider}`);
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

test("PKCE callbacks exchange the code before handing the session to Studio", () => {
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /ngeblogging:auth-session-ready/);
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

test("production metadata and health expose auth v153 readiness", () => {
  assert.equal(production.vars.APP_RELEASE, "2026.07.30-auth-production-v153");
  assert.equal(production.vars.UI_AUTHORITY_RELEASE, "2026.07.30-auth-production-v153");
  assert.equal(production.vars.AUTH_GATEWAY_RELEASE, "2026.07.30-auth-gateway-v153");
  for (const marker of [
    "2026.07.30-auth-production-v153", "authProduction", "authTransport",
    "emailPassword", "magicLink", "google", "linkedin",
  ]) assert.ok(worker.includes(marker), `worker missing ${marker}`);
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

test("deployment rejects stale WHITE-R4 and probes the auth gateway", () => {
  for (const marker of [
    "2026.07.30-auth-production-v153", "2026.07.30-auth-gateway-v153",
    "WHITE-R4-2026.07.12", "ngeblogging-auth-session-runtime",
    "/api/auth-proxy/auth/v1/token", "DEPLOY_VERIFY_AUTH_PRODUCTION_V153_FAILED",
  ]) assert.ok(workflow.includes(marker), `workflow missing ${marker}`);
});
