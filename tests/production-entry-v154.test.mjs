import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const worker = read("cloudflare/worker-v69.mjs");
const compatibilityWorker = read("cloudflare/worker-v68.mjs");
const defaultConfig = read("wrangler.jsonc");
const productionConfig = read("wrangler.production.jsonc");
const serviceWorker = read("public/sw.js");
const browserBridge = read("src/production-entry-v154.js");
const styleAuthority = read("src/studio-style-authority-v144.js");
const netlifyBuild = read("scripts/write-netlify-redirects.mjs");
const auth = read("src/lib/supabase.js");
const callbackAuthority = read("src/auth-callback-authority-v107.js");
const callbackConsumer = read("src/lib/auth-callback-v162.js");
const authModal = read("src/AuthModal.jsx");
const studio = read("src/StudioNext.jsx");
const v248Finalizer = read("scripts/service-worker-v248-lib.mjs");
const v248Release = JSON.parse(read("public/release-v248.json"));

const activeEntryFiles = [worker, defaultConfig, productionConfig, browserBridge, netlifyBuild];

function occurrences(source, marker) {
  return source.split(marker).length - 1;
}

test("production system routes remain forced to React while v154-v171 compatibility is retained", () => {
  for (const marker of [
    "2026.07.30-production-authority-v160",
    "2026.07.30-production-route-authority-v163",
    "2026.07.30-production-custom-domain-authority-v164",
    "2026.07.30-production-domain-attach-v165",
    "2026.07.30-production-route-recovery-v168",
    "first-site-onboarding-v169-20260730",
    "2026.07.30-production-custom-domain-v172",
    "mobile-public-v171-20260730",
    "2026.07.30-auth-entry-v158",
    "./worker-v67.mjs",
    'new URL("/index.html", request.url)',
    "env.ASSETS.fetch",
    "react-dist-index",
    "no-store, max-age=0, must-revalidate",
    "x-ngeblogging-legacy-white-r4",
    "/release-v154.json",
    "/release-v160.json",
    "/release-v163.json",
    "/release-v164.json",
    "/release-v168.json",
    "/release-v169.json",
    "/release-v172.json",
  ]) assert.ok(worker.includes(marker), `worker entry missing ${marker}`);

  for (const route of ["/login", "/signin", "/signup", "/auth/callback", "/auth/recovery"]) {
    assert.ok(worker.includes(`"${route}"`), `system route missing ${route}`);
  }

  assert.ok(worker.includes('url.pathname.startsWith("/api/")'));
  assert.ok(worker.includes("return baseWorker.fetch(request, env, context)"));
  assert.ok(compatibilityWorker.includes("2026.07.30-production-entry-v154"));
  assert.ok(compatibilityWorker.includes("2026.07.30-auth-entry-v154"));
});

test("all active Wrangler authorities deploy Worker v69 with exact apex www and tenant wildcard", () => {
  for (const config of [defaultConfig, productionConfig]) {
    assert.ok(config.includes('"main": "./cloudflare/worker-v69.mjs"'));
    assert.ok(config.includes('"APP_RELEASE": "2026.07.30-production-custom-domain-v172"'));
    assert.ok(config.includes('"PRODUCTION_ROUTE_AUTHORITY": "cloudflare-custom-domain-authority-v172"'));
    assert.ok(config.includes('"UI_AUTHORITY_RELEASE": "2026.07.30-studio-ui-contract-v160"'));
    assert.ok(config.includes('"AUTH_ENTRY_RELEASE": "2026.07.30-auth-entry-v158"'));
    assert.ok(config.includes('"run_worker_first": true'));
    assert.ok(config.includes('"pattern": "ngeblogging.com", "custom_domain": true'));
    assert.ok(config.includes('"pattern": "www.ngeblogging.com", "custom_domain": true'));
    assert.ok(config.includes('"pattern": "*.ngeblogging.com/*", "zone_name": "ngeblogging.com"'));
    assert.ok(!config.includes('"pattern": "*.ngeblogging.com/*", "custom_domain": true'));
  }
});

test("Netlify production keeps v164-v165 compatibility while publishing React fallback", () => {
  for (const marker of [
    "2026.07.30-production-authority-v160",
    "2026.07.30-production-route-authority-v163",
    "2026.07.30-production-custom-domain-authority-v164",
    "2026.07.30-auth-entry-v158",
    "release-v154.json",
    "release-v160.json",
    "release-v163.json",
    "release-v164.json",
    "legacyWhiteR4: false",
    "netlify-static-fallback-v164",
    "ngeblogging-production-entry",
    "ngeblogging-production-route-v163",
    "ngeblogging-production-custom-domain-v164",
    "ngeblogging-auth-entry",
    "Cache-Control: no-store, max-age=0, must-revalidate",
    "/login", "/signin", "/signup", "/*       /index.html",
  ]) assert.ok(netlifyBuild.includes(marker), `Netlify fallback missing ${marker}`);
});

test("PWA compatibility keeps old auth routes while v248 owns current cache rotation", () => {
  for (const route of ["/login", "/signup", "/signin", "/auth/"]) {
    assert.ok(serviceWorker.includes(route), `auth surface missing ${route}`);
  }
  for (const mode of ["callback", "recovery", "session-expired", "callback-error"]) {
    assert.ok(serviceWorker.includes(mode), `auth mode missing ${mode}`);
  }
  for (const marker of [
    "ngeblogging-app-v248-native-stability-20260803",
    "studio-native-stability-cache-v248",
    "studio-native-stability-v248-20260803",
    "V248_OLD_CACHE_CLEANUP_MISSING",
    "V248_AUTH_SURFACE_GUARD_MISSING",
    "V248_FORCED_NAVIGATION_REMAINS",
  ]) assert.ok(v248Finalizer.includes(marker), `v248 cache authority missing ${marker}`);
  assert.equal(v248Release.version, "ngeblogging-app-v248-native-stability-20260803");
  assert.equal(v248Release.cache, "studio-native-stability-cache-v248");
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
  assert.ok(styleAuthority.includes('import "./studio-platform-v160.js";'));
});

test("Google LinkedIn email PKCE callback and persistent sessions remain wired through a single exchange owner", () => {
  for (const marker of [
    '"google"', '"linkedin_oidc"', "signInWithProvider", "signInWithPassword",
    "signInWithMagicLink", "persistSession: true", "autoRefreshToken: true",
    "AUTH_GATEWAY_PREFIX", "/api/auth-proxy",
  ]) assert.ok(auth.includes(marker), `auth source missing ${marker}`);
  assert.equal(occurrences(callbackConsumer, "exchangeCodeForSession(code)"), 1);
  assert.match(callbackConsumer, /auth-callback-singleflight-v162-20260730/);
  assert.doesNotMatch(callbackAuthority, /exchangeCodeForSession/);
  for (const marker of ["consumeAuthCallbackV162", "publishToBootstrap", "ngeblogging:auth-session-ready"]) {
    assert.ok(callbackAuthority.includes(marker), `callback authority missing ${marker}`);
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