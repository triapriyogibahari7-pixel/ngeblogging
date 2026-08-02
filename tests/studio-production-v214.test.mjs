import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v214.js");
const css = read("src/studio-production-v214.css");
const profileCss = read("src/studio-production-v214-profile.css");
const studio = read("src/StudioNext.jsx");
const gate = read("src/StudioOnboardingGate.jsx");
const fastGate = read("src/StudioFastGate.jsx");
const nara = read("src/NaraAssistant.jsx");
const themeStudio = read("src/ThemeStudio.jsx");
const analytics = read("src/studio-analytics-v41.js");
const auth = read("src/lib/supabase.js");
const publicSite = read("src/PublicSiteNext.jsx");
const chain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-production-v214.mjs");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v214.json"));
const RELEASE = "studio-production-v214-20260802";

test("v214 runs after v213 and is part of the production patch chain", () => {
  assert.match(entry, /studio-production-v213\.js/);
  assert.match(entry, /studio-production-v214\.js/);
  assert.ok(entry.indexOf("studio-production-v213.js") < entry.indexOf("studio-production-v214.js"));
  assert.ok(chain.indexOf("patch-production-v214.mjs") > chain.indexOf("patch-production-v213.mjs"));
  assert.match(runtime, new RegExp(RELEASE));
});

test("six responsive engines keep small devices small while tablet and desktop variants stay large", () => {
  for (const mode of ["application", "phone", "mobile", "compact"]) assert.ok(runtime.includes(`\"${mode}\"`), mode);
  for (const mode of ["tablet", "laptop", "desktop", "computer"]) assert.ok(runtime.includes(`\"${mode}\"`), mode);
  assert.match(runtime, /TABLET_EDGE = 768/);
  assert.match(runtime, /studioDesktopSitePhone/);
  assert.match(css, /data-studio-v214-family="small"/);
  assert.match(css, /data-studio-v214-family="large"/);
});

test("small Theme layout resets stale desktop coordinates and preserves four left plus four right slots", () => {
  for (const id of [
    "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
    "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4",
  ]) assert.ok(LAYOUT_AREAS.some((area) => area.id === id), `missing ${id}`);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /"sidebar-left-4 sidebar-right-4"/);
  assert.match(css, /grid-column:auto !important/);
  assert.match(css, /grid-row:auto !important/);
  assert.match(css, /content-main content-main/);
  assert.match(runtime, /small-paired-four-plus-four/);
});

test("Theme code editor is true 50:50 on large surfaces and preview-above-code on small surfaces", () => {
  assert.match(css, /data-v214-workspace="split-50-50"/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /data-v214-workspace="preview-above-code"/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
  for (const label of ["HTML", "CSS", "JavaScript", "PREVIEW LANGSUNG"]) assert.ok(themeStudio.includes(label), label);
});

test("the complete sidebar remains present and profile is separate from settings", () => {
  for (const label of [
    "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
    "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
  ]) assert.ok(studio.includes(label), label);
  assert.match(studio, /sn-profile-menu-wrap/);
  assert.match(studio, /role="menu" aria-label="Menu profil"/);
  assert.match(studio, /chooseView\("profile"\)/);
  assert.match(studio, /PageTitle title="Profil"/);
  assert.match(studio, /PageTitle title="Pengaturan"/);
  assert.match(profileCss, /sn-profile-dropdown/);
});

test("100 real themes and widget system remain intact including custom HTML JavaScript", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(WIDGET_COUNT, 26);
  assert.ok(BUILT_IN_WIDGETS.some((widget) => widget.id === "custom-html"));
  assert.match(runtime, /html-javascript/);
});

test("Nara keeps three sizes, non-modal small medium, Camera Photo File, microphone, speaker, model and intelligence", () => {
  for (const size of ["small", "medium", "full"]) assert.ok(nara.includes(`\"${size}\"`), size);
  for (const label of ["Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) assert.ok(nara.includes(label), label);
  assert.match(nara, /aria-controls="nara-attachment-menu-v211"/);
  assert.match(nara, /Mulai mikrofon/);
  assert.match(nara, /Balasan suara otomatis/);
  assert.match(css, /data-v214-mode="nonmodal"/);
  assert.match(css, /data-v214-attachment-menu="camera-photo-file"/);
  assert.match(css, /data-v214-size="small"/);
  assert.match(css, /data-v214-size="medium"/);
});

test("Domain and factual analytics get readable mobile geometry without synthetic values", () => {
  assert.match(css, /data-v214-domain-action="horizontal"/);
  assert.match(css, /sv124-free-domain/);
  assert.match(css, /large-smooth-real-series/);
  assert.match(css, /readable-real-breakdown/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(analytics, /op41-line-v213/);
  assert.match(analytics, /Browser pengunjung/);
  assert.match(analytics, /Bot teridentifikasi/);
  assert.match(analytics, /Landing teratas/);
});

test("retained session recovery does not turn a temporary data timeout into logout", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(gate, /cachedActiveSiteV214/);
  assert.match(gate, /retained-session-scoped-cache/);
  assert.match(fastGate, /ngeblogging-active-site-snapshot-v214/);
  assert.match(publicSite, /PUBLIC_SITE_SINGLE_RENDER_V209/);
  for (const source of [runtime, gate, fastGate, patch]) {
    assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  }
});

test("service worker rotates to v214 without forced navigation", () => {
  assert.match(worker, /STUDIO_PRODUCTION_RELEASE_V214/);
  assert.match(worker, /ngeblogging-app-v214-screenshot-final-20260802/);
  assert.match(worker, /studio-screenshot-final-cache-v214/);
  assert.match(worker, /ngeblogging-app-v213-analytics-layout-20260802/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
});

test("release metadata refuses unsupported 100 percent or mass-login claims", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.preserved.themeCount, 100);
  assert.equal(release.preserved.widgetCount, 26);
  assert.equal(release.preserved.postPageWordLimit, 5000);
  assert.equal(release.repairs.smallDeviceLayoutUsesPairedFourLeftFourRight, true);
  assert.equal(release.repairs.naraCameraPhotoFileMenuVisibleWhenOpened, true);
  assert.equal(release.repairs.retainedSessionScopedSiteCacheFallback, true);
  assert.equal(release.validation.fakeAnalytics, false);
  assert.equal(release.validation.massCapacityClaimed, false);
  assert.equal(release.validation.nineHundredMillionOrBillionLoginSimulationClaimed, false);
  assert.equal(release.validation.allOAuthProvidersEndToEndProven, false);
  assert.equal(release.validation.physicalBrowserRetestRequired, true);
});
