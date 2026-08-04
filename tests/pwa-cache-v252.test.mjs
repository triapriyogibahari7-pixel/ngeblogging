import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const sw = read("public/sw.js");
const patch = read("scripts/patch-service-worker-v252.mjs");
const authFinalizer = read("scripts/patch-auth-production-v245.mjs");

test("production build rotates shell and asset caches to v252", () => {
  assert.match(sw, /ngeblogging-app-v252-source-stability-20260804/);
  assert.match(sw, /source-stability-cache-v252/);
  assert.match(sw, /source-stability-v252/);
  assert.match(sw, /pwa-source-stability-v252-20260804/);
  assert.match(sw, /NGE_BLOGGING_UPDATE_AVAILABLE_V252/);
});

test("v252 cache activation deletes old caches but never forces WindowClient navigation", () => {
  assert.match(sw, /caches\.keys\(\)/);
  assert.match(sw, /caches\.delete/);
  assert.match(sw, /SHELL_CACHE/);
  assert.match(sw, /ASSET_CACHE/);
  assert.doesNotMatch(sw, /await\s+refreshStaleWindow\s*\(/);
  assert.match(patch, /no forced WindowClient navigation/);
  assert.match(patch, /V252_PWA_FORCED_REFRESH_CALL_FOUND/);
});

test("auth and callback surfaces remain excluded from update notifications", () => {
  for (const marker of [
    'url.pathname === "/login"',
    'url.pathname === "/signup"',
    'url.pathname === "/signin"',
    'authMode === "callback"',
    'authMode === "recovery"',
    'authMode === "session-expired"',
    'authMode === "callback-error"',
  ]) assert.ok(sw.includes(marker), `missing auth surface guard ${marker}`);
  assert.match(sw, /if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return/);
});

test("v252 cache finalizer runs after historical production patches without rewriting Studio", () => {
  assert.match(authFinalizer, /patch-service-worker-v252\.mjs/);
  assert.doesNotMatch(authFinalizer, /activateStudioNativeV250\(\)/);
  assert.doesNotMatch(authFinalizer, /finalize-studio-v252\.mjs/);
  assert.match(authFinalizer, /Studio source is intentionally left untouched/);
  assert.ok(authFinalizer.indexOf("patch-service-worker-v252.mjs") > authFinalizer.indexOf("Applied ${RELEASE}"));
});
