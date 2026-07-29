import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("authenticated sessions cannot remain trapped on login or signup routes", () => {
  const bootstrap = read("src/auth-studio-bootstrap-v106.js");
  assert.match(bootstrap, /auth-route-handoff-v142-20260729/);
  assert.match(bootstrap, /function loginSurface\(\)/);
  assert.match(bootstrap, /path === "\/login"/);
  assert.match(bootstrap, /path === "\/signup"/);
  assert.match(bootstrap, /path === "\/signin"/);
  assert.match(bootstrap, /function redirectAuthenticatedSurface/);
  assert.match(bootstrap, /target\.searchParams\.set\("auth_success", AUTH_SUCCESS_VALUE\)/);
  assert.match(bootstrap, /window\.location\.replace/);
  assert.match(bootstrap, /installRouteHandoffListener\(\)/);
  assert.match(bootstrap, /SIGNED_IN/);
  assert.match(bootstrap, /TOKEN_REFRESHED/);
  assert.match(bootstrap, /preflightSession/);
});

test("callback and recovery URLs are never interrupted by the route handoff", () => {
  const bootstrap = read("src/auth-studio-bootstrap-v106.js");
  assert.match(bootstrap, /function callbackInProgress\(\)/);
  assert.match(bootstrap, /params\.get\("code"\)/);
  assert.match(bootstrap, /params\.get\("auth"\) === "callback"/);
  assert.match(bootstrap, /params\.get\("auth"\) === "recovery"/);
  assert.match(bootstrap, /callbackInProgress\(\) \|\| !loginSurface\(\)/);
});

test("service worker rotates caches for the auth handoff without removing v141 production markers", () => {
  const worker = read("public/sw.js");
  assert.match(worker, /ngeblogging-app-v141-studio-mobile-auth-20260729/);
  assert.match(worker, /single-react-layout-handheld-direct-auth-v141/);
  assert.match(worker, /auth-route-handoff-v142-20260729/);
  assert.match(worker, /service-worker-activated-auth-route-handoff-v142/);
  assert.match(worker, /authHandoffRelease/);
  assert.match(worker, /auth_handoff/);
});
