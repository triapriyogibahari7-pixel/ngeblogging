import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v216.js");
const css = read("src/studio-production-v216.css");
const nara = read("src/NaraAssistant.jsx");
const themeStudio = read("src/ThemeStudio.jsx");
const analytics = read("src/studio-analytics-v41.js");
const auth = read("src/lib/supabase.js");
const publicSite = read("src/PublicSiteNext.jsx");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v216.json"));
const RELEASE = "studio-production-v216-20260802";

test("v216 is the final UI authority after v214 while v215 auth remains preserved", () => {
  assert.match(entry, /studio-production-v214\.js/);
  assert.match(entry, /studio-production-v216\.js/);
  assert.ok(entry.indexOf("studio-production-v216.js") > entry.indexOf("studio-production-v214.js"));
  assert.match(runtime, new RegExp(RELEASE));
  assert.match(nara, /NARA_CLOSE_CLEANUP_V216/);
});

test("Theme code editor follows physical device geometry and has line numbers through 10000", () => {
  assert.match(runtime, /MAX_CODE_LINES = 10000/);
  assert.match(runtime, /preview-above-code/);
  assert.match(runtime, /split-50-50/);
  assert.match(runtime, /v216-code-line-gutter/);
  assert.match(runtime, /v216LineNumbers = `1-\$\{MAX_CODE_LINES\}`/);
  assert.match(css, /data-v216-workspace="preview-above-code"/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
  assert.match(css, /data-v216-workspace="split-50-50"/);
  assert.match(css, /grid-template-areas:"code preview"/);
  assert.match(css, /\.v216-code-line-gutter/);
  assert.match(css, /background:#f8fafc/);
  for (const label of ["HTML", "CSS", "JavaScript", "PREVIEW LANGSUNG"]) assert.ok(themeStudio.includes(label), label);
});

test("Theme map preserves four left and four right slots while small geometry is normal flow", () => {
  for (const id of [
    "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
    "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4",
  ]) assert.ok(LAYOUT_AREAS.some((area) => area.id === id), `missing ${id}`);
  assert.match(css, /small-compact-four-plus-four/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.sidebar-left-4/);
  assert.match(css, /\.sidebar-right-4/);
  assert.match(css, /\.content-main/);
  assert.match(themeStudio, /preferredArea=\{widgetArea\}/);
  assert.match(themeStudio, /tn-widget-custom-code-v209/);
});

test("exactly 100 real themes and 26 widgets including Custom HTML JavaScript remain synchronized", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(WIDGET_COUNT, 26);
  assert.ok(BUILT_IN_WIDGETS.some((widget) => widget.id === "custom-html"));
  assert.match(themeStudio, /Tema Custom/);
});

test("Nara keeps Camera Photo File model and intelligence features", () => {
  for (const label of ["Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) {
    assert.ok(nara.includes(label), label);
  }
});

test("Nara attachment menu escapes shell clipping", () => {
  assert.match(runtime, /v216AttachmentMenu = "camera-photo-file"/);
  assert.match(runtime, /position", "fixed"/);
  assert.match(css, /data-v216-attachment-menu="camera-photo-file"/);
  assert.match(css, /z-index:2147483646/);
});

test("Nara close cleanup stops listening and clears attachment state", () => {
  assert.match(nara, /NARA_CLOSE_CLEANUP_V216/);
  assert.match(nara, /setAttachmentMenu\(false\)/);
  assert.match(nara, /recognition\.current\?\.stop/);
  assert.match(nara, /setListening\(false\)/);
});

test("Nara small and medium are nonmodal while full remains modal", () => {
  assert.match(runtime, /full \? "modal" : "nonmodal"/);
  assert.match(css, /data-v216-nara-mode="nonmodal"/);
  assert.match(css, /pointer-events:none/);
});

test("Domain stays horizontal and analytics uses only the existing real RPC with larger presentation", () => {
  assert.match(runtime, /v216DomainAction = "horizontal-full"/);
  assert.match(css, /data-v216-domain-action="horizontal-full"/);
  assert.match(css, /white-space:nowrap/);
  assert.match(runtime, /stock-style-real-series/);
  assert.match(css, /stock-style-real-series/);
  assert.match(css, /large-real-breakdown/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(analytics, /SIMULASI TAMPILAN — BUKAN DATA PRODUKSI/);
  assert.equal(release.validation.fakeProductionAnalyticsAdded, false);
});

test("login persistence and public single-render protections remain unchanged", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /flowType:\s*"pkce"/);
  assert.match(publicSite, /PUBLIC_SITE_SINGLE_RENDER_V209/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("v216 rotates cache and release contract refuses unsupported scale claims", () => {
  assert.match(worker, /STUDIO_PRODUCTION_RELEASE_V216/);
  assert.match(worker, /ngeblogging-app-v216-theme-nara-layout-route-20260802/);
  assert.match(worker, /theme-nara-layout-route-cache-v216/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
  assert.equal(release.release, RELEASE);
  assert.equal(release.preserved.themeCount, 100);
  assert.equal(release.preserved.widgetCount, 26);
  assert.equal(release.preserved.fourLeftAndFourRightWidgetAreas, true);
  assert.equal(release.preserved.postPageWordLimit, 5000);
  assert.equal(release.validation.massCapacityClaimed, false);
  assert.equal(release.validation.nineHundredMillionOrBillionLoginSimulationClaimed, false);
  assert.equal(release.validation.allOAuthProvidersEndToEndProven, false);
});
