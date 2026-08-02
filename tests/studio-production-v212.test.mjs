import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [
  entry, theme, themeCatalog, analytics, analyticsHandler, analyticsMigration,
  runtime, css, cssFix, layoutCss, nara, widgets, sw, publicSite, release, patchChain,
] = await Promise.all([
  read("src/Studio.jsx"),
  read("src/ThemeStudio.jsx"),
  read("src/theme-catalog.js"),
  read("src/studio-analytics-v41.js"),
  read("server/analytics-handler.mjs"),
  read("supabase/migrations/20260802102500_analytics_dashboard_v212_details.sql"),
  read("src/studio-production-v212.js"),
  read("src/studio-production-v212.css"),
  read("src/studio-production-v212-fix.css"),
  read("src/studio-production-v212-layout.css"),
  read("src/NaraAssistant.jsx"),
  read("src/widget-system.js"),
  read("public/sw.js"),
  read("src/PublicSiteNext.jsx"),
  read("public/release-v212.json"),
  read("scripts/patch-service-worker-v179.mjs"),
]);

test("v212 runs after v211 and becomes the final Studio authority", () => {
  assert.match(patchChain, /patch-production-v211\.mjs/);
  assert.match(patchChain, /patch-production-v212\.mjs/);
  assert.ok(patchChain.indexOf("patch-production-v212.mjs") > patchChain.indexOf("patch-production-v211.mjs"));
  assert.match(entry, /studio-production-v212\.js/);
  assert.match(sw, /studio-production-v212-20260802/);
  assert.match(sw, /layout-code-nara-analytics-cache-v212/);
});

test("proven v170/v209 LayoutMap is retained while Post or Page is locked large in the center", () => {
  assert.match(runtime, /stabilizeLayoutMap/);
  assert.match(runtime, /locked-content-four-left-four-right/);
  assert.match(runtime, /Konten utama/);
  assert.match(runtime, /5\.000 kata/);
  assert.match(runtime, /event\.target\.closest\("\.tn-layout-canvas-v170 > \.content-main"\)/);
  assert.match(layoutCss, /\.tn-layout-canvas-v170 > \.content-main/);
  assert.match(layoutCss, /grid-column:2 \/ 6/);
  assert.match(layoutCss, /background:linear-gradient\(145deg,#2d73e5/);
  assert.match(layoutCss, /pointer-events:none/);
});

test("four real left and four real right widget areas survive and custom HTML JavaScript remains available", () => {
  for (const area of [
    "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
    "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4",
  ]) {
    assert.ok(runtime.includes(`"${area}"`) || widgets.includes(`id: "${area}"`), `missing real widget area ${area}`);
    assert.ok(layoutCss.includes(`.${area}`), `missing layout geometry ${area}`);
  }
  assert.match(widgets, /id: "custom-html"/);
  assert.match(widgets, /HTML \/ JavaScript/);
  assert.match(theme, /preferredArea=\{widgetArea\}/);
});

test("Theme code editor has HTML CSS JavaScript, live preview, split desktop, stacked handheld and panel swap", () => {
  assert.match(theme, /tn-code-workspace-v212/);
  assert.match(theme, /id:"html"/);
  assert.match(theme, /id:"css"/);
  assert.match(theme, /id:"javascript"/);
  assert.match(theme, /PREVIEW LANGSUNG/);
  assert.match(theme, /Tukar panel/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(cssFix, /data-studio-v212-device="handheld"/);
  assert.match(cssFix, /grid-template-columns:1fr/);
});

test("theme catalog remains exactly the real generated 20 families x 5 compositions = 100 themes", () => {
  assert.match(themeCatalog, /const FAMILIES = \[/);
  assert.match(themeCatalog, /const COMPOSITIONS = \[/);
  assert.match(themeCatalog, /BUILT_IN_THEMES=FAMILIES\.flatMap/);
  assert.match(themeCatalog, /THEME_COUNT=BUILT_IN_THEMES\.length/);
  const familyCount = (themeCatalog.match(/\{ id:"[^"]+",name:/g) || []).length;
  const compositionBlock = themeCatalog.match(/const COMPOSITIONS = \[([\s\S]*?)\];/)?.[1] || "";
  const compositionCount = (compositionBlock.match(/\{ id:"/g) || []).length;
  assert.equal(familyCount, 20);
  assert.equal(compositionCount, 5);
  assert.equal(familyCount * compositionCount, 100);
});

test("Nara keeps native Camera Photo File menu, model/intelligence and small/medium non-modal authority", () => {
  assert.match(nara, /aria-controls="nara-attachment-menu-v211"/);
  assert.match(nara, /<b>Kamera<\/b>/);
  assert.match(nara, /<b>Foto<\/b>/);
  assert.match(nara, /<b>File teks<\/b>/);
  for (const model of ["Nara Mini", "Nara Writer", "Nara Vision", "Nara Max"]) assert.ok(nara.includes(model));
  for (const level of ["Instan", "Sedang", "Tinggi", "Maksimal"]) assert.ok(nara.includes(level));
  assert.match(runtime, /camera-photo-file/);
  assert.match(runtime, /full \? "modal" : "nonmodal"/);
  assert.match(css, /#nara-attachment-menu-v211/);
  assert.match(css, /data-nara-size="small"/);
  assert.match(css, /data-nara-size="medium"/);
  assert.match(css, /data-nara-size="full"/);
});

test("Domain handheld actions are horizontal full-width and large tablets stay in large family", () => {
  assert.match(css, /writing-mode:horizontal-tb/);
  assert.match(css, /data-studio-v212-device="handheld"[\s\S]*\.op41-domain button/);
  assert.match(runtime, /shortEdge >= 768 \? "large"/);
  assert.match(layoutCss, /data-studio-v212-device="large"/);
});

test("analytics remains production-backed and records only real browser/bot/entry-page details", () => {
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(analytics, /op41-line-v212/);
  assert.match(analytics, /data-v212-analytics-details="real-fields-only"/);
  assert.match(analytics, /Browser pengunjung/);
  assert.match(analytics, /Bot teridentifikasi/);
  assert.match(analytics, /Landing teratas/);
  assert.match(analyticsHandler, /function browserFamily\(/);
  assert.match(analyticsHandler, /browserFamily: browserFamily\(userAgent\)/);
  assert.match(analyticsHandler, /release: "analytics-v212"/);
  assert.match(analyticsMigration, /'browsers'/);
  assert.match(analyticsMigration, /'bots'/);
  assert.match(analyticsMigration, /'entryPages'/);
  assert.match(analyticsMigration, /metadata ->> 'browserFamily'/);
  assert.match(analyticsMigration, /classification = 'bot'/);
  assert.match(analyticsMigration, /row_number\(\) over/);
});

test("v212 does not fake mass capacity, clear sessions, or reintroduce public double render", () => {
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.match(publicSite, /PUBLIC_SITE_SINGLE_RENDER_V209/);
  const metadata = JSON.parse(release);
  assert.equal(metadata.claims.fakeAnalytics, false);
  assert.equal(metadata.claims.fakeCapacity, false);
  assert.equal(metadata.claims.massLoginCapacityProven, false);
  assert.equal(metadata.claims.allOAuthProvidersEndToEndProven, false);
});
