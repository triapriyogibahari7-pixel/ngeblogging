import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [entry, theme, analytics, runtime, css, cssFix, nara, widgets, sw, publicSite, release, patchChain] = await Promise.all([
  read("src/Studio.jsx"),
  read("src/ThemeStudio.jsx"),
  read("src/studio-analytics-v41.js"),
  read("src/studio-production-v212.js"),
  read("src/studio-production-v212.css"),
  read("src/studio-production-v212-fix.css"),
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

test("layout map keeps Post or Page as a locked large central surface", () => {
  assert.match(theme, /tn-layout-content-main-v212/);
  assert.match(theme, /AREA TERKUNCI · BUKAN SLOT WIDGET/);
  assert.match(theme, /sidebar-left-4/);
  assert.match(theme, /sidebar-right-4/);
  assert.match(css, /\.tn-layout-post-grid-v212/);
  assert.match(css, /\.tn-layout-content-main-v212/);
  const openingTag = theme.match(/<div className="tn-layout-content-main-v212"[^>]*>/)?.[0] || "";
  assert.ok(openingTag, "locked content opening tag missing");
  assert.doesNotMatch(openingTag, /onClick=/);
});

test("all four left and four right slots remain real widget areas and custom code remains available", () => {
  for (const marker of ["sidebar-left-4", "sidebar-right-4", 'id: "custom-html"', "HTML / JavaScript"]) assert.match(widgets, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(theme, /onOpenWidgets\(areaId\)/);
  assert.match(theme, /Buka semua \{WIDGET_COUNT\} widget/);
});

test("Theme code editor has HTML CSS JavaScript, live preview, responsive split and panel swap", () => {
  assert.match(theme, /tn-code-workspace-v212/);
  assert.match(theme, /HTML/);
  assert.match(theme, /CSS/);
  assert.match(theme, /JavaScript/);
  assert.match(theme, /PREVIEW LANGSUNG/);
  assert.match(theme, /Tukar panel/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(cssFix, /data-studio-v212-device="handheld"/);
  assert.match(cssFix, /grid-template-columns:1fr/);
});

test("Nara keeps native Camera Photo File menu and small/medium non-modal authority", () => {
  assert.match(nara, /aria-controls="nara-attachment-menu-v211"/);
  assert.match(nara, /<b>Kamera<\/b>/);
  assert.match(nara, /<b>Foto<\/b>/);
  assert.match(nara, /<b>File teks<\/b>/);
  assert.match(runtime, /camera-photo-file/);
  assert.match(runtime, /pointer-events/);
  assert.match(css, /#nara-attachment-menu-v211/);
  assert.match(css, /data-nara-size="small"/);
  assert.match(css, /data-nara-size="medium"/);
  assert.match(css, /data-nara-size="full"/);
});

test("Domain handheld actions are horizontal full-width and analytics stays production-backed", () => {
  assert.match(css, /writing-mode:horizontal-tb/);
  assert.match(css, /data-studio-v212-device="handheld"[\s\S]*\.op41-domain button/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(analytics, /lineSvgV212/);
  assert.match(analytics, /op41-line-v212/);
  assert.match(analytics, /BROWSER/);
  assert.match(analytics, /MESIN PENCARI \/ BOT/);
  assert.match(analytics, /HALAMAN MASUK/);
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
