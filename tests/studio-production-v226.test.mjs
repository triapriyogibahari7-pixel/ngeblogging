import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const patch = read("scripts/patch-production-v226.mjs");
const studio = read("src/ThemeStudio.jsx");
const worker = read("public/sw.js");
const auth = read("src/lib/supabase.js");
const v225Runtime = read("src/studio-production-v225.js");
const v225Css = read("src/studio-production-v225.css");
const nara = read("src/NaraAssistant.jsx");
const analytics = read("src/studio-analytics-v41.js");
const release = JSON.parse(read("public/release-v226.json"));

const SIDE_AREAS = [
  "sidebar-left-1","sidebar-left-2","sidebar-left-3","sidebar-left-4",
  "sidebar-right-1","sidebar-right-2","sidebar-right-3","sidebar-right-4",
];

test("v226 native green layout release is the final PWA authority with v225 compatibility", () => {
  assert.match(patch,/studio-production-v226-native-green-layout-20260803/);
  assert.match(worker,/ngeblogging-app-v226-native-green-layout-20260803/);
  assert.match(worker,/native-green-layout-cache-v226/);
  assert.match(worker,/STUDIO_PRODUCTION_RELEASE_V226/);
  assert.match(worker,/STUDIO_PRODUCTION_COMPAT_VERSION_V225/);
  assert.match(worker,/DATA_REAUTH_COMPAT_VERSION_V224/);
  assert.equal(release.release,"studio-production-v226-native-green-layout-20260803");
});

test("green reference map is native React source and every widget slot opens its own area", () => {
  assert.match(studio,/data-v226-layout-source="native-green-reference"/);
  assert.match(studio,/data-v226-green-map="four-left-post-four-right"/);
  assert.match(studio,/data-layout-area=\{area\.id\}/);
  assert.match(studio,/onClick=\{\(\) => onOpenWidgets\(area\.id\)\}/);
  assert.match(studio,/data-v226-widget-list="below-map"/);
  assert.match(studio,/PETA TATA LETAK SITUS/);
  assert.match(studio,/Kotak postingan/);
  assert.doesNotMatch(studio,/<h2>Header, area atas, empat widget kiri/);
  assert.equal(release.themeLayout.nativeReactMap,true);
  assert.equal(release.themeLayout.longLayoutHeadingRendered,false);
});

test("four real widget slots remain on each side of Post Page", () => {
  for (const id of SIDE_AREAS) assert.ok(LAYOUT_AREAS.some((area) => area.id === id),`missing ${id}`);
  assert.equal(release.themeLayout.realAreaCount,22);
  assert.equal(release.themeLayout.fourLeftSlots,true);
  assert.equal(release.themeLayout.fourRightSlots,true);
  assert.equal(release.themeLayout.postPageCenter,true);
});

test("26-widget studio stays area-aware and keeps custom HTML JavaScript last", () => {
  assert.equal(WIDGET_COUNT,26);
  assert.equal(BUILT_IN_WIDGETS.length,26);
  assert.equal(BUILT_IN_WIDGETS.at(-1)?.id,"custom-html");
  assert.match(studio,/data-v226-widget-studio="area-aware-26"/);
  assert.match(studio,/preferredArea=\{widgetArea\}/);
  assert.match(studio,/LAYOUT_AREAS\.map/);
  assert.match(studio,/tn-widget-custom-code-v209/);
  assert.match(studio,/>HTML<textarea/);
  assert.match(studio,/>JavaScript<textarea/);
  assert.equal(release.widgets.customHtmlJavascriptLast,true);
});

test("100 themes remain while v225 editor responsive and numbered-line authorities stay intact", () => {
  assert.equal(THEME_COUNT,100);
  assert.equal(BUILT_IN_THEMES.length,100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size,100);
  for (const marker of ["compact-green-map","preview-above-code","code-left-preview-right","1-to-10000-actual"]) assert.ok(v225Runtime.includes(marker) || v225Css.includes(marker),marker);
  assert.equal(release.themeCatalog.builtInThemes,100);
  assert.equal(release.preservedV225.actualLineNumbersUpTo10000,true);
});

test("Nara sidebar Domain analytics and v224 persistent-session protections are preserved", () => {
  for (const marker of ["camera-photo-file","transparent-click-close","large-detail"]) assert.ok(v225Runtime.includes(marker) || v225Css.includes(marker),marker);
  for (const marker of ["Kamera","Foto","File teks","Nara Mini","Nara Writer","Nara Vision","Nara Max","Instan","Sedang","Tinggi","Maksimal"]) assert.ok(nara.includes(marker),marker);
  assert.match(analytics,/get_site_analytics_dashboard/);
  assert.match(auth,/DATA_REAUTH_RELEASE_V224/);
  assert.match(auth,/retryDataAfterReauthV224/);
  assert.match(auth,/persistSession:\s*true/);
  assert.match(auth,/autoRefreshToken:\s*true/);
  assert.doesNotMatch(patch,/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.equal(release.authentication.forcedLogoutAdded,false);
});

test("v226 refuses unsupported production and mass-capacity claims", () => {
  assert.equal(release.claims.hundredPercentProductionClaimed,false);
  assert.equal(release.claims.massUserCapacityClaimed,false);
  assert.equal(release.claims.nineHundredMillionOrBillionLoginSimulationClaimed,false);
  assert.equal(release.claims.allOAuthProvidersEndToEndProven,false);
  assert.equal(release.claims.realDeviceVerificationRequiredBeforeHundredPercentClaim,true);
});
