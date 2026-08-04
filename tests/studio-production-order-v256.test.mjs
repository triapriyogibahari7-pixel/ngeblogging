import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studio = read("src/Studio.jsx");
const activation = read("scripts/activate-studio-native-v250.mjs");
const vite = read("vite.config.js");
const rotate = read("scripts/service-worker-v256-rotate.mjs");
const auth = read("src/lib/supabase.js");
const callback = read("src/auth-callback-authority-v107.js");
const authGateway = read("server/auth-gateway-v108.mjs");
const dataGateway = read("server/data-gateway-v110.mjs");
const worker = read("cloudflare/worker-v67.mjs");

test("v255 interaction source remains after v253 and the build activator preserves that final order", () => {
  const v253 = studio.indexOf('import "./studio-shell-nara-v253.css";');
  const v255Runtime = studio.indexOf('import "./studio-shell-interaction-v255.js";');
  const v255Css = studio.indexOf('import "./studio-shell-interaction-v255.css";');
  assert.ok(v253 >= 0);
  assert.ok(v255Runtime > v253);
  assert.ok(v255Css > v255Runtime);

  assert.match(activation, /studio-native-bundle-activation-v256-20260804/);
  assert.match(activation, /FINAL_INTERACTION_RELEASE = "studio-shell-interaction-v255-20260804"/);
  assert.match(activation, /ensureLastImport\(source, "studio-shell-interaction-v255\.js"\)/);
  assert.match(activation, /ensureLastImport\(source, "studio-shell-interaction-v255\.css"\)/);
  assert.match(activation, /V256_V255_RUNTIME_ORDER_INVALID/);
  assert.match(activation, /V256_V255_CSS_ORDER_INVALID/);
});

test("production data gateway has an official-host publishable fallback and never embeds a privileged Supabase key", () => {
  assert.match(dataGateway, /DATA_GATEWAY_PUBLIC_FALLBACK_RELEASE/);
  assert.match(dataGateway, /PRODUCTION_SUPABASE_URL/);
  assert.match(dataGateway, /PRODUCTION_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(dataGateway, /resolveDataGatewayConfig/);
  assert.match(dataGateway, /production-public-fallback/);
  assert.match(dataGateway, /officialNgebloggingHost/);
  assert.match(dataGateway, /x-ngeblogging-data-config/);
  assert.doesNotMatch(dataGateway, /SUPABASE_SERVICE_ROLE_KEY|service_role_key|sb_secret_/i);
});

test("health reports real auth and data readiness instead of hard-coding data as ready", () => {
  assert.match(worker, /resolveAuthGatewayConfig/);
  assert.match(worker, /resolveDataGatewayConfig/);
  assert.match(worker, /const dataConfigured = dataConfig\.ready/);
  assert.match(worker, /dataGateway: dataConfigured/);
  assert.match(worker, /dataGatewayServices: dataConfigured \? \["rest", "storage"\] : \[\]/);
  assert.match(worker, /dataConfigSource: dataConfig\.source/);
  assert.match(worker, /same-origin-data-gateway-public-fallback/);
  assert.doesNotMatch(worker, /dataGateway:\s*true,[\s\S]*dataGatewayServices:\s*\["rest", "storage"\]/);
});

test("browser auth waits a bounded time for the auth gateway and validates gateway authority before trusting it", () => {
  assert.match(auth, /AUTH_GATEWAY_DEADLINE_MS = 8_000/);
  assert.match(auth, /fetchAuthGatewayWithDeadline/);
  assert.match(auth, /AUTH_GATEWAY_TIMEOUT/);
  assert.match(auth, /gatewayResponseHasAuthority/);
  assert.match(auth, /response\.status >= 500/);
  assert.match(auth, /direct-supabase-fallback/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /signOut\(\{ scope: "local" \}\)/);
});

test("email password direct recovery uses the same public production client when Vite env is absent", () => {
  assert.match(callback, /PRODUCTION_SUPABASE_URL_V245/);
  assert.match(callback, /PRODUCTION_SUPABASE_PUBLISHABLE_KEY_V245/);
  assert.match(callback, /officialProductionHost/);
  assert.match(callback, /AUTH_GATEWAY_TIMEOUT/);
  assert.match(callback, /supabase\.auth\.setSession/);
  assert.match(callback, /authPasswordFallbackV256/);
  assert.doesNotMatch(callback, /SUPABASE_SERVICE_ROLE_KEY|service_role_key|sb_secret_/i);
});

test("existing v255 auth gateway fallback is retained rather than replaced", () => {
  assert.match(authGateway, /AUTH_GATEWAY_PUBLIC_FALLBACK_RELEASE/);
  assert.match(authGateway, /resolveAuthGatewayConfig/);
  assert.match(authGateway, /production-public-fallback/);
  assert.match(authGateway, /x-ngeblogging-auth-config/);
});

test("v256 service worker rotation runs after v253 and cannot log users out or force-navigate auth/editor tabs", () => {
  assert.match(vite, /rotateServiceWorkerV256/);
  assert.ok(vite.indexOf("rotateServiceWorkerV256()") > vite.indexOf("rotateServiceWorkerV253()"));
  assert.match(rotate, /ACTIVE_VERSION_V253/);
  assert.match(rotate, /ACTIVE_VERSION_V256/);
  assert.match(rotate, /studioProductionOrderDataReleaseV256/);
  assert.match(rotate, /NGE_BLOGGING_UPDATE_AVAILABLE_V256/);
  assert.match(rotate, /V256_ROTATE_OLD_CACHE_CLEANUP_MISSING/);
  assert.match(rotate, /V256_ROTATE_AUTH_SURFACE_GUARD_MISSING/);
  assert.doesNotMatch(rotate, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.match(rotate, /V256_ROTATE_FORCED_NAVIGATION_REMAINS/);
});
