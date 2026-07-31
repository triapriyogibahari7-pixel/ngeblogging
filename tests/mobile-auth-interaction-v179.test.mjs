import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-interaction-v179.js");
const css = read("src/studio-interaction-v179.css");
const nara = read("src/NaraAssistant.jsx");
const auth = read("src/lib/supabase.js");
const authModal = read("src/AuthModal.jsx");
const sw = read("public/sw.js");
const worker = read("cloudflare/worker-v69.mjs");
const netlify = read("scripts/write-netlify-redirects.mjs");
const release = JSON.parse(read("public/release-v179.json"));

const modes = ["application", "phone", "mobile", "compact", "tablet", "desktop"];
const menu = ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"];

test("v179 loads after v177 and profile finalization v178", () => {
  const v177 = entry.indexOf('import "./studio-screenshot-stability-v177.js"');
  const v178 = entry.indexOf('import "./studio-finalization-v178.js"');
  const v179 = entry.indexOf('import "./studio-interaction-v179.js"');
  assert.ok(v177 >= 0 && v178 > v177 && v179 > v178);
  assert.match(runtime, /studio-mobile-auth-interaction-v179-20260731/);
});

test("drawer backdrop can never cover or disable the drawer", () => {
  for (const marker of [
    "main.inert = false", 'main.removeAttribute("inert")', "outside-backdrop-only",
    "--sm179-drawer-width", "2147482500", "2147482400", "backdrop-filter:none!important",
    "navigationStartsBelowCreatePost",
  ]) assert.ok(runtime.includes(marker) || css.includes(marker), `missing drawer marker ${marker}`);
  assert.match(css, /left:var\(--sm179-drawer-width\)!important/);
  assert.match(css, /width:calc\(100vw - var\(--sm179-drawer-width\)\)!important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.sn-side\.mobile-open[\s\S]*pointer-events:auto!important/);
});

test("mobile n logo and topbar are a single centered control", () => {
  assert.match(css, /\.sn-sidebar-toggle[\s\S]*place-items:center!important/);
  assert.match(css, /\.sn-mobile-menu-mark strong[\s\S]*font:800 30px\/1 Arial/);
  assert.match(css, /grid-template-columns:46px minmax\(0,1fr\) 46px!important/);
  assert.match(css, /\.sn-top>\.sn-workspace[\s\S]*display:none!important/);
});

test("Nara launcher and three window sizes remain stable and nonmodal where required", () => {
  assert.doesNotMatch(nara, /<b>Nara AI<\/b>[\s\S]*<small>Assistant<\/small>/);
  assert.match(nara, /recognition\.current\?\.stop\?\.\(\)/);
  for (const size of ["small", "medium", "full"]) assert.ok(nara.includes(`"${size}"`), `missing Nara size ${size}`);
  assert.match(runtime, /data\.naraInteractionV179 = full \? "modal" : "nonmodal"/);
  assert.match(css, /data-nara-interaction-v179="nonmodal"[\s\S]*display:none!important/);
  assert.match(css, /data-nara-size="small"[\s\S]*max-height:calc\(100dvh - 104px\)!important/);
  assert.match(css, /data-nara-size="medium"/);
  assert.match(css, /data-nara-size="full"/);
  assert.match(css, /data-nara-close-v179/);
  assert.match(css, /animation:none!important/);
});

test("profile remains separated while dropdown contains only three actions", () => {
  assert.match(entry, /studio-finalization-v178\.js/);
  assert.match(runtime, /new Set\(\["profile", "settings", "logout"\]\)/);
  assert.match(runtime, /data-action="install"/);
  assert.match(runtime, /data-action="avatar"/);
  assert.deepEqual(release.profile.actions, ["profile", "settings", "logout"]);
  assert.equal(release.profile.profileSeparatedFromSettings, true);
});

test("OAuth navigation bypasses a broken same-origin authorize proxy while token requests retain fallback", () => {
  assert.match(auth, /direct-supabase-authorize/);
  assert.match(auth, /direct\.pathname\.startsWith\("\/auth\/v1\/authorize"\)/);
  assert.match(auth, /network-retry-direct/);
  assert.match(auth, /\[502, 503, 504\]/);
  assert.match(auth, /persistSession: true/);
  assert.match(auth, /autoRefreshToken: true/);
  assert.match(authModal, /Koneksi login terputus/);
});

test("PWA and hosting probes rotate to v179 without forcing auth callbacks to reload", () => {
  for (const marker of [
    "ngeblogging-app-v179-mobile-auth-interaction-20260731",
    "mobile-auth-interaction-cache-v179",
    "service-worker-stale-shell-v179",
    "service-worker-activated-mobile-auth-interaction-v179",
    "NGE_BLOGGING_FORCE_RELOAD_V179",
    'url.pathname === "/login"', 'url.searchParams.has("code")',
  ]) assert.ok(sw.includes(marker), `missing service worker marker ${marker}`);
  assert.match(worker, /release-v179\.json/);
  assert.match(worker, /x-ngeblogging-mobile-auth-interaction/);
  assert.match(netlify, /release-v179\.json/);
  assert.match(netlify, /X-Ngeblogging-Mobile-Auth-Interaction/);
});

test("six modes, desktop variants, menu and honest capacity status are preserved", () => {
  assert.deepEqual(release.responsiveFamilies, modes);
  assert.deepEqual(release.desktopVariants, ["laptop", "computer"]);
  assert.equal(release.capacity.modelOnly, true);
  assert.equal(release.capacity.productionCredentialLoadTest, false);
  assert.equal(release.capacity.nineHundredBillionClaim, false);
  const studio = read("src/StudioNext.jsx");
  for (const label of menu) assert.ok(studio.includes(`>${label}<`), `missing menu ${label}`);
});

test("v179 stylesheet is syntactically balanced and blocks horizontal overflow", () => {
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);
  assert.match(css, /overflow-x:clip!important/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /@media\(orientation:landscape\) and \(max-height:600px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
