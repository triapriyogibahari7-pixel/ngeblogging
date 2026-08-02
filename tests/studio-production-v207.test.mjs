import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v207.js");
const css = read("src/studio-production-v207.css");
const theme = read("src/ThemeStudio.jsx");
const nara = read("src/NaraAssistant.jsx");
const chain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-production-v207.mjs");
const supabase = read("src/lib/supabase.js");
const widgetSystem = read("src/widget-system.js");
const layoutRuntime = read("src/theme-layout-runtime-v170.js");
const layoutCss = read("src/theme-layout-v170.css");
const release = JSON.parse(read("public/release-v207.json"));
const RELEASE = "studio-production-v207-20260802";

test("v207 loads after v206 and is chained into every production patch run", () => {
  const v206 = entry.indexOf('import "./studio-production-v206.js";');
  const v207 = entry.indexOf('import "./studio-production-v207.js";');
  assert.ok(v206 >= 0);
  assert.ok(v207 > v206);
  assert.ok(chain.indexOf('patch-production-v207.mjs') > chain.indexOf('patch-production-v206.mjs'));
  assert.match(runtime, /studio-production-v207-20260802/);
});

test("physical-mobile Theme layout slots remain horizontal and readable", () => {
  assert.match(css, /\.tn-layout-canvas-v170[\s\S]*grid-template-columns: minmax\(0,1fr\) !important/);
  assert.match(css, /\.tn-layout-canvas-v170[\s\S]*grid-template-areas: none !important/);
  assert.match(css, /\.tn-layout-slot-v170[\s\S]*grid-template-columns: 32px minmax\(0,1fr\) !important/);
  assert.match(css, /\.tn-layout-slot-v170 > :is\(small,b\)[\s\S]*writing-mode: horizontal-tb !important/);
  assert.match(css, /\.tn-layout-slot-v170 > :is\(small,b\)[\s\S]*word-break: normal !important/);
  assert.match(runtime, /normalizeLayoutMap/);
  assert.match(runtime, /dataset\.v207Slot = "horizontal"/);
});

test("Theme has only one visible layout/code label and preserves real editors", () => {
  assert.match(css, /data-v206-theme-action="layout"[\s\S]*font-size: 0 !important/);
  assert.match(css, /content: "Edit Tata Letak" !important/);
  assert.match(css, /data-v206-theme-action="code"[\s\S]*font-size: 0 !important/);
  assert.match(css, /content: "Edit Kode" !important/);
  for (const marker of ['label:"HTML"', 'label:"CSS"', 'label:"JavaScript"', "saveThemeCode(themeState,codeDraft)"]) {
    assert.ok(theme.includes(marker), marker);
  }
});

test("Theme preview waits for synchronized state before mounting its iframe", () => {
  assert.match(theme, /syncStatus === "loading"/);
  assert.match(theme, /tn-preview-loading-v207/);
  assert.match(theme, /Menyiapkan pratinjau tema/);
  assert.match(patch, /V207_THEME_PREVIEW_ANCHOR_MISSING/);
});

test("Nara handheld composer uses two stable rows and attachments stay inside plus", () => {
  assert.ok(css.includes('grid-template-areas: "attach mic spacer send" "intel intel model model" !important'));
  assert.match(css, /\.nara-composer-tools > \.nara-select\.intelligence[\s\S]*grid-area: intel !important/);
  assert.match(css, /\.nara-composer-tools > \.nara-select\.model[\s\S]*grid-area: model !important/);
  assert.match(css, /nara-direct-attachments-v202,.nara-mobile-direct-tools-v199[\s\S]*display: none !important/);
  for (const marker of ["nara-attachment-menu-wrap", "Kamera", "Foto", "File teks", "Tingkat kecerdasan", "Model Nara"]) {
    assert.ok(nara.includes(marker), marker);
  }
  assert.match(css, /animation: none !important/);
});

test("Nara small and medium remain non-modal while full remains modal", () => {
  assert.match(runtime, /layer\.dataset\.v207Mode = full \? "modal" : "nonmodal"/);
  assert.match(runtime, /backdrop\.hidden = !full/);
  assert.match(css, /data-v207-mode="nonmodal"[\s\S]*pointer-events: none !important/);
  assert.match(css, /data-v207-mode="nonmodal"[\s\S]*nara-assistant-shell[\s\S]*pointer-events: auto !important/);
});

test("mobile n remains white on blue and drawer never uses blur", () => {
  assert.match(css, /:is\(\.sn-mobile-menu-mark,.sn-logo-mark\)[\s\S]*linear-gradient\(145deg,#2f75e8,#4f46e5\) !important/);
  assert.match(css, /:is\(\.sn-mobile-menu-mark,.sn-logo-mark\) > strong[\s\S]*-webkit-text-fill-color: #fff !important/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*backdrop-filter: none !important/);
  assert.match(runtime, /toggle\?\.setAttribute\("aria-expanded", String\(open\)\)/);
});

test("fourth left widget area is real in Studio, public runtime and responsive map", () => {
  assert.match(chain, /patch-sidebar-left4-v207\.mjs/);
  assert.match(widgetSystem, /id: "sidebar-left-4", label: "Sidebar kiri 4", group: "content"/);
  assert.match(widgetSystem, /sidebar-left-4-v207/);
  assert.match(layoutRuntime, /LEFT_AREAS = \["sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4"\]/);
  assert.match(layoutRuntime, /Empat area widget kiri postingan/);
  assert.match(layoutCss, /\.tn-layout-slot-v170\.sidebar-left-4\{grid-area:sidebar-left-4\}/);
  assert.match(layoutCss, /"sidebar-left-4 content-main content-main content-main content-main \.”/);
  assert.match(theme, /Peta tata letak 20 area widget \+ 1 area kiri tambahan, total 21 area/);
  assert.equal(release.repairs.layoutMapTwentyRealAreasPreserved, true);
  assert.equal(release.repairs.layoutMapTotalRealAreas, 21);
  assert.equal(release.repairs.sidebarLeftFourthAreaFunctional, true);
});

test("session persistence and v206 real-membership recovery are preserved", () => {
  assert.match(supabase, /persistSession: true/);
  assert.match(supabase, /autoRefreshToken: true/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|createUserSite|getOrCreatePrimarySite/);
  for (const marker of [
    "ngeblogging-app-v207-mobile-layout-nara-live-20260802",
    "mobile-layout-nara-live-cache-v207",
    "studio-production-v206-20260802",
    "native-theme-nara-session-cache-v206",
  ]) assert.ok(patch.includes(marker), marker);
});

test("v207 release is factual and rejects unsupported scale claims", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.repairs.physicalMobileLayoutMapReadableHorizontal, true);
  assert.equal(release.repairs.themePreviewSingleMountAfterCloudState, true);
  assert.equal(release.repairs.naraComposerTwoRowsOnHandheld, true);
  assert.equal(release.repairs.naraCameraPhotoFileOnlyInsidePlusMenu, true);
  assert.equal(release.repairs.legacyWhiteR4RejectedByDeployment, true);
  assert.equal(release.validation.googleLoginEndToEndClaimed, false);
  assert.equal(release.validation.linkedinLoginEndToEndClaimed, false);
  assert.equal(release.validation.emailPasswordEndToEndClaimed, false);
  assert.equal(release.validation.nineHundredMillionUserCapacityClaimed, false);
  assert.equal(release.validation.realDeviceRequiredBeforeHundredPercentClaim, true);
});
