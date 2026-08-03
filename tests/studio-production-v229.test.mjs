import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const chain = read("scripts/patch-service-worker-v179.mjs");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v229.js");
const css = read("src/studio-production-v229.css");
const theme = read("src/ThemeStudio.jsx");
const widgetSystem = read("src/widget-system.js");
const nara = read("src/NaraAssistant.jsx");
const auth = read("src/lib/supabase.js");
const analytics = read("src/studio-analytics-v41.js");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v229.json"));
const RELEASE = "studio-production-v229-layout-editor-sidebar-nara-20260803";

test("v229 runs after v228 and is the final screenshot-driven Studio authority", () => {
  assert.match(chain, /patch-production-v228\.mjs/);
  assert.match(chain, /patch-production-v229\.mjs/);
  assert.ok(chain.indexOf("patch-production-v228.mjs") < chain.indexOf("patch-production-v229.mjs"));
  assert.match(entry, /studio-production-v228\.js/);
  assert.match(entry, /studio-production-v229\.js/);
  assert.ok(entry.indexOf("studio-production-v228.js") < entry.indexOf("studio-production-v229.js"));
  assert.match(runtime, new RegExp(RELEASE));
});

test("layout map keeps the checked reference geometry on both small and large surfaces", () => {
  for (const marker of [
    'data-v226-layout-source="native-green-reference"',
    'data-v226-green-map="four-left-post-four-right"',
    'data-layout-area={area.id}',
    'preferredArea={widgetArea}',
  ]) assert.ok(theme.includes(marker), `Theme map missing ${marker}`);

  for (const marker of [
    'data-v229-layout-canvas="scaled-reference-small"',
    'data-v229-layout-canvas="reference-large"',
    ".sidebar-left-1", ".sidebar-left-2", ".sidebar-left-3", ".sidebar-left-4",
    ".sidebar-right-1", ".sidebar-right-2", ".sidebar-right-3", ".sidebar-right-4",
    ".content-main", ".before-content", ".after-content",
    "grid-template-columns:repeat(12,minmax(0,1fr))",
  ]) assert.ok(css.includes(marker), `v229 layout CSS missing ${marker}`);

  assert.match(runtime, /reference-blueprint-interactive/);
  assert.match(runtime, /below-map-full-width/);
  assert.match(css, /#ngeblogging-layout-map>\.tn-layout-side/);
});

test("all layout slots remain actionable and twenty-six real widgets including custom HTML JavaScript are preserved", () => {
  assert.match(theme, /onOpenWidgets\(area\.id\)/);
  assert.match(theme, /tn-widget-custom-code-v209/);
  assert.match(theme, /LAYOUT_AREAS\.map/);
  assert.match(widgetSystem, /id: "custom-html"/);
  assert.equal(release.theme.builtInThemesRequired, 100);
  assert.equal(release.theme.widgetCountRequired, 26);
  assert.equal(release.theme.fourLeftAndFourRightSlots, true);
  assert.equal(release.theme.clickedAreaOpensWidgetStudio, true);
});

test("theme editor uses actual numbered lines and device-correct preview geometry", () => {
  assert.match(runtime, /MAX_CODE_LINES = 10000/);
  assert.match(runtime, /actual-1-to-10000/);
  assert.match(runtime, /preview-top-code-bottom/);
  assert.match(runtime, /code-left-preview-right/);
  assert.match(css, /v222-code-line-gutter\[data-v229-gutter\]/);
  assert.match(css, /data-v229-workspace="preview-top-code-bottom"/);
  assert.match(css, /data-v229-workspace="code-left-preview-right"/);
  assert.match(css, /grid-template-columns:56px minmax\(0,1fr\)/);
  assert.equal(release.codeEditor.maxSupportedLines, 10000);
  assert.equal(release.codeEditor.actualLineNumberGutter, true);
});

test("desktop sidebar remains visible and collapsed mode keeps icons while mobile remains an n-controlled drawer", () => {
  assert.match(runtime, /desktop-icons/);
  assert.match(runtime, /mobile-drawer/);
  assert.match(runtime, /Buka atau tutup menu Studio/);
  assert.match(css, /sn-side\.collapsed\{width:72px!important\}/);
  assert.match(css, /data-v229-family="small"[^\n]*#ngeblogging-studio-sidebar\.sn-side/);
  assert.match(css, /sn-desktop-sidebar-icon\{display:none!important\}/);
  assert.match(css, /sn-sidebar-toggle \.sn-mobile-menu-mark>strong/);
});

test("top-right profile provides five functional actions and profile/settings surfaces are separated", () => {
  for (const label of ["Profil & avatar", "Situs saya", "Lihat situs", "Pengaturan", "Keluar"]) {
    assert.ok(runtime.includes(label), `profile menu missing ${label}`);
  }
  assert.match(runtime, /five-action-dropdown/);
  assert.match(runtime, /sn-workspace/);
  assert.match(runtime, /sn-view-site/);
  assert.match(css, /data-v229-account-view="profile"/);
  assert.match(css, /data-v229-account-view="settings"/);
  assert.equal(release.profile.dropdownActions, 5);
});

test("Nara attachment plus exposes Camera Photo File and keeps size model intelligence microphone and speaker contracts", () => {
  for (const marker of [
    "Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max",
    "Instan", "Sedang", "Tinggi", "Maksimal", "Mic", "SpeakerIcon",
  ]) assert.ok(nara.includes(marker), `Nara source missing ${marker}`);
  assert.match(runtime, /camera-photo-file/);
  assert.match(runtime, /fixed-visible/);
  assert.match(css, /data-v229-nara-size="small"/);
  assert.match(css, /data-v229-nara-size="medium"/);
  assert.match(css, /data-v229-nara-size="full"/);
  assert.match(css, /grid-template-columns:40px 40px minmax\(82px,1fr\) minmax\(92px,1\.05fr\) 40px/);
  assert.equal(release.nara.cameraPhotoFile, true);
  assert.equal(release.nara.smallMediumNonModal, true);
});

test("Domain stays horizontal on small devices and Analytics keeps real production data with larger chart surfaces", () => {
  assert.match(runtime, /full-horizontal/);
  assert.match(css, /data-v229-domain-action="full-horizontal"/);
  assert.match(css, /op41-line\[data-v229-analytics="large-readable"\]/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.equal(release.analytics.fakeStatisticsAdded, false);
  assert.equal(release.analytics.realProductionRpcPreserved, true);
});

test("persistent auth, rotated v229 cache and no destructive session action remain mandatory", () => {
  assert.match(auth, /persistSession: true/);
  assert.match(auth, /autoRefreshToken: true/);
  assert.match(worker, /ngeblogging-app-v229-layout-editor-sidebar-nara-20260803/);
  assert.match(worker, /layout-editor-sidebar-nara-cache-v229/);
  assert.match(worker, /ACTIVE_VERSION_V229/);
  assert.match(worker, /ACTIVE_CACHE_RELEASE_V229/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
  assert.equal(release.authentication.forcedLogoutAdded, false);
});

test("release makes no unsupported OAuth or mass-user claim", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.claims.massCapacityClaimed, false);
  assert.equal(release.claims.providerOAuthEndToEndClaimed, false);
  assert.equal(release.claims.realDeviceVerificationRequired, true);
});
