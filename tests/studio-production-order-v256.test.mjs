import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const finalizer = read("scripts/finalize-studio-v255-order.mjs");
const vite = read("vite.config.js");
const auth = read("src/lib/supabase.js");
const authGateway = read("server/auth-gateway-v108.mjs");

test("v256 runs a post-activator finalizer that keeps v255 interaction files last", () => {
  assert.ok(finalizer.includes("studio-v255-post-activator-order-v256-20260804"));
  assert.ok(finalizer.includes("studio-shell-interaction-v255.js"));
  assert.ok(finalizer.includes("studio-shell-interaction-v255.css"));
  assert.ok(finalizer.includes("V256_V255_FINAL_ORDER_INVALID"));
  assert.ok(vite.includes('import { finalizeStudioV255Order } from "./scripts/finalize-studio-v255-order.mjs";'));
  assert.ok(vite.includes("await activateStudioNativeV250()"));
  assert.ok(vite.includes("await finalizeStudioV255Order()"));
});

test("v256 bounds the server auth upstream without changing the legacy auth gateway identity", () => {
  assert.ok(authGateway.includes('AUTH_GATEWAY_RELEASE = "2026.07.30-auth-gateway-v153"'));
  assert.ok(authGateway.includes('AUTH_GATEWAY_PUBLIC_FALLBACK_RELEASE = "auth-gateway-public-fallback-v255-20260804"'));
  assert.ok(authGateway.includes('AUTH_GATEWAY_TIMEOUT_RELEASE_V256 = "auth-gateway-timeout-v256-20260804"'));
  assert.ok(authGateway.includes("AUTH_UPSTREAM_TIMEOUT_MS = 7_000"));
  assert.ok(authGateway.includes("new AbortController()"));
  assert.ok(authGateway.includes('controller.abort("auth-upstream-timeout")'));
  assert.ok(authGateway.includes("signal: controller.signal"));
  assert.ok(authGateway.includes("timedOut ? 504 : 502"));
  assert.ok(authGateway.includes("AUTH_UPSTREAM_TIMEOUT"));
  assert.ok(!/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(authGateway));
});

test("v256 leaves the proven Supabase v190 persistence contract intact", () => {
  assert.ok(auth.includes('AUTH_RELEASE = "auth-resilience-v190-20260801"'));
  assert.ok(auth.includes('DATA_TRANSPORT_RELEASE_V190 = "studio-data-gateway-v190-20260801"'));
  assert.ok(auth.includes('"x-client-info": "ngeblogging-web-v190"'));
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /detectSessionInUrl:\s*false/);
  assert.ok(!/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/.test(auth));
});
