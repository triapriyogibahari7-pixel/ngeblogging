import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const v224Patch = read("scripts/patch-data-reauth-v224.mjs");
const patch = read("scripts/patch-production-v225.mjs");
const studio = read("src/ThemeStudio.jsx");
const widgets = read("src/widget-system.js");
const runtime = read("src/studio-production-v221.js");
const v223Runtime = read("src/studio-production-v223.js");
const v222Css = read("src/studio-production-v222.css");
const auth = read("src/lib/supabase.js");
const nara = read("src/NaraAssistant.jsx");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v225.json"));
const RELEASE = "studio-production-v225-green-layout-source-20260803";

const GREEN_AREAS = [
  "top-left-1", "top-right-1", "top-left-2", "top-right-2", "top-left-3", "top-right-3",
  "before-content", "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
  "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4", "after-content",
  "bottom-left-1", "bottom-right-1", "bottom-left-2", "bottom-right-2", "bottom-left-3", "bottom-right-3",
];

test("v225 executes after v224 and becomes the final layout-source service worker authority", () => {
  assert.match(v224Patch, /patch-production-v225\.mjs/);
  assert.match(patch, new RegExp(RELEASE));
  assert.match(worker, /const VERSION = "ngeblogging-app-v225-green-layout-source-20260803";/);
  assert.match(worker, /const CACHE_RELEASE = "green-layout-source-cache-v225";/);
  assert.match(worker, /STUDIO_PRODUCTION_RELEASE_V225/);
  assert.match(worker, /ngeblogging-app-v224-data-reauth-20260803/);
});

test("green reference is source-level React, not only a post-render DOM reconstruction", () => {
  assert.match(studio, /data-v225-layout-source="green-reference"/);
  assert.match(studio, /data-v225-green-map="four-left-four-right"/);
  assert.match(studio, /data-layout-area=\{area\.id\}/);
  assert.match(studio, /onClick=\{\(\) => openArea\(area\.id\)\}/);
  assert.match(studio, /preferredArea=\{widgetArea\}/);
  assert.match(studio, /setWidgetArea\(areaId\)/);
  assert.match(studio, /PETA TATA LETAK SITUS/);
  assert.doesNotMatch(studio, /Header, area atas, empat widget kiri, konten utama, empat widget kanan/);
  assert.doesNotMatch(studio, /Setiap kotak membuka pilihan widget untuk area tersebut/);
  assert.equal(release.themeLayout.nativeReactMap, true);
  assert.equal(release.themeLayout.longDecorativeHeadingRemovedFromSource, true);
});

test("all green layout slots are real widget destinations including 4 left and 4 right", () => {
  for (const area of GREEN_AREAS) {
    assert.ok(LAYOUT_AREAS.some((entry) => entry.id === area), `missing layout area ${area}`);
    assert.ok(widgets.includes(`id: "${area}"`), `widget-system source missing ${area}`);
    assert.ok(runtime.includes(`"${area}":`), `runtime semantic label missing ${area}`);
  }
  for (const area of ["sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4"]) {
    assert.match(v222Css, new RegExp(`\\.${area.replaceAll("-", "\\-")}\\{grid-column:1/2`));
  }
  for (const area of ["sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"]) {
    assert.match(v222Css, new RegExp(`\\.${area.replaceAll("-", "\\-")}\\{grid-column:6/7`));
  }
  assert.match(v222Css, /\.content-main\{grid-column:2\/6/);
  assert.equal(release.themeLayout.fourSidebarSlotsLeft, true);
  assert.equal(release.themeLayout.fourSidebarSlotsRight, true);
});

test("26-widget selector stays area-aware and custom HTML JavaScript remains last", () => {
  assert.equal(WIDGET_COUNT, 26);
  assert.equal(BUILT_IN_WIDGETS.length, 26);
  assert.equal(BUILT_IN_WIDGETS.at(-1)?.id, "custom-html");
  assert.match(studio, /data-v225-widget-studio="green-area-aware"/);
  assert.match(studio, /orderedWidgets/);
  assert.match(studio, /tn-widget-custom-code-v209/);
  assert.match(studio, /HTML dan JavaScript berjalan di iframe sandbox terisolasi/);
  assert.match(studio, /LAYOUT_AREAS\.map/);
  assert.equal(release.themeLayout.customHtmlJavascriptLast, true);
});

test("100 themes and responsive Theme code editor behavior stay preserved", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.match(v223Runtime, /preview-above-code/);
  assert.match(v223Runtime, /code-left-preview-right/);
  assert.match(v223Runtime, /v223PreviewModeLock/);
  assert.match(v222Css, /v222-code-line-gutter/);
  assert.equal(release.themeEditor.maxCodeLines, 10000);
  assert.equal(release.themeEditor.previewTargetIndependentFromPhysicalUi, true);
});

test("v224 persistent login recovery and Nara camera photo file are not removed by layout work", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /retryDataAfterReauthV224/);
  assert.match(nara, /Kamera/);
  assert.match(nara, /Foto/);
  assert.match(nara, /File teks/);
  assert.match(nara, /Nara Mini/);
  assert.match(nara, /Nara Writer/);
  assert.match(nara, /Nara Vision/);
  assert.match(nara, /Nara Max/);
  assert.equal(release.authentication.v224DataReauthPreserved, true);
  assert.equal(release.nara.cameraPhotoFilePreserved, true);
});

test("v225 refuses unproven hundred-percent and mass-capacity claims", () => {
  assert.equal(release.claims.hundredPercentProductionClaimed, false);
  assert.equal(release.claims.massUserCapacityClaimed, false);
  assert.equal(release.claims.nineHundredMillionOrBillionLoginSimulationClaimed, false);
  assert.equal(release.claims.realDeviceAndLiveRouteVerificationStillRequired, true);
});
