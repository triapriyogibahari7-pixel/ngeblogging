import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const device = read("src/studio-device-mode-v140.js");
const historicalV237 = read("src/studio-source-stability-v237.js");
const runtime = read("src/studio-desktop-sidebar-v238.js");
const css = read("src/studio-desktop-sidebar-v238.css");
const studio = read("src/StudioNext.jsx");
const v235 = read("src/studio-production-v235.js");
const v236 = read("src/studio-real-device-v236.js");
const nara = read("src/NaraAssistant.jsx");
const auth = read("src/lib/supabase.js");
const vite = read("vite.config.js");
const sw = read("scripts/service-worker-v238-lib.mjs");
const release = JSON.parse(read("public/release-v238.json"));

const RELEASE = "studio-desktop-sidebar-v238-20260803";
const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v238 loads after the untouched v237 authorities", () => {
  const runtime237Index = entry.indexOf('import "./studio-source-stability-v237.js"');
  const uiIndex = entry.indexOf('import "./studio-source-stability-v237-ui.js"');
  const v238Index = entry.indexOf('import "./studio-desktop-sidebar-v238.js"');
  assert.ok(runtime237Index >= 0);
  assert.ok(uiIndex > runtime237Index);
  assert.ok(v238Index > uiIndex);
  assert.match(runtime, new RegExp(RELEASE));
  assert.match(device, /studio-device-mode-v188-20260801/);
  assert.match(historicalV237, /studio-source-stability-v237-20260803/);
});

test("browser Desktop site becomes a real large Studio family in additive v238 authority", () => {
  assert.match(runtime, /detectedDesktopSite/);
  assert.match(runtime, /layoutWidth > physicalViewportWidth \* 1\.35/);
  assert.match(runtime, /if \(desktopSitePhone\) \{/);
  assert.match(runtime, /responsiveMode = "desktop"/);
  assert.match(runtime, /variant = "desktop"/);
  assert.match(runtime, /family = "large"/);
  assert.match(runtime, /root\.dataset\.studioDeviceMode = family/);
  assert.match(runtime, /root\.dataset\.v237Family = family/);
  assert.equal(release.deviceRules.desktopSiteOnPhoneUsesLargeFamily, true);
  assert.equal(release.deviceRules.desktopAndComputerShareLargeGeometry, true);
});

test("large physical tablets use Tablet/large while true handheld sizes keep the drawer", () => {
  assert.match(runtime, /LARGE_TABLET_MIN = 700/);
  assert.match(runtime, /largeTablet = handheld && shortSide >= LARGE_TABLET_MIN/);
  assert.match(runtime, /responsiveMode = "tablet"/);
  assert.match(runtime, /SMALL_RESPONSIVE/);
  assert.equal(release.deviceRules.largePhysicalTabletUsesLargeFamily, true);
  assert.equal(release.deviceRules.phoneUsesSmallDrawer, true);
});

test("single n sidebar behavior is restored for large and small families", () => {
  assert.match(runtime, /single-internal-n-toggle/);
  assert.match(runtime, /v238InternalN = "visible-toggle"/);
  assert.match(v235, /internalN/);
  assert.match(v235, /document\.querySelector\("\.sn-sidebar-toggle"\)\?\.click\(\)/);
  assert.match(v236, /collapseLargeSidebarAfterNavigation/);
  assert.match(css, /data-v238-family="large"[\s\S]*#ngeblogging-studio-sidebar\.sn-side/);
  assert.match(css, /#ngeblogging-studio-sidebar\.sn-side\.collapsed/);
  assert.match(css, /data-v238-family="small"[\s\S]*\.sn-sidebar-toggle:not\(\[hidden\]\)/);
  assert.match(css, /\.sn-side-close[\s\S]*display:none!important/);
  assert.equal(release.sidebar.singleN, true);
  assert.equal(release.sidebar.largeInternalNIsToggle, true);
  assert.equal(release.sidebar.smallClosedShowsTopLeftNOnly, true);
});

test("all required sidebar labels remain in the React source", () => {
  for (const label of menu) assert.ok(studio.includes(label), `missing ${label}`);
  assert.equal(release.sidebar.settingsAndLogoutRemainAtBottom, true);
  assert.equal(release.sidebar.navigationTightBelowCreatePost, true);
});

test("Domain actions cannot collapse into the vertical pills shown in the screenshots", () => {
  assert.match(css, /\.sv124-free-domain>aside[\s\S]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /\[data-v237-domain-action="true"\][\s\S]*width:100%!important/);
  assert.match(css, /writing-mode:horizontal-tb!important/);
  assert.match(css, /white-space:nowrap!important/);
  assert.equal(release.domain.noVerticalPillButtons, true);
});

test("Settings BackupCenter and Widget Studio typography is bounded", () => {
  assert.match(css, /\.sn-settings-grid/);
  assert.match(css, /\.bc-center/);
  assert.match(css, /\.bc-center>header h2/);
  assert.match(css, /\.tn-widget-summary/);
  assert.match(css, /\.tn-widget-grid/);
  assert.match(css, /text-size-adjust:100%!important/);
  assert.equal(release.textGeometry.settingsBounded, true);
  assert.equal(release.textGeometry.backupCenterBounded, true);
  assert.equal(release.textGeometry.widgetStudioBounded, true);
});

test("Theme Studio keeps 100 themes 26 widgets the interactive map and responsive code editor", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(WIDGET_COUNT, 26);
  assert.equal(BUILT_IN_WIDGETS.length, 26);
  assert.ok(BUILT_IN_WIDGETS.some((widget) => widget.id === "custom-html"));
  assert.match(css, /#ngeblogging-layout-map/);
  assert.match(css, /width:620px!important/);
  assert.match(css, /grid-template-areas:"code preview"/);
  assert.match(css, /tn-code-preview-pane[\s\S]*order:1!important/);
  assert.match(css, /tn-code-pane[\s\S]*order:2!important/);
  assert.match(runtime, /code-left-preview-right/);
  assert.match(runtime, /preview-top-code-bottom/);
  assert.equal(release.themeStudio.fourLeftCenterFourRightPreserved, true);
});

test("Nara camera photo file model intelligence and non-modal behavior remain protected", () => {
  for (const marker of ["Kamera", "Foto", "File teks", "intelligenceOptions", "modelOptions"]) assert.match(nara, new RegExp(marker));
  assert.match(runtime, /camera-photo-file/);
  assert.match(css, /nara-assistant-layer:not\(\[aria-modal="true"\]\)/);
  assert.match(css, /v235-nara-attachment-portal/);
  assert.equal(release.nara.smallMediumNonmodal, true);
  assert.equal(release.nara.camera, true);
  assert.equal(release.nara.photo, true);
  assert.equal(release.nara.file, true);
});

test("profile remains separated and retains more than five useful menu actions", () => {
  for (const action of ["profile","avatar","sites","view-site","settings","logout"]) assert.ok(v235.includes(`data-action=\"${action}\"`) || v235.includes(`data-action="${action}"`) || v235.includes(`data-action=\\"${action}\\"`));
  assert.match(v236, /data-action="create-site"/);
  assert.equal(release.profile.separateFromSettings, true);
  assert.equal(release.profile.menuAtLeastFiveActions, true);
});

test("persistent auth and non-destructive update rules stay intact", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  for (const source of [device, historicalV237, runtime, css, sw]) assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.equal(release.auth.automaticLogoutAdded, false);
  assert.equal(release.auth.providerEndToEndClaim, false);
});

test("Vite finalizes v237 compatibility first and v238 cache last", () => {
  assert.match(vite, /finalizeServiceWorkerV237/);
  assert.match(vite, /finalizeServiceWorkerV238/);
  assert.ok(vite.indexOf("finalizeServiceWorkerV238()") > vite.indexOf("finalizeServiceWorkerV237()"));
  assert.match(sw, /desktop-sidebar-cache-v238/);
  assert.match(sw, /V238_FINALIZE_OLD_CACHE_CLEANUP_MISSING/);
  assert.match(sw, /V238_FINALIZE_AUTH_SURFACE_GUARD_MISSING/);
});

test("release refuses unsupported 100 percent provider and extreme-scale claims", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.capacity.extremeScale, "model-only");
  assert.equal(release.capacity.productionCredentialLoadTest, false);
  assert.equal(release.capacity.massAccountCreation, false);
  assert.equal(release.validation.realDeviceRequiredBefore100PercentClaim, true);
  assert.equal(release.legacyFeaturesPreserved, true);
});
