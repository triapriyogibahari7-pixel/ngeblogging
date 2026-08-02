import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const runtime = read("src/studio-production-v214.js");
const rootCss = read("src/studio-production-v214.css");
const shellCss = read("src/studio-production-v214-shell.css");
const themeEditorCss = read("src/studio-production-v214-theme-editor.css");
const themeLayoutCss = read("src/studio-production-v214-theme-layout.css");
const naraCss = read("src/studio-production-v214-nara.css");
const operationsCss = read("src/studio-production-v214-operations.css");
const profile = read("src/studio-production-v214-profile.js");
const profileCss = read("src/studio-production-v214-profile.css");
const studio = read("src/StudioNext.jsx");
const nara = read("src/NaraAssistant.jsx");
const analytics = read("src/studio-analytics-v41.js");
const auth = read("src/lib/supabase.js");
const publicSite = read("src/PublicSiteNext.jsx");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v214.json"));

test("v214 keeps six real responsive modes and large tablet/desktop family", () => {
  for (const mode of ["application", "phone", "mobile", "compact"]) assert.ok(runtime.includes(`\"${mode}\"`), mode);
  for (const mode of ["tablet", "laptop", "desktop", "computer"]) assert.ok(runtime.includes(`\"${mode}\"`), mode);
  assert.match(runtime, /TABLET_EDGE = 768/);
  assert.match(runtime, /studioDesktopSitePhone/);
  assert.match(runtime, /studioV214Mode/);
  assert.match(runtime, /studioV214Family/);
});

test("sidebar and mobile drawer stay complete, centered, non-blurred and non-shifting", () => {
  for (const label of [
    "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
    "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
  ]) assert.ok(studio.includes(label), label);
  assert.match(runtime, /v214Sidebar/);
  assert.match(runtime, /v214Toggle = "centered"/);
  assert.match(runtime, /v214Backdrop = "outside-only"/);
  assert.match(shellCss, /sn-mobile-menu-mark/);
  assert.match(shellCss, /place-items:center/);
  assert.match(shellCss, /backdrop-filter:none/);
  assert.match(shellCss, /margin-left:0/);
});

test("Theme editor keeps visible HTML CSS JavaScript with 50:50 large and preview-first small layout", () => {
  assert.match(rootCss, /studio-production-v214-theme\.css/);
  assert.match(themeEditorCss, /data-v214-workspace="split-50-50"/);
  assert.match(themeEditorCss, /grid-template-areas:"code preview"/);
  assert.match(themeEditorCss, /data-v214-workspace="preview-above-code"/);
  assert.match(themeEditorCss, /grid-template-areas:"preview" "code"/);
  assert.match(themeEditorCss, /background:#f8fafc/);
  assert.match(themeEditorCss, /font-family:ui-monospace/);
});

test("Theme layout resets desktop coordinates on small screens and preserves four left plus four right widget areas", () => {
  for (const id of [
    "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
    "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4",
  ]) assert.ok(LAYOUT_AREAS.some((area) => area.id === id), `missing ${id}`);
  assert.match(themeLayoutCss, /grid-column:auto !important/);
  assert.match(themeLayoutCss, /grid-row:auto !important/);
  assert.match(themeLayoutCss, /sidebar-left-4/);
  assert.match(themeLayoutCss, /sidebar-right-4/);
  assert.match(runtime, /small-paired-four-left-four-right/);
  assert.match(runtime, /large-four-left-four-right/);
});

test("100 themes and 26 widgets remain real and custom HTML JavaScript is retained", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(WIDGET_COUNT, 26);
  assert.ok(BUILT_IN_WIDGETS.some((widget) => widget.id === "custom-html"));
  assert.match(runtime, /html-javascript/);
});

test("Nara keeps three sizes, non-modal small medium, close, Camera Photo File, microphone speaker models and intelligence", () => {
  for (const label of ["Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) assert.ok(nara.includes(label), label);
  assert.match(runtime, /v214NaraMode = full \? "modal" : "nonmodal"/);
  assert.match(runtime, /camera-photo-file/);
  assert.match(runtime, /v214Close = "visible"/);
  assert.match(naraCss, /data-v214-nara-mode="nonmodal"/);
  assert.match(naraCss, /data-v214-size="small"/);
  assert.match(naraCss, /data-v214-size="medium"/);
  assert.match(naraCss, /camera-photo-file/);
  assert.match(nara, /Mulai mikrofon/);
  assert.match(nara, /Balasan suara otomatis/);
});

test("Domain actions and factual analytics are readable without synthetic data", () => {
  assert.match(runtime, /v214DomainAction = "horizontal"/);
  assert.match(operationsCss, /data-v214-domain-action/);
  assert.match(operationsCss, /large-real-timeseries/);
  assert.match(operationsCss, /large-real-breakdown/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(analytics, /Browser pengunjung/);
  assert.match(analytics, /Bot teridentifikasi/);
  assert.match(analytics, /Landing teratas/);
  assert.equal(release.validation.fakeAnalytics, false);
  assert.equal(release.validation.syntheticProductionStatisticsAdded, false);
});

test("Profile Settings and Logout are distinct and Settings no longer shows the Profile section", () => {
  assert.match(profile, /\["profile", "Profil", "Identitas akun"\]/);
  assert.match(profile, /\["settings", "Pengaturan", "Konfigurasi situs"\]/);
  assert.match(profile, /\["logout", "Keluar", "Akhiri sesi akun"\]/);
  assert.match(profile, /studio-production-v214-profile-settings-separated-20260802/);
  assert.match(profile, /dataset\.studioAccountViewV189 = "settings"/);
  assert.match(profile, /setText\(title, "Profil"\)/);
  assert.match(profile, /setText\(title, "Pengaturan"\)/);
  assert.match(profile, /Simpan profil/);
  assert.match(profile, /Simpan pengaturan/);
  assert.match(profileCss, /data-studio-account-view-v189="profile"/);
  assert.match(profileCss, /data-studio-account-view-v189="settings"/);
  assert.match(profileCss, /settings"\] \.sn-settings-grid > section:first-child/);
});

test("persistent session and explicit logout protections stay intact", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /flowType:\s*"pkce"/);
  assert.match(publicSite, /PUBLIC_SITE_SINGLE_RENDER_V209/);
  for (const source of [runtime, profile]) {
    assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  }
});

test("v214 release remains factual and does not claim unsupported mass login or all-provider proof", () => {
  assert.equal(release.release, "studio-production-v214-20260802");
  assert.equal(release.preserved.themeCount, 100);
  assert.equal(release.preserved.widgetCount, 26);
  assert.equal(release.preserved.postPageWordLimit, 5000);
  assert.equal(release.validation.massCapacityClaimed, false);
  assert.equal(release.validation.nineHundredMillionOrBillionLoginSimulationClaimed, false);
  assert.equal(release.validation.allOAuthProvidersEndToEndProven, false);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
});
