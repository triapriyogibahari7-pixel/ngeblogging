import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const chain = read("scripts/patch-v216-v215-auth-compat.mjs");
const patch = read("scripts/patch-production-v221.mjs");
const runtime = read("src/studio-production-v221.js");
const css = read("src/studio-production-v221.css");
const themeStudio = read("src/ThemeStudio.jsx");
const nara = read("src/NaraAssistant.jsx");
const auth = read("src/lib/supabase.js");
const publicSite = read("src/PublicSiteNext.jsx");
const analytics = read("src/studio-analytics-v41.js");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v221.json"));
const RELEASE = "studio-production-v221-20260802";

test("v221 runs after v220 and rotates the final cache without destructive session actions", () => {
  assert.ok(chain.indexOf('patch-production-v220.mjs') < chain.indexOf('patch-production-v221.mjs'));
  assert.match(patch, /ngeblogging-app-v221-green-layout-live-authority-20260802/);
  assert.match(patch, /green-layout-live-authority-cache-v221/);
  assert.match(worker, /STUDIO_PRODUCTION_RELEASE_V221/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
});

test("normal physical phones stay small while explicit browser desktop-site remains large", () => {
  assert.match(runtime, /function isPhysicalSmall/);
  assert.match(runtime, /studioDesktopSitePhone === "true"/);
  assert.match(runtime, /if \(isPhysicalSmall\(\)\) return "small"/);
  assert.match(runtime, /\["tablet", "desktop"\]/);
  assert.match(runtime, /\["laptop", "desktop", "computer"\]/);
});

test("green reference map keeps semantic header, 4 left, center, 4 right and footer geometry", () => {
  for (const label of [
    "Header kiri · kotak 1", "Header kanan · kotak 1", "Kotak panjang di bawah header",
    "Kotak di atas postingan", "Sidebar kiri · kotak 4", "Sidebar kanan · kotak 4",
    "Kotak panjang di bawah postingan", "Kotak footer panjang", "Copyright / identitas situs",
  ]) assert.ok(runtime.includes(label), `missing green map label ${label}`);
  assert.match(css, /green-reference-four-four/);
  assert.match(css, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css, /\.content-main\{grid-column:2\/6/);
  for (const area of [
    "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
    "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4",
  ]) {
    assert.ok(LAYOUT_AREAS.some((item) => item.id === area), `missing real area ${area}`);
    assert.ok(css.includes(`.${area}`), `missing v221 geometry ${area}`);
  }
  assert.match(themeStudio, /preferredArea=\{widgetArea\}/);
});

test("v221 removes the old v213 click lock so every visible layout box can open its area", () => {
  assert.match(runtime, /removeAttribute\("data-v212-layout-map"\)/);
  assert.match(runtime, /v221LayoutAuthority = "clickable-green-map"/);
  assert.match(runtime, /removeAttribute\("aria-disabled"\)/);
  assert.match(runtime, /removeAttribute\("data-v213-locked-content"\)/);
  assert.match(runtime, /pointer-events", "auto"/);
});

test("Theme code editor has actual line gutter, 10000 line limit and responsive preview/code order", () => {
  assert.match(runtime, /MAX_CODE_LINES = 10000/);
  assert.match(runtime, /Maks\. 10\.000 baris/);
  assert.match(css, /\.v220-code-line-gutter/);
  assert.match(css, /data-v221-workspace="preview-above-code"/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
  assert.match(css, /data-v221-workspace="split-50-50"/);
  assert.match(css, /grid-template-areas:"code preview"/);
});

test("Theme catalog, custom Theme and 26 real widgets remain synchronized", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((item) => item.id)).size, 100);
  assert.equal(WIDGET_COUNT, 26);
  assert.equal(BUILT_IN_WIDGETS.at(-1)?.id, "custom-html");
  assert.match(themeStudio, /Tema Custom/);
  assert.match(themeStudio, /tn-widget-custom-code-v209/);
});

test("Nara small medium full keep Camera Photo File, model, intelligence and square launcher", () => {
  for (const marker of ["Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) {
    assert.ok(nara.includes(marker), `Nara missing ${marker}`);
  }
  assert.match(runtime, /camera-photo-file-visible/);
  assert.match(css, /square-icon/);
  assert.match(css, /data-v221-nara-size="small"/);
  assert.match(css, /data-v221-nara-size="medium"/);
  assert.match(css, /data-v221-nara-size="full"/);
  assert.match(css, /grid-template-columns:40px 40px minmax\(64px,.82fr\) minmax\(80px,1fr\) 42px/);
});

test("Domain, analytics, auth and public-site production contracts are preserved", () => {
  assert.match(css, /data-v221-domain-action="horizontal-full"/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(css, /op41-line-v213/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(publicSite, /PUBLIC_SITE_ATOMIC_BOOTSTRAP_V218/);
});

test("v221 release remains factual and requires live cutover and real capacity testing", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.theme.builtInThemesRequired, 100);
  assert.equal(release.theme.widgetCountRequired, 26);
  assert.equal(release.theme.greenReferenceSemanticMap, true);
  assert.equal(release.theme.codeLineLimitSupported, 10000);
  assert.equal(release.nara.camera, true);
  assert.equal(release.nara.photo, true);
  assert.equal(release.nara.file, true);
  assert.equal(release.auth.forcedLogoutAdded, false);
  assert.equal(release.deployment.legacyWhiteR4MustBeRejected, true);
  assert.equal(release.claims.massUserCapacityClaimed, false);
  assert.equal(release.claims.nineHundredMillionUsersProven, false);
});
