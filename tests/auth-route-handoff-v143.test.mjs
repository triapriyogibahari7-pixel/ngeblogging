import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("valid sessions leave every login surface and open the Studio root", () => {
  const bootstrap = read("src/auth-studio-bootstrap-v106.js");
  assert.match(bootstrap, /auth-route-handoff-v143-20260729/);
  assert.match(bootstrap, /function loginSurface\(\)/);
  for (const route of ["login", "signup", "signin"]) {
    assert.match(bootstrap, new RegExp(`path === "\\/${route}"`));
  }
  assert.match(bootstrap, /authMode === "session-expired"/);
  assert.match(bootstrap, /authMode === "callback-error"/);
  assert.match(bootstrap, /function redirectAuthenticatedSurface/);
  assert.match(bootstrap, /new URL\("\/", window\.location\.origin\)/);
  assert.match(bootstrap, /target\.searchParams\.set\("auth_success", AUTH_SUCCESS_VALUE\)/);
  assert.match(bootstrap, /window\.location\.replace/);
  assert.match(bootstrap, /installRouteHandoffListener\(\)/);
  assert.match(bootstrap, /ngeblogging:auth-session-ready/);
});

test("OAuth callback and password recovery are never interrupted", () => {
  const bootstrap = read("src/auth-studio-bootstrap-v106.js");
  assert.match(bootstrap, /function callbackInProgress\(\)/);
  assert.match(bootstrap, /params\.get\("code"\)/);
  assert.match(bootstrap, /params\.get\("auth"\) === "callback"/);
  assert.match(bootstrap, /params\.get\("auth"\) === "recovery"/);
  assert.match(bootstrap, /callbackInProgress\(\) \|\| !loginSurface\(\)/);
});

test("v145 clears stale Studio clients while preserving the v143 auth handoff", () => {
  const worker = read("public/sw.js");
  assert.match(worker, /ngeblogging-app-v145-studio-mobile-cache-20260729/);
  assert.match(worker, /single-react-mobile-cache-v145/);
  assert.match(worker, /auth-route-handoff-v143-20260729/);
  assert.match(worker, /service-worker-activated-studio-mobile-cache-v145/);
  assert.match(worker, /authHandoffRelease/);
  assert.match(worker, /url\.pathname === "\/signin"/);
  assert.match(worker, /authMode === "session-expired"/);
  assert.match(worker, /authMode === "callback-error"/);
  assert.match(worker, /if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return/);
  assert.match(worker, /FORCE_REFRESH_QUERY/);
  assert.match(worker, /client\.navigate\(url\.href\)/);
});
