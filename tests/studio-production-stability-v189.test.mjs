import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const auth = read("src/lib/supabase.js");
const fastGate = read("src/StudioFastGate.jsx");
const studioEntry = read("src/Studio.jsx");
const runtime = read("src/studio-production-stability-v189.js");
const account = read("src/studio-account-surface-v189.js");
const css = read("src/studio-production-stability-v189.css");
const accountCss = read("src/studio-account-surface-v189.css");
const patch = read("scripts/patch-production-stability-v189.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");

const providerStart = auth.indexOf("function providerDestination");
const providerEnd = auth.indexOf("export async function signInWithProvider", providerStart);

test("v189 auth preserves sessions, falls back to direct Supabase, and never proxies OAuth provider destination", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /GATEWAY_FALLBACK_STATUSES = new Set\(\[404, 502, 503, 504\]\)/);
  assert.match(auth, /direct-supabase-fallback/);
  assert.ok(providerStart >= 0 && providerEnd > providerStart);
  assert.doesNotMatch(auth.slice(providerStart, providerEnd), /proxiedAuthUrl/);
  assert.match(auth.slice(providerStart, providerEnd), /direct-supabase-oauth/);
  assert.match(auth, /linkedin_oidc/);
});

test("v189 fast gate can resume a known workspace from persisted active-site snapshots", () => {
  assert.match(fastGate, /ngeblogging-active-site-snapshot-v186/);
  assert.match(fastGate, /ngeblogging-active-site-snapshot-v185/);
  assert.match(fastGate, /ngeblogging-active-site-snapshot-v183/);
  assert.match(fastGate, /resume-known-site/);
});

test("v189 is loaded after v188 and its runtime keeps the drawer and Nara interactive", () => {
  const v188 = studioEntry.indexOf('import "./studio-physical-mobile-v188.js";');
  const v189 = studioEntry.indexOf('import "./studio-production-stability-v189.js";');
  const accountEntry = studioEntry.indexOf('import "./studio-account-surface-v189.js";');
  assert.ok(v188 >= 0 && v189 > v188 && accountEntry > v189);
  assert.match(runtime, /studioProductionStabilityV189/);
  assert.match(runtime, /backdrop\.style\.setProperty\("inset", "0 0 0 var\(--v189-drawer-width\)"/);
  assert.match(runtime, /controls\.filter\(\(node\) => node !== native\)\.forEach\(\(node\) => node\.remove\(\)\)/);
  assert.match(runtime, /layer\.setAttribute\("aria-modal", String\(full\)\)/);
});

test("v189 fixes Android desktop-site clipping instead of clipping body to physical phone width", () => {
  assert.match(css, /data-studio-desktop-site-phone-v189="true"\]\s+body/);
  assert.match(css, /width:\s*var\(--v189-layout-width\)/);
  assert.match(css, /#root[\s\S]*width:\s*var\(--v189-physical-width\)/);
  assert.match(css, /zoom:\s*var\(--v189-desktop-site-zoom\)/);
  assert.doesNotMatch(css, /data-studio-desktop-site-phone-v189="true"\]\s+body\s*\{[^}]*width:\s*var\(--v189-physical-width\)/s);
});

test("v189 contains screenshot-proven Members, Analytics, editor, drawer, and Nara failures", () => {
  assert.match(css, /\.mv176-title-actions/);
  assert.match(css, /\.mv176-metrics/);
  assert.match(css, /\.op41-chart-grid/);
  assert.match(css, /\.op41-table-wrap/);
  assert.match(css, /\.ce-workspace/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*backdrop-filter:none/);
  assert.match(css, /data-production-nara-mode-v189="nonmodal"/);
  assert.match(css, /\.nara-native-size-controls-v149/);
  assert.match(css, /\.nara-composer-tools/);
  assert.match(css, /animation:none/);
});

test("Profile and Settings are distinct surfaces while reusing existing persisted forms", () => {
  assert.match(account, /surface = "profile"/);
  assert.match(account, /surface = "settings"/);
  assert.match(account, /data\.accountSurfaceV189|dataset\.accountSurfaceV189/);
  assert.match(accountCss, /data-account-surface-v189="profile"/);
  assert.match(accountCss, /data-account-surface-v189="settings"/);
});

test("v189 final build patch cleans Nara resources and rotates SW without forced navigation", () => {
  assert.match(patch, /recognition\.current = null/);
  assert.match(patch, /setListening\(false\)/);
  assert.match(patch, /setAttachmentMenu\(false\)/);
  assert.match(patch, /ngeblogging-app-v189-stability-20260801/);
  assert.match(patch, /V189_FORCED_NAVIGATION_REMAINS/);
  assert.match(chain, /patch-production-stability-v189\.mjs/);
});