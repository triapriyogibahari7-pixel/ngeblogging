import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, WIDGET_COUNT } from "../src/widget-system.js";
import "./studio-production-v214-clean.test.mjs";
import "./studio-production-v216.test.mjs";
import "./studio-production-v219.test.mjs";
import "./studio-production-v220.test.mjs";
import "./studio-production-v221.test.mjs";
import "./studio-production-v222.test.mjs";
import "./studio-production-v223.test.mjs";
import "./data-reauth-v224.test.mjs";
import "./studio-production-v226.test.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const v212Runtime = read("src/studio-production-v212.js");
const runtime = read("src/studio-production-v213.js");
const css = read("src/studio-production-v213.css");
const analytics = read("src/studio-analytics-v41.js");
const handler = read("server/analytics-handler.mjs");
const migration = read("supabase/migrations/20260802104500_analytics_dashboard_v213_details.sql");
const nara = read("src/NaraAssistant.jsx");
const themeStudio = read("src/ThemeStudio.jsx");
const auth = read("src/lib/supabase.js");
const publicSite = read("src/PublicSiteNext.jsx");
const chain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-production-v213.mjs");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v213.json"));
const RELEASE = "studio-production-v213-20260802";

test("v213 runs after the already-proven v212 authority", () => {
  assert.match(entry, /studio-production-v212\.js/);
  assert.match(entry, /studio-production-v213\.js/);
  assert.ok(entry.indexOf("studio-production-v212.js") < entry.indexOf("studio-production-v213.js"));
  assert.ok(chain.indexOf("patch-production-v213.mjs") > chain.indexOf("patch-production-v212.mjs"));
  assert.match(v212Runtime, /studio-production-v212-20260802/);
  assert.match(runtime, new RegExp(RELEASE));
});

test("small-device layout map keeps the same real 4+4 areas but gives Post Page a full-width locked center", () => {
  for (const id of [
    "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
    "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4",
  ]) assert.ok(LAYOUT_AREAS.some((area) => area.id === id), `missing ${id}`);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /"content-main content-main"/);
  assert.match(css, /"sidebar-left-4 sidebar-right-4"/);
  assert.match(css, /content-main[\s\S]*pointer-events:none/);
  assert.match(runtime, /v213LockedContent/);
  assert.match(runtime, /stopImmediatePropagation/);
  assert.match(runtime, /5\.000 kata/);
});

test("v212 desktop tablet Theme code and Nara behavior are preserved", () => {
  assert.match(v212Runtime, /PHYSICAL_TABLET_MIN/);
  assert.match(v212Runtime, /preview-above-code/);
  assert.match(themeStudio, /HTML/);
  assert.match(themeStudio, /CSS/);
  assert.match(themeStudio, /JavaScript/);
  assert.match(themeStudio, /PREVIEW LANGSUNG/);
  assert.match(nara, /aria-controls="nara-attachment-menu-v211"/);
  for (const label of ["Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) assert.ok(nara.includes(label), label);
});

test("100 themes and 26 widgets including custom HTML JavaScript remain intact", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(WIDGET_COUNT, 26);
  assert.ok(BUILT_IN_WIDGETS.some((widget) => widget.id === "custom-html"));
});

test("analytics uses a larger smooth real time-series and adds only factual detail fields", () => {
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(analytics, /op41-line-v213/);
  assert.match(analytics, /data-v213-analytics-details="real-fields-only"/);
  assert.match(analytics, /Browser pengunjung/);
  assert.match(analytics, /Bot teridentifikasi/);
  assert.match(analytics, /Landing teratas/);
  assert.match(css, /op41-line-v213/);
  assert.match(css, /op41AreaV213/);
  assert.match(css, /op41-chart-grid\.equal\.v213-details/);
});

test("new analytics events record browser family while the RPC returns real browser bot and entry-page aggregates", () => {
  assert.match(handler, /function browserFamily\(/);
  for (const browser of ["Microsoft Edge", "Opera", "Samsung Internet", "Firefox", "Chrome", "Safari"]) assert.ok(handler.includes(browser), browser);
  assert.match(handler, /browserFamily: browserFamily\(userAgent\)/);
  assert.match(handler, /release: "analytics-v213"/);
  assert.match(migration, /metadata ->> 'browserFamily'/);
  assert.match(migration, /classification = 'bot'/);
  assert.match(migration, /row_number\(\) over/);
  assert.match(migration, /'browsers'/);
  assert.match(migration, /'bots'/);
  assert.match(migration, /'entryPages'/);
  assert.match(migration, /No synthetic production values/);
});

test("login persistence public single-render and no destructive session action remain protected", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /flowType:\s*"pkce"/);
  assert.match(publicSite, /PUBLIC_SITE_SINGLE_RENDER_V209/);
  for (const source of [patch, runtime, handler]) assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("v213 rotates service-worker cache while retaining the v212 compatibility marker", () => {
  assert.match(worker, /STUDIO_PRODUCTION_RELEASE_V213/);
  assert.match(worker, /ngeblogging-app-v213-analytics-layout-20260802/);
  assert.match(worker, /analytics-layout-cache-v213/);
  assert.match(worker, /ngeblogging-app-v212-large-mode-layout-nara-domain-20260802/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
});

test("v213 release metadata refuses fake analytics mass capacity and unproven OAuth claims", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.preserved.themeCount, 100);
  assert.equal(release.preserved.widgetCount, 26);
  assert.equal(release.preserved.postPageWordLimit, 5000);
  assert.equal(release.repairs.analyticsBrowserFamilyCollectedForNewEvents, true);
  assert.equal(release.repairs.historicBrowserValuesInvented, false);
  assert.equal(release.validation.fakeAnalytics, false);
  assert.equal(release.validation.massCapacityClaimed, false);
  assert.equal(release.validation.nineHundredMillionOrBillionLoginSimulationClaimed, false);
  assert.equal(release.validation.allOAuthProvidersEndToEndProven, false);
});
