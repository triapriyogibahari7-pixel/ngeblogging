import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studio = read("src/Studio.jsx");
const activation = read("scripts/activate-studio-native-v250.mjs");
const finalizer = read("scripts/finalize-studio-v255-order.mjs");
const vite = read("vite.config.js");
const auth = read("src/lib/supabase.js");
const authGateway = read("server/auth-gateway-v108.mjs");

test("v255 interaction source remains after v253", () => {
  const v253 = studio.indexOf('import "./studio-shell-nara-v253.css";');
  const v255Runtime = studio.indexOf('import "./studio-shell-interaction-v255.js";');
  const v255Css = studio.indexOf('import "./studio-shell-interaction-v255.css";');
  assert.ok(v253 >= 0);
  assert.ok(v255Runtime > v253);
  assert.ok(v255Css > v255Runtime);
});

test("legacy v250 activator stays unchanged while a post-activator finalizer restores v255 order", () => {
  assert.match(activation, /studio-native-bundle-activation-v250-20260804/);
  assert.doesNotMatch(activation, /studio-shell-interaction-v255/);
  assert.match(finalizer, /studio-v255-post-activator-order-v256-20260804/);
  assert.match(finalizer, /studio-shell-interaction-v255\.js/);
  assert.match(finalizer, /studio-shell-interaction-v255\.css/);
  assert.match(finalizer, /V256_V255_FINAL_ORDER_INVALID/);
  assert.match(finalizer, /V256_V255_RUNTIME_DUPLICATE/);
  assert.match(finalizer, /V256_V255_CSS_DUPLICATE/);
  assert.match(vite, /finalizeStudioV255Order/);
  assert.ok(vite.indexOf("await finalizeStudioV255Order()") > vite.indexOf("await activateStudioNativeV250()"));
});

test("stable Supabase v190 client contract and session persistence remain untouched", () => {
  assert.match(auth, /AUTH_RELEASE = "auth-resilience-v190-20260801"/);
  assert.match(auth, /DATA_TRANSPORT_RELEASE_V190 = "studio-data-gateway-v190-20260801"/);
  assert.match(auth, /"x-client-info": "ngeblogging-web-v190"/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /detectSessionInUrl:\s*false/);
  assert.match(auth, /signOut\(\{ scope: "local" \}\)/);
  assert.doesNotMatch(auth, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
});

test("auth gateway keeps v153/v255 compatibility and adds a bounded v256 upstream wait", () => {
  assert.match(authGateway, /AUTH_GATEWAY_RELEASE = "2026\.07\.30-auth-gateway-v153"/);
  assert.match(authGateway, /AUTH_GATEWAY_PUBLIC_FALLBACK_RELEASE = "auth-gateway-public-fallback-v255-20260804"/);
  assert.match(authGateway, /AUTH_GATEWAY_TIMEOUT_RELEASE_V256 = "auth-gateway-timeout-v256-20260804"/);
  assert.match(authGateway, /AUTH_UPSTREAM_TIMEOUT_MS = 7_000/);
  assert.match(authGateway, /new AbortController\(\)/);
  assert.match(authGateway, /controller\.abort\("auth-upstream-timeout"\)/);
  assert.match(authGateway, /signal: controller\.signal/);
  assert.match(authGateway, /timedOut \? 504 : 502/);
  assert.match(authGateway, /AUTH_UPSTREAM_TIMEOUT/);
  assert.match(authGateway, /production-public-fallback/);
  assert.match(authGateway, /x-ngeblogging-auth-timeout/);
  assert.doesNotMatch(authGateway, /SUPABASE_SERVICE_ROLE_KEY|service_role_key|sb_secret_/i);
});

test("auth timeout does not clear sessions or trigger logout", () => {
  assert.doesNotMatch(authGateway, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.match(authGateway, /Sesi lokal tidak dihapus/);
});
