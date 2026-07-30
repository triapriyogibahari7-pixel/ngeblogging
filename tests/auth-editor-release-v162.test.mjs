import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const release = JSON.parse(read("public/release-v162.json"));
const worker = read("cloudflare/worker-v69.mjs");
const netlify = read("scripts/write-netlify-redirects.mjs");
const serviceWorker = read("public/sw.js");
const packageJson = JSON.parse(read("package.json"));

test("static v162 probe describes the tested authentication and editor contract", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, "2026.07.30-auth-editor-v162");
  assert.equal(release.authCallback, "auth-callback-v162-20260730");
  assert.equal(release.contentEditor, "content-editor-v162-20260730");
  assert.deepEqual(release.oauthProviders, ["google", "linkedin_oidc"]);
  for (const key of [
    "emailPasswordSessionHandoff", "pkceExplicitExchange", "callbackRefreshRecovery",
    "sessionPersistsUntilExplicitLogout", "draftIsNeverTruncated", "seoTitle",
    "socialMetadata", "pageNavigationSettings",
  ]) assert.equal(release[key], true, `${key} must be enabled`);
  assert.equal(release.wordLimit, 5000);
  assert.equal(release.wordWarningAt, 4500);
  assert.equal(release.responsiveViewportMinimum, 320);
  assert.equal(release.legacyWhiteR4, false);
});

test("Cloudflare and Netlify publish v162 on every authentication and Studio shell route", () => {
  for (const source of [worker, netlify]) {
    for (const marker of [
      "2026.07.30-auth-editor-v162",
      "/release-v162.json",
      "ngeblogging-auth-editor-v162",
      "auth-callback-v162-20260730",
      "content-editor-v162-20260730",
      "legacyWhiteR4: false",
    ]) assert.ok(source.includes(marker), `publisher missing ${marker}`);
  }
  for (const route of ["/login", "/signin", "/signup", "/forgot-password", "/reset-password", "/auth/callback", "/studio", "/dashboard", "/workspace"]) {
    assert.ok(worker.includes(route), `Worker route missing ${route}`);
    assert.ok(netlify.includes(route), `Netlify route missing ${route}`);
  }
  assert.match(worker, /x-ngeblogging-auth-editor/);
  assert.match(netlify, /X-Ngeblogging-Auth-Editor/);
});

test("PWA v162 rotates caches without interrupting OAuth callback or recovery", () => {
  for (const marker of [
    "ngeblogging-app-v162-auth-editor-20260730",
    "auth-editor-cache-v162",
    "service-worker-stale-shell-v162",
    "service-worker-activated-auth-editor-v162",
    "auth-callback-v162-20260730",
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

test("production build runs auth, editor and content patchers before every regression suite", () => {
  const prefix = "node scripts/patch-auth-callback-v162.mjs && node scripts/patch-content-editor-v162.mjs && node scripts/patch-studio-content-v161.mjs";
  assert.ok(packageJson.scripts.predev.startsWith(prefix));
  assert.ok(packageJson.scripts.test.startsWith(prefix));
  assert.ok(packageJson.scripts["test:production"].startsWith(prefix));
  for (const filename of ["tests/auth-callback-v162.test.mjs", "tests/content-editor-v162.test.mjs", "tests/auth-editor-release-v162.test.mjs"]) {
    assert.ok(packageJson.scripts["test:production"].includes(filename), `production suite missing ${filename}`);
  }
});
