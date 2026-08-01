import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-mobile-v189.js");
const account = read("src/studio-production-mobile-v189-account.js");
const css = read("src/studio-production-mobile-v189.css");
const narrowFix = read("src/studio-production-mobile-v189-fix.css");
const pipeline = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-production-mobile-v189.mjs");
const auth = read("src/lib/supabase.js");
const fastGate = read("src/StudioFastGate.jsx");
const deviceMode = read("src/studio-device-mode-v140.js");
const productionEnv = read(".env.production");

test("v189 is the last Studio authority and runs after data, UI, and physical-mobile patches", () => {
  assert.match(entry, /studio-production-mobile-v189\.js/);
  assert.match(entry, /studio-production-mobile-v189-account\.js/);
  assert.match(entry, /studio-production-mobile-v189-fix\.css/);
  assert.ok(entry.indexOf("studio-physical-mobile-v188.js") < entry.indexOf("studio-production-mobile-v189.js"));
  for (const file of [
    "patch-production-data-v186.mjs",
    "patch-production-ui-v187.mjs",
    "patch-production-physical-mobile-v188.mjs",
    "patch-production-mobile-v189.mjs",
  ]) assert.match(pipeline, new RegExp(file.replaceAll(".", "\\.")));
  assert.ok(pipeline.indexOf("patch-production-data-v186.mjs") < pipeline.indexOf("patch-production-ui-v187.mjs"));
  assert.ok(pipeline.indexOf("patch-production-ui-v187.mjs") < pipeline.indexOf("patch-production-physical-mobile-v188.mjs"));
  assert.ok(pipeline.indexOf("patch-production-physical-mobile-v188.mjs") < pipeline.indexOf("patch-production-mobile-v189.mjs"));
});

test("six responsive families and desktop laptop/computer variants remain enabled", () => {
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) {
    assert.match(deviceMode, new RegExp(`"${mode}"`));
  }
  assert.match(deviceMode, /return "laptop"/);
  assert.match(deviceMode, /return "computer"/);
  assert.match(deviceMode, /display-mode: standalone/);
});

test("production Vite build always receives the public Supabase browser configuration", () => {
  assert.match(productionEnv, /^VITE_SUPABASE_URL=https:\/\/[^\s]+\.supabase\.co$/m);
  assert.match(productionEnv, /^VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_[^\s]+$/m);
  assert.doesNotMatch(productionEnv, /^\s*(?:VITE_)?SUPABASE_SERVICE_ROLE_KEY\s*=/m);
  assert.doesNotMatch(productionEnv, /^\s*VITE_.*(?:SECRET|SERVICE_ROLE).*=/mi);
});

test("authentication is resilient at source and provider destinations are never routed through the auth proxy", () => {
  assert.match(auth, /auth-resilience-v189/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /GATEWAY_FALLBACK_STATUSES = new Set\(\[404, 502, 503, 504\]\)/);
  assert.match(auth, /direct-supabase-fallback/);
  assert.match(auth, /direct-fallback-v186/);
  assert.match(auth, /direct-supabase-oauth-v186/);
  const providerStart = auth.indexOf("function providerDestination");
  const providerEnd = auth.indexOf("export async function signInWithProvider", providerStart);
  assert.ok(providerStart >= 0 && providerEnd > providerStart);
  assert.doesNotMatch(auth.slice(providerStart, providerEnd), /proxiedAuthUrl/);
  assert.match(auth.slice(providerStart, providerEnd), /direct-supabase-oauth/);
  assert.match(auth, /linkedin_oidc/);
});

test("authenticated users can resume a cached workspace before a temporary network failure completes", () => {
  assert.match(fastGate, /studio-fast-entry-v189/);
  assert.match(fastGate, /ngeblogging-active-site-snapshot-v186/);
  assert.match(fastGate, /ngeblogging-active-site-snapshot-v185/);
  assert.match(fastGate, /ngeblogging-active-site-snapshot-v183/);
  assert.match(fastGate, /resume-known-site/);
});

test("Android desktop-site compensation does not clip a zoomed root inside a physical-width body", () => {
  assert.match(runtime, /body\.style\.setProperty\("width", "100vw"/);
  assert.match(runtime, /appRoot\.style\.setProperty\("width", `\$\{state\.physicalWidth\}px`/);
  assert.match(runtime, /appRoot\.style\.setProperty\("zoom", String\(ratio\)/);
  assert.doesNotMatch(runtime, /body\.style\.setProperty\("width", `\$\{state\.physicalWidth\}px`/);
  assert.match(css, /data-studio-desktop-site-phone-v189="true"[\s\S]*width: 100vw/);
});

test("mobile drawer remains above a dimmer that only covers the outside area", () => {
  assert.match(css, /#ngeblogging-studio-sidebar[\s\S]*z-index: 2147483100/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*z-index: 2147483000/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*inset: 0 0 0 var\(--v189-drawer-width\)/);
  assert.match(runtime, /sidebar\.querySelectorAll\("button,a,input,select,textarea"\)/);
  assert.match(runtime, /node\.style\.setProperty\("pointer-events", "auto"/);
  assert.match(narrowFix, /left: var\(--v189-drawer-width\)/);
});

test("summary, comments, and Media are constrained to normal mobile flow", () => {
  assert.match(css, /\.sc161-hero[\s\S]*grid-template-columns: minmax\(0,1fr\)/);
  assert.match(css, /\.sc161-recent>button[\s\S]*grid-template-columns: 36px minmax\(0,1fr\) auto/);
  assert.match(css, /\.sv124-toggle-row>input[\s\S]*opacity: 0/);
  assert.match(css, /\.sv124-toggle-row>input:checked\+i/);
  assert.match(css, /\.sn-media-tools>nav[\s\S]*flex-direction: row/);
  assert.match(css, /\.sn-media-tools>nav[\s\S]*overflow-x: auto/);
});

test("Nara small and medium remain non-modal with visible close and stable controls", () => {
  assert.match(runtime, /layer\.dataset\.v189NaraMode = mode/);
  assert.match(runtime, /setBooleanPropertyIfChanged\(backdrop, "hidden", !full\)/);
  assert.match(runtime, /setAttributeIfChanged\(close, "aria-label", "Tutup Nara AI"\)/);
  assert.match(css, /data-v189-nara-mode="nonmodal"[\s\S]*pointer-events: none/);
  assert.match(css, /data-v189-nara-mode="nonmodal"[\s\S]*\.nara-assistant-shell[\s\S]*pointer-events: auto/);
  assert.match(css, /\.nara-size-controls-v147[\s\S]*grid-row: 2/);
  assert.match(css, /\.nara-composer-tools[\s\S]*grid-template-columns: 40px 40px minmax\(0,1fr\) 40px/);
});

test("profile and settings are distinct without deleting the complete settings form", () => {
  assert.match(runtime, /studioAccountViewV189 = profileButton \? "profile" : "settings"/);
  assert.match(css, /data-studio-account-view-v189="profile"[\s\S]*\.sn-settings-grid>section:not\(:first-child\)/);
  assert.match(runtime, /sidebarSettings\?\.click\(\)/);
  assert.match(account, /Simpan profil/);
  assert.match(account, /Simpan perubahan/);
});

test("MutationObserver repairs are idempotent and do not rewrite equal text or attributes", () => {
  assert.match(runtime, /function setAttributeIfChanged/);
  assert.match(runtime, /function setBooleanPropertyIfChanged/);
  assert.match(runtime, /function setTextIfChanged/);
  assert.doesNotMatch(runtime, /attributeFilter:[\s\S]*"style"/);
  assert.match(account, /if \(node && node\.textContent !== value\)/);
  assert.match(account, /textNode\.textContent !== value/);
});

test("v189 patch rotates cache without destructive session actions", () => {
  assert.match(patch, /ngeblogging-app-v189-production-mobile-20260801/);
  assert.match(patch, /production-mobile-cache-v189/);
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(|signOut\s*\(/);
});
