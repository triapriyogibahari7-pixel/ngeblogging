import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const v224Patch = read("scripts/patch-data-reauth-v224.mjs");
const patch = read("scripts/patch-production-v225.mjs");
const studio = read("src/ThemeStudio.jsx");
const auth = read("src/lib/supabase.js");
const nara = read("src/NaraAssistant.jsx");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v225.json"));
const RELEASE = "studio-production-v225-green-layout-source-20260803";

const SIDE_AREAS = [
  "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
  "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4",
];

test("v225 executes after v224 and owns the final service-worker release", () => {
  assert.match(v224Patch, /patch-production-v225\.mjs/);
  assert.match(patch, new RegExp(RELEASE));
  assert.match(worker, /ngeblogging-app-v225-green-layout-source-20260803/);
  assert.match(worker, /green-layout-source-cache-v225/);
  assert.match(worker, /STUDIO_PRODUCTION_RELEASE_V225/);
  assert.match(worker, /ngeblogging-app-v224-data-reauth-20260803/);
});

test("green reference map is source-wired and retains the 22-area compatibility contract", () => {
  assert.match(studio, /data-v225-layout-source="green-reference"/);
  assert.match(studio, /data-v225-green-map="four-left-four-right"/);
  assert.match(studio, /data-v212-layout-areas="22"/);
  assert.match(studio, /data-layout-area=\{area\.id\}/);
  assert.match(studio, /preferredArea=\{widgetArea\}/);
  assert.match(studio, /data-v225-widget-studio="green-area-aware"/);
  assert.match(studio, /PETA TATA LETAK SITUS/);
  assert.match(studio, /Kotak postingan/);
  assert.equal(release.themeLayout.nativeReactMap, true);
  assert.equal(release.themeLayout.longDecorativeHeadingRemovedFromSource, true);
});

test("four left and four right widget destinations remain real and 26 widgets stay available", () => {
  for (const id of SIDE_AREAS) assert.ok(LAYOUT_AREAS.some((area) => area.id === id), `missing ${id}`);
  assert.equal(WIDGET_COUNT, 26);
  assert.equal(BUILT_IN_WIDGETS.length, 26);
  assert.equal(BUILT_IN_WIDGETS.at(-1)?.id, "custom-html");
  assert.match(studio, /tn-widget-custom-code-v209/);
  assert.match(studio, /orderedWidgets/);
  assert.equal(release.themeLayout.fourSidebarSlotsLeft, true);
  assert.equal(release.themeLayout.fourSidebarSlotsRight, true);
  assert.equal(release.themeLayout.customHtmlJavascriptLast, true);
});

test("100 themes and established Theme code behavior remain declared by the v225 contract", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  for (const marker of ["HTML", "CSS", "JavaScript", "PREVIEW LANGSUNG", "Tema Custom"]) assert.ok(studio.includes(marker), marker);
  assert.equal(release.themeEditor.maxCodeLines, 10000);
  assert.equal(release.themeEditor.actualLineNumberGutterPreserved, true);
  assert.equal(release.themeEditor.previewTargetIndependentFromPhysicalUi, true);
});

test("v224 persistent session recovery and Nara attachments are preserved", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /retryDataAfterReauthV224/);
  for (const marker of ["Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max"]) assert.ok(nara.includes(marker), marker);
  assert.equal(release.authentication.v224DataReauthPreserved, true);
  assert.equal(release.nara.cameraPhotoFilePreserved, true);
});

test("v225 remains factual about verification and scale", () => {
  assert.equal(release.claims.hundredPercentProductionClaimed, false);
  assert.equal(release.claims.massUserCapacityClaimed, false);
  assert.equal(release.claims.nineHundredMillionOrBillionLoginSimulationClaimed, false);
  assert.equal(release.claims.realDeviceAndLiveRouteVerificationStillRequired, true);
});
