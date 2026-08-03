import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-source-stability-v237.js");
const css = read("src/studio-source-stability-v237.css");
const studio = read("src/StudioNext.jsx");
const domain = read("src/DomainPanelV124.jsx");
const analytics = read("src/studio-analytics-v41.js");
const operations = read("src/studio-operations-v41.js");
const auth = read("src/lib/supabase.js");
const patch = read("scripts/patch-production-v237.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");
const release = JSON.parse(read("public/release-v237.json"));

const RELEASE = "studio-source-stability-v237-20260803";
const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v237 is loaded after the v236 real-device authority", () => {
  const previous = entry.indexOf('import "./studio-real-device-v236.js"');
  const current = entry.indexOf('import "./studio-source-stability-v237.js"');
  assert.ok(previous >= 0);
  assert.ok(current > previous);
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

test("Profile and Settings are source-separated while add-site remains in Ringkasan", () => {
  assert.match(patch, /data-source-settings-v237=\\"site-only\\"/);
  assert.match(patch, /title=\\"Pengaturan\\"/);
  assert.match(patch, /sn-add-site-summary/);
  assert.match(patch, /Profil akun dan avatar tetap terpisah/);
  assert.equal(release.sourceCorrections.profileSeparatedFromSettings, true);
  assert.equal(release.sourceCorrections.summaryAddSiteAction, true);
});

test("25-site guard remains internal and normal UI does not advertise the maximum", () => {
  assert.match(patch, /MAX_SITES_PER_ACCOUNT = 25/);
  assert.match(patch, /Batas jumlah situs dalam akun sudah tercapai/);
  assert.match(patch, /V237_VISIBLE_SITE_CAP_REMAINS/);
  assert.match(patch, /V237_DOMAIN_VISIBLE_CAP_REMAINS/);
  assert.equal(release.sourceCorrections.siteLimitInternal, 25);
  assert.equal(release.sourceCorrections.siteLimitNumberAdvertisedInNormalUi, false);
});

test("Domain small actions are horizontal full-width rows instead of vertical pills", () => {
  assert.match(runtime, /stacked-actions/);
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

test("sidebar labels, persistent auth and non-destructive update behavior remain protected", () => {
  for (const label of menu) assert.ok(studio.includes(label), `missing ${label}`);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  for (const source of [runtime, patch]) assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("release refuses unproven provider and mass-capacity claims", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.auth.providerEndToEndClaim, false);
  assert.equal(release.capacity.extremeScale, "model-only");
  assert.equal(release.capacity.productionCredentialLoadTest, false);
  assert.equal(release.capacity.massAccountCreation, false);
  assert.equal(release.legacyFeaturesPreserved, true);
});
