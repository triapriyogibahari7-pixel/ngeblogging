import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const release = JSON.parse(read("public/release-v162.json"));
const capacity = JSON.parse(read("public/auth-capacity-v162.json"));
const worker = read("cloudflare/worker-v69.mjs");
const netlify = read("scripts/write-netlify-redirects.mjs");
const serviceWorker = read("public/sw.js");
const packageJson = JSON.parse(read("package.json"));

const CALLBACK_RELEASE = "auth-callback-singleflight-v162-20260730";
const CALLBACK_COMPAT_RELEASE = "auth-callback-v162-20260730";
const CAPACITY_RELEASE = "auth-capacity-model-v162-20260730";

test("static v162 probe describes the tested authentication editor and capacity contract", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, "2026.07.30-auth-editor-v162");
  assert.equal(release.authCallback, CALLBACK_RELEASE);
  assert.equal(release.authCallbackCompatibility, CALLBACK_COMPAT_RELEASE);
  assert.equal(release.authCapacityModel, CAPACITY_RELEASE);
  assert.equal(release.contentEditor, "content-editor-v162-20260730");
  assert.deepEqual(release.oauthProviders, ["google", "linkedin_oidc"]);
  for (const key of [
    "emailPasswordSessionHandoff", "pkceExplicitExchange", "pkceSingleFlight",
    "callbackRefreshRecovery", "sessionPersistsUntilExplicitLogout",
    "capacityModelOnly", "draftIsNeverTruncated", "seoTitle",
    "socialMetadata", "pageNavigationSettings",
  ]) assert.equal(release[key], true, `${key} must be enabled`);
  assert.equal(release.callbackProcessors, 1);
  assert.equal(release.productionCredentialLoadTest, false);
  assert.equal(release.safePublicGetSmokeMaximumRequests, 200);
  assert.equal(release.capacityVisualization, "/auth-capacity-v162.html");
  assert.equal(release.wordLimit, 5000);
  assert.equal(release.wordWarningAt, 4500);
  assert.equal(release.responsiveViewportMinimum, 320);
  assert.equal(release.legacyWhiteR4, false);
  assert.equal(capacity.release, CAPACITY_RELEASE);
  assert.equal(capacity.status, "model-only");
});

test("Cloudflare and Netlify publish single-flight auth and capacity markers on shell routes", () => {
  for (const source of [worker, netlify]) {
    for (const marker of [
      "2026.07.30-auth-editor-v162",
      "/release-v162.json",
      "ngeblogging-auth-editor-v162",
      CALLBACK_RELEASE,
      CALLBACK_COMPAT_RELEASE,
      CAPACITY_RELEASE,
      "/auth-capacity-v162.json",
      "/auth-capacity-v162.html",
      "content-editor-v162-20260730",
      "legacyWhiteR4: false",
    ]) assert.ok(source.includes(marker), `publisher missing ${marker}`);
  }
  for (const route of ["/login", "/signin", "/signup", "/forgot-password", "/reset-password", "/auth/callback", "/studio", "/dashboard", "/workspace"]) {
    assert.ok(worker.includes(route), `Worker route missing ${route}`);
    assert.ok(netlify.includes(route), `Netlify route missing ${route}`);
  }
  assert.match(worker, /x-ngeblogging-auth-editor/);
  assert.match(worker, /x-ngeblogging-auth-callback/);
  assert.match(worker, /x-ngeblogging-auth-capacity/);
  assert.match(netlify, /X-Ngeblogging-Auth-Editor/);
  assert.match(netlify, /X-Ngeblogging-Auth-Callback/);
  assert.match(netlify, /X-Ngeblogging-Auth-Capacity/);
});

test("PWA v162 rotates caches without interrupting OAuth callback or recovery", () => {
  for (const marker of [
    "ngeblogging-app-v162-auth-editor-20260730",
    "auth-editor-cache-v162",
    "service-worker-stale-shell-v162",
    "service-worker-activated-auth-editor-v162",
    CALLBACK_COMPAT_RELEASE,
    "content-editor-v162-20260730",
    "caches.delete",
    "cache: \"reload\"",
    "cache: \"no-store\"",
  ]) assert.ok(serviceWorker.includes(marker), `service worker missing ${marker}`);
  for (const route of ["/login", "/signup", "/signin", "/forgot-password", "/reset-password", "/auth/"]) assert.ok(serviceWorker.includes(route));
  assert.match(serviceWorker, /url\.searchParams\.has\("code"\)/);
  assert.match(serviceWorker, /url\.searchParams\.has\("error"\)/);
  assert.match(serviceWorker, /if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return/);
});

test("production build runs auth editor content capacity and route regression suites", () => {
  const prefix = "node scripts/patch-auth-callback-v162.mjs && node scripts/patch-content-editor-v162.mjs && node scripts/patch-studio-content-v161.mjs";
  assert.ok(packageJson.scripts.predev.startsWith(prefix));
  assert.ok(packageJson.scripts.test.startsWith(prefix));
  assert.ok(packageJson.scripts["test:production"].startsWith(prefix));
  assert.match(packageJson.scripts.prebuild, /auth-capacity-model-v162/);
  assert.match(packageJson.scripts.pretest, /auth-capacity-model-v162/);
  for (const filename of [
    "tests/auth-callback-v162.test.mjs",
    "tests/content-editor-v162.test.mjs",
    "tests/auth-editor-release-v162.test.mjs",
    "tests/auth-capacity-v162.test.mjs",
    "tests/production-route-v163.test.mjs",
  ]) {
    assert.ok(packageJson.scripts["test:production"].includes(filename), `production suite missing ${filename}`);
  }
});
