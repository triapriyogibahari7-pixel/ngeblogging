import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v185.js");
const css = read("src/studio-production-v185.css");
const patch = read("scripts/patch-production-v185.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");
const studio = read("src/StudioNext.jsx");
const gate = read("src/StudioOnboardingGate.jsx");
const auth = read("src/lib/supabase.js");
const domain = read("src/DomainPanelV124.jsx");
const comments = read("src/CommentsPanelV124.jsx");
const nara = read("src/NaraAssistant.jsx");
const serviceWorker = read("public/sw.js");
const packageJson = JSON.parse(read("package.json"));
const release = JSON.parse(read("public/release-v185.json"));

test("v185 is loaded after v183 and is part of the synchronous patch chain", () => {
  const controls = entry.indexOf('import "./studio-production-v183-controls.css";');
  const v185 = entry.indexOf('import "./studio-production-v185.js";');
  assert.ok(controls >= 0);
  assert.ok(v185 > controls);
  assert.match(runtime, /studio-production-source-v185-20260801/);
  assert.match(chain, /patch-production-v185\.mjs/);
});

test("active site bootstrap no longer collapses when profile or one cloud request fails", () => {
  assert.match(studio, /studio-bootstrap-resilient-v185/);
  assert.match(studio, /readActiveSiteSnapshotV185/);
  assert.match(studio, /writeActiveSiteSnapshotV185/);
  assert.match(studio, /listUserSites\(user\.id\)/);
  assert.match(studio, /getUserProfile\(user\.id\)\.then/);
  assert.doesNotMatch(studio, /Promise\.all\(\[getOrCreatePrimarySite/);
  assert.doesNotMatch(studio, /getOrCreatePrimarySite\(user\)/);
  assert.match(studio, /loadLocalDocs\(!user\?\.id\)/);
  assert.match(studio, /return allowStarter \? STARTER : \[\]/);
});

test("transient startup failures retain the cached site and session", () => {
  assert.match(gate, /cachedActiveSiteV185/);
  assert.match(gate, /degraded-session-retained/);
  assert.match(gate, /force: attempt > 0/);
  assert.match(gate, /studio-online-retry-v185/);
  assert.doesNotMatch(gate, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(gate, /signOut\s*\(/);
});

test("all login methods have a direct Supabase fallback when the same-origin gateway is unavailable", () => {
  assert.match(auth, /direct-fallback-v185/);
  assert.match(auth, /\[404, 502, 503, 504\]/);
  assert.match(auth, /return nativeFetch\(directInput, init\)/);
  assert.match(auth, /direct-supabase-oauth/);
  assert.doesNotMatch(auth, /return proxy\?\.toString\(\) \|\| direct\.toString\(\)/);
});

test("Domain and Comments stop loading when the active site is unavailable", () => {
  assert.match(domain, /getVerifiedSession\(\{ force: false \}\)/);
  assert.match(domain, /setLoading\(false\); setError\("Situs aktif belum tersedia/);
  assert.doesNotMatch(domain, /isSessionReauthError\(nextError\) \|\| \[401, 403\]/);
  assert.match(comments, /setLoading\(false\); setError\(!site\?\.id/);
  assert.match(comments, /Koneksi komentar belum tersedia/);
});

test("Nara small and medium are source-level non-modal windows", () => {
  assert.match(nara, /data-nara-mode=\{size === "full" \? "modal" : "nonmodal"\}/);
  assert.match(nara, /hidden=\{size !== "full"\}/);
  assert.match(nara, /tabIndex=\{size === "full" \? 0 : -1\}/);
  assert.match(runtime, /repairNara/);
  assert.match(runtime, /backdrop\.hidden = !full/);
  assert.match(css, /data-nara-mode="nonmodal"/);
  assert.match(css, /pointer-events:\s*none\s*!important/);
  assert.match(css, /nara-assistant-shell[\s\S]*pointer-events:\s*auto\s*!important/);
});

test("drawer, Media and mobile editor remain usable without vertical text or overlay panels", () => {
  assert.match(runtime, /repairDrawer/);
  assert.match(runtime, /main\?\.removeAttribute\("inert"\)/);
  assert.match(css, /\.sn-shell > \.sn-side[\s\S]*z-index:\s*2147483300/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*z-index:\s*2147483200/);
  assert.match(css, /\.sn-media-tools > nav\[data-media-toolbar-v185\][\s\S]*overflow-x:\s*auto/);
  assert.match(css, /grid-template-areas:\s*"back file"\s*"actions actions"/);
  assert.match(css, /\.ce-file :is\(b,small,span\)[\s\S]*white-space:\s*nowrap/);
  assert.doesNotMatch(css, /word-break:\s*break-all/);
});

test("service worker rotates cache without forced navigation or logout", () => {
  assert.match(serviceWorker, /ngeblogging-app-v185-production-source-20260801/);
  assert.match(serviceWorker, /production-source-cache-v185/);
  assert.match(serviceWorker, /PRODUCTION_SOURCE_RELEASE_V185/);
  assert.doesNotMatch(serviceWorker, /await refreshStaleWindow\(client, url\);/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(runtime, /signOut\s*\(/);
});

test("production scripts and release metadata include v185", () => {
  assert.match(packageJson.scripts["verify:v185"], /studio-production-v185\.test\.mjs/);
  assert.match(packageJson.scripts["test:production"], /studio-production-v185\.test\.mjs/);
  assert.equal(release.release, "studio-production-source-v185-20260801");
  assert.equal(release.repairs.authDirectFallback, true);
  assert.equal(release.repairs.activeSiteBootstrapNonBlocking, true);
  assert.equal(release.repairs.naraSmallMediumNonModal, true);
  assert.ok(release.repairs.responsiveFamilies.includes("application"));
  assert.ok(release.repairs.responsiveFamilies.includes("computer"));
  assert.match(patch, /V185_FORCED_NAVIGATION_MUST_REMAIN_DISABLED/);
});
