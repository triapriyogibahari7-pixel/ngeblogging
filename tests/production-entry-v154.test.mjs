import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const worker = read("cloudflare/worker-v68.mjs");
const defaultConfig = read("wrangler.jsonc");
const productionConfig = read("wrangler.production.jsonc");
const serviceWorker = read("public/sw.js");
const browserBridge = read("src/production-entry-v154.js");
const styleAuthority = read("src/studio-style-authority-v144.js");
const netlifyBuild = read("scripts/write-netlify-redirects.mjs");
const auth = read("src/lib/supabase.js");
const callback = read("src/auth-callback-authority-v107.js");
const authModal = read("src/AuthModal.jsx");
const studio = read("src/StudioNext.jsx");

const activeEntryFiles = [worker, defaultConfig, productionConfig, serviceWorker, browserBridge, netlifyBuild];

test("production system routes are forced to the current React build", () => {
  for (const marker of [
    "2026.07.30-production-entry-v154",
    "2026.07.30-auth-entry-v154",
    "./worker-v67.mjs",
    'new URL("/index.html", request.url)',
    "env.ASSETS.fetch",
    "react-dist-index",
    "no-store, max-age=0, must-revalidate",
    "x-ngeblogging-legacy-white-r4",
    "/release-v154.json",
  ]) assert.ok(worker.includes(marker), `worker entry missing ${marker}`);

  for (const route of ["/login", "/signin", "/signup", "/auth/callback", "/auth/recovery"]) {
    assert.ok(worker.includes(`"${route}"`), `system route missing ${route}`);
  }

  assert.ok(worker.includes('url.pathname.startsWith("/api/")'));
  assert.ok(worker.includes("return baseWorker.fetch(request, env, context)"));
});

test("all Wrangler authorities deploy worker v68 with v154 metadata", () => {
  for (const config of [defaultConfig, productionConfig]) {
    assert.ok(config.includes('"main": "./cloudflare/worker-v68.mjs"'));
    assert.ok(config.includes('"APP_RELEASE": "2026.07.30-production-entry-v154"'));
    assert.ok(config.includes('"UI_AUTHORITY_RELEASE": "2026.07.30-production-entry-v154"'));
    assert.ok(config.includes('"AUTH_ENTRY_RELEASE": "2026.07.30-auth-entry-v154"'));
    assert.ok(config.includes('"run_worker_first": true'));
    assert.ok(config.includes('"pattern": "ngeblogging.com/*"'));
    assert.ok(config.includes('"pattern": "*.ngeblogging.com/*"'));
  }
});

test("Netlify production publishes the same React markers, release probe and no-cache auth routes", () => {
  for (const marker of [
    "2026.07.30-production-entry-v154",
    "2026.07.30-auth-entry-v154",
    "release-v154.json",
    "legacyWhiteR4: false",
    "netlify-static-fallback",
    "ngeblogging-production-entry",
    "ngeblogging-auth-entry",
    "Cache-Control: no-store, max-age=0, must-revalidate",
    "/login",
    "/signin",
    "/signup",
    "/*       /index.html",
  ]) assert.ok(netlifyBuild.includes(marker), `Netlify fallback missing ${marker}`);
});

test("PWA cache rotation removes stale shells without interrupting auth callbacks", () => {
  for (const marker of [
    "ngeblogging-app-v154-production-entry-20260730",
    "production-entry-cache-v154",
    "auth-entry-v154-20260730",
    "service-worker-stale-shell-v154",
    "service-worker-activated-production-entry-v154",
  ]) assert.ok(serviceWorker.includes(marker), `service worker missing ${marker}`);

  for (const route of ["/login", "/signup", "/signin", "/auth/"]) {
    assert.ok(serviceWorker.includes(route), `auth surface missing ${route}`);
  }
  for (const mode of ["callback", "recovery", "session-expired", "callback-error"]) {
    assert.ok(serviceWorker.includes(mode), `auth mode missing ${mode}`);
  }
});

test("browser bridge verifies v154 and clears only legacy PWA guards", () => {
  for (const marker of [
    "production-entry-browser-v154-20260730",
    "ngeblogging-pwa-controller-v154",
    "ngeblogging-pwa-controller-v153",
    "/release-v154.json",
    "production-entry-v154",
    "authSurface",
  ]) assert.ok(browserBridge.includes(marker), `browser bridge missing ${marker}`);
  assert.ok(styleAuthority.startsWith('import "./production-entry-v154.js";'));
});

test("Google, LinkedIn, email, PKCE callback and persistent sessions remain wired", () => {
  for (const marker of [
    '"google"', '"linkedin_oidc"', "signInWithProvider", "signInWithPassword",
    "signInWithMagicLink", "persistSession: true", "autoRefreshToken: true",
    "AUTH_GATEWAY_PREFIX", "/api/auth-proxy",
  ]) assert.ok(auth.includes(marker), `auth source missing ${marker}`);
  for (const marker of ["exchangeCodeForSession", "publishSession", "ngeblogging:auth-session-ready"]) {
    assert.ok(callback.includes(marker), `callback authority missing ${marker}`);
  }
  for (const marker of ["Google", "LinkedIn", "Masuk dengan email", "Masuk tanpa password melalui email"]) {
    assert.ok(authModal.includes(marker), `auth modal missing ${marker}`);
  }
});

test("Studio navigation and content authority remain complete", () => {
  for (const label of [
    "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
    "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
  ]) assert.ok(studio.includes(`>${label}<`), `Studio menu missing ${label}`);

  for (const source of activeEntryFiles) {
    assert.ok(!source.includes("WHITE-R4-2026.07.12"), "active production entry must not contain WHITE-R4");
  }
});
