import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const chain = read("scripts/patch-v216-v215-auth-compat.mjs");
const patch = read("scripts/patch-production-v220.mjs");
const runtime = read("src/studio-production-v220.js");
const css = read("src/studio-production-v220.css");
const themeStudio = read("src/ThemeStudio.jsx");
const nara = read("src/NaraAssistant.jsx");
const auth = read("src/lib/supabase.js");
const publicSite = read("src/PublicSiteNext.jsx");
const release = JSON.parse(read("public/release-v220.json"));
const RELEASE = "studio-production-v220-20260802";

test("v220 is final after v219 and keeps session-safe update behavior", () => {
  assert.ok(chain.indexOf('patch-production-v219.mjs') < chain.indexOf('patch-production-v220.mjs'));
  assert.match(patch, /ngeblogging-app-v220-theme-editor-layout-lock-20260802/);
  assert.match(patch, /theme-editor-layout-lock-cache-v220/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("browser desktop-site is locked to large before physical small-device rules", () => {
  assert.match(runtime, /studioDesktopSitePhone === "true"/);
  assert.match(runtime, /if \(desktopSite\) return "large"/);
  assert.match(runtime, /studioV216PhysicalFamily = family/);
  assert.match(runtime, /studioV219Small = String\(family === "small"\)/);
  assert.match(runtime, /\["tablet", "desktop"\]/);
  assert.match(runtime, /\["laptop", "desktop", "computer"\]/);
});

test("Theme editor formats minified code and numbers actual lines up to 10000", () => {
  assert.match(runtime, /MAX_CODE_LINES = 10000/);
  assert.match(runtime, /function formatHtml/);
  assert.match(runtime, /function formatBraced/);
  assert.match(runtime, /function prettyCode/);
  assert.match(runtime, /v220-code-line-gutter/);
  assert.match(runtime, /Rapikan kode/);
  assert.match(css, /\.v220-code-line-gutter/);
  assert.match(css, /data-v220-workspace="preview-above-code"/);
  assert.match(css, /data-v220-workspace="split-50-50"/);
  assert.match(css, /grid-template-areas:"code preview"/);
});

test("layout is a real 4-left center-content 4-right denah on small and large", () => {
  assert.match(patch, /THEME_LAYOUT_FUNCTIONAL_MAP_V220/);
  assert.match(css, /compact-denah-four-four/);
  assert.match(css, /large-denah-four-four/);
  assert.match(css, /grid-template-columns:minmax\(72px,.72fr\) minmax\(112px,1.25fr\) minmax\(72px,.72fr\)/);
  for (const area of [
    "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
    "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4",
  ]) {
    assert.ok(LAYOUT_AREAS.some((item) => item.id === area), `missing real layout area ${area}`);
    assert.ok(css.includes(`.${area}`), `missing CSS area ${area}`);
  }
  assert.match(css, /\.content-main/);
});

test("100 real built-in themes, Theme Custom and all 26 widgets remain", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(WIDGET_COUNT, 26);
  assert.equal(BUILT_IN_WIDGETS.at(-1)?.id, "custom-html");
  assert.match(themeStudio, /Tema Custom/);
  assert.match(themeStudio, /preferredArea=\{widgetArea\}/);
  assert.match(themeStudio, /tn-widget-custom-code-v209/);
});

test("Nara retains Camera Photo File, model, intelligence and compact three sizes", () => {
  for (const marker of ["Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) {
    assert.ok(nara.includes(marker), `Nara missing ${marker}`);
  }
  assert.match(runtime, /camera-photo-file/);
  assert.match(css, /data-v220-attachment-menu="camera-photo-file"/);
  assert.match(css, /data-v220-nara-size="small"/);
  assert.match(css, /data-v220-nara-size="medium"/);
  assert.match(css, /data-v220-nara-size="full"/);
  assert.match(css, /grid-template-columns:42px 42px minmax\(82px,.8fr\) minmax\(104px,1fr\) 44px/);
});

test("auth persistence and atomic public-site bootstrap remain intact", () => {
  assert.match(auth, /persistSession: true/);
  assert.match(auth, /autoRefreshToken: true/);
  assert.match(publicSite, /PUBLIC_SITE_ATOMIC_BOOTSTRAP_V218/);
  assert.match(publicSite, /setSite\(resolved\)/);
  assert.equal(release.auth.forcedLogoutAdded, false);
  assert.equal(release.publicSite.atomicBootstrapV218Retained, true);
});

test("release is factual and does not claim untested mass capacity", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.theme.builtInThemesRequired, 100);
  assert.equal(release.theme.widgetCountRequired, 26);
  assert.equal(release.theme.codeLineLimitSupported, 10000);
  assert.equal(release.responsive.desktopSitePhoneLockedLarge, true);
  assert.equal(release.analytics.fakeProductionStatisticsAdded, false);
  assert.equal(release.claims.massUserCapacityClaimed, false);
  assert.equal(release.claims.nineHundredMillionUsersProven, false);
});
