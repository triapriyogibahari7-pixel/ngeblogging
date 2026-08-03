import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-source-stability-v237.js");
const ui = read("src/studio-source-stability-v237-ui.js");
const css = read("src/studio-source-stability-v237.css");
const studio = read("src/StudioNext.jsx");
const analytics = read("src/studio-analytics-v41.js");
const operations = read("src/studio-operations-v41.js");
const auth = read("src/lib/supabase.js");
const verifier = read("scripts/patch-production-v237.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");
const vite = read("vite.config.js");
const swLib = read("scripts/service-worker-v237-lib.mjs");
const release = JSON.parse(read("public/release-v237.json"));

const RELEASE = "studio-source-stability-v237-20260803";
const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v237 loads after v236 and its rendered UI authority loads last", () => {
  const previous = entry.indexOf('import "./studio-real-device-v236.js"');
  const current = entry.indexOf('import "./studio-source-stability-v237.js"');
  const rendered = entry.indexOf('import "./studio-source-stability-v237-ui.js"');
  assert.ok(previous >= 0);
  assert.ok(current > previous);
  assert.ok(rendered > current);
  assert.match(runtime, new RegExp(RELEASE));
  assert.match(chain, /patch-production-v237\.mjs/);
});

test("physical handheld safety overrides stale desktop geometry without removing Theme preview modes", () => {
  assert.match(runtime, /physicalMetrics/);
  assert.match(runtime, /studioHandheld/);
  assert.match(runtime, /v235Family/);
  assert.match(runtime, /v236Family/);
  assert.match(css, /data-v237-family="small"/);
  for (const mode of ["application","phone","mobile","compact","tablet","desktop"]) assert.ok(release.responsiveFamilies.includes(mode));
});

test("Profile and Settings are separated at render time while historical React source remains intact", () => {
  assert.match(ui, /v237RenderedSettings/);
  assert.match(ui, /moved-to-profile-menu/);
  assert.match(ui, /title\.textContent = "Pengaturan"/);
  assert.match(ui, /Profil, biografi, website, dan avatar akun/);
  assert.match(operations, /Tambah situs/);
  assert.equal(release.renderedCorrections.historicalReactSourcePreserved, true);
  assert.equal(release.renderedCorrections.profileSeparatedFromSettings, true);
  assert.equal(release.renderedCorrections.settingsRenderedSiteOnly, true);
  assert.equal(release.renderedCorrections.summaryAddSiteAction, true);
});

test("25-site guard stays internal while quota number is removed from ordinary rendered UI", () => {
  assert.match(studio, /MAX_SITES_PER_ACCOUNT = 25/);
  assert.match(ui, /Kelola situs dalam akun ini/);
  assert.match(ui, /Batas situs tercapai/);
  assert.equal(release.renderedCorrections.siteLimitInternal, 25);
  assert.equal(release.renderedCorrections.siteLimitNumberAdvertisedInNormalUi, false);
});

test("Domain small actions are horizontal full-width rows instead of vertical pills", () => {
  assert.match(runtime, /stacked-actions/);
  assert.match(ui, /v237DomainAction/);
  assert.match(css, /\.sv124-free-domain>aside[\s\S]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /\[data-v237-domain-action="true"\][\s\S]*width:100%!important/);
  assert.match(css, /white-space:nowrap!important/);
  assert.match(css, /writing-mode:horizontal-tb!important/);
});

test("BackupCenter, Settings and Widget Studio typography is bounded", () => {
  assert.match(css, /\.bc-center\[data-v237-backup\]/);
  assert.match(css, /\.bc-center\[data-v237-backup\]>header h2/);
  assert.match(css, /\.sn-settings-grid\[data-v237-settings\]/);
  assert.match(css, /\.tn-widget-summary[\s\S]*grid-template-columns:38px minmax\(0,1fr\) auto/);
  assert.match(css, /\.tn-widget-grid[\s\S]*repeat\(2,minmax\(0,1fr\)\)/);
});

test("Theme system keeps 100 distinct generated themes, 26 widgets and responsive code editor", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(WIDGET_COUNT, 26);
  assert.equal(BUILT_IN_WIDGETS.length, 26);
  assert.ok(BUILT_IN_WIDGETS.some((widget) => widget.id === "custom-html"));
  assert.match(css, /code-left-preview-right/);
  assert.match(css, /preview-top-code-bottom/);
});

test("production analytics enhancer is loaded and retains real RPC plus labeled simulation", () => {
  assert.match(runtime, /studio-operations-v41\.js/);
  assert.match(operations, /loadAnalytics/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(analytics, /op41-line-v213/);
  assert.match(analytics, /SIMULASI TAMPILAN — BUKAN DATA PRODUKSI/);
  assert.match(css, /op41-line-v213/);
  assert.equal(release.analytics.fakeProductionNumbers, false);
});

test("Nara attachment portal remains camera/photo/file and viewport-safe", () => {
  assert.match(runtime, /camera-photo-file/);
  assert.match(runtime, /v235-nara-attachment-portal/);
  assert.match(css, /v235-nara-attachment-portal\[data-v237-portal\]/);
  assert.equal(release.nara.camera, true);
  assert.equal(release.nara.photo, true);
  assert.equal(release.nara.file, true);
  assert.equal(release.nara.smallMediumNonmodal, true);
});

test("v237 verifies before historical tests but rotates the service worker only after Vite output exists", () => {
  assert.match(verifier, /Verified \$\{RELEASE\} without mutating historical React or service-worker sources before tests/);
  assert.match(vite, /closeBundle/);
  assert.match(vite, /finalizeServiceWorkerV237/);
  assert.match(swLib, /source-stability-cache-v237/);
  assert.match(swLib, /OLD_CACHE_CLEANUP_MISSING/);
  assert.match(swLib, /AUTH_SURFACE_GUARD_MISSING/);
  assert.equal(release.serviceWorker.finalizationStage, "vite-closeBundle-after-tests");
  assert.equal(release.serviceWorker.oldCachesDeletedOnActivate, true);
});

test("sidebar labels, persistent auth and non-destructive update behavior remain protected", () => {
  for (const label of menu) assert.ok(studio.includes(label), `missing ${label}`);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  for (const source of [runtime, ui, verifier, swLib]) assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("release refuses unproven provider and mass-capacity claims", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.auth.providerEndToEndClaim, false);
  assert.equal(release.capacity.extremeScale, "model-only");
  assert.equal(release.capacity.productionCredentialLoadTest, false);
  assert.equal(release.capacity.massAccountCreation, false);
  assert.equal(release.legacyFeaturesPreserved, true);
});
