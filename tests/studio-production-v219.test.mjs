import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const patch = read("scripts/patch-production-v219.mjs");
const chain = read("scripts/patch-v216-v215-auth-compat.mjs");
const boundary = read("src/ThemeStudioBoundary.jsx");
const runtime = read("src/studio-production-v219.js");
const css = read("src/studio-production-v219.css");
const nara = read("src/NaraAssistant.jsx");
const auth = read("src/lib/supabase.js");
const release = JSON.parse(read("public/release-v219.json"));

const RELEASE = "studio-production-v219-20260802";

test("v219 removes the separate Theme lazy chunk and provides a non-blank render boundary", () => {
  assert.match(patch, /ThemeStudioBoundary\.jsx/);
  assert.match(patch, /THEME_EAGER_BOUNDARY_V219/);
  assert.match(patch, /V219_THEME_LAZY_CHUNK_REMAINS/);
  assert.match(boundary, /import ThemeStudio from "\.\/ThemeStudio\.jsx"/);
  assert.match(boundary, /Tema belum dapat dirender/);
  assert.match(boundary, /Coba lagi/);
  assert.doesNotMatch(boundary, /location\.reload|signOut|localStorage\.clear|sessionStorage\.clear/);
});

test("v219 is final after v218 and rotates cache without forced navigation", () => {
  assert.ok(chain.indexOf('patch-public-site-v218.mjs') < chain.indexOf('patch-production-v219.mjs'));
  assert.match(patch, /ngeblogging-app-v219-theme-blank-resilience-20260802/);
  assert.match(patch, /theme-blank-resilience-cache-v219/);
  assert.match(patch, /ngeblogging-app-v218-public-single-load-20260802/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("six responsive families and three desktop variants remain explicit", () => {
  for (const family of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) {
    assert.ok(runtime.includes(`"${family}"`), `missing ${family}`);
  }
  for (const variant of ["laptop", "desktop", "computer"]) {
    assert.ok(runtime.includes(`"${variant}"`), `missing desktop variant ${variant}`);
  }
  assert.match(runtime, /physicalShortEdge/);
});

test("Theme editor stays preview-first on small devices and 50:50 on large devices", () => {
  assert.match(runtime, /MAX_CODE_LINES = 10000/);
  assert.match(runtime, /preview-above-code/);
  assert.match(runtime, /split-50-50/);
  assert.match(css, /data-v219-workspace="preview-above-code"/);
  assert.match(css, /data-v219-workspace="split-50-50"/);
  assert.match(css, /\.v219-code-line-gutter/);
  assert.match(css, /1–10\.000 baris didukung/);
});

test("layout map has compact physical-device geometry and four left plus four right slots", () => {
  for (const selector of [
    ".sidebar-left-1", ".sidebar-left-2", ".sidebar-left-3", ".sidebar-left-4",
    ".sidebar-right-1", ".sidebar-right-2", ".sidebar-right-3", ".sidebar-right-4",
    ".content-main",
  ]) assert.ok(css.includes(selector), `missing layout selector ${selector}`);
  assert.match(css, /compact-four-four/);
  assert.match(css, /large-four-four/);
  assert.match(css, /data-v219-layout-prose="hidden"/);
});

test("Nara attachment, sizes, model and intelligence controls remain real", () => {
  for (const marker of ["Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) {
    assert.ok(nara.includes(marker), `Nara source missing ${marker}`);
  }
  assert.match(runtime, /camera-photo-file/);
  assert.match(css, /data-v219-attachment-menu="camera-photo-file"/);
  assert.match(css, /data-v219-nara-size="small"/);
  assert.match(css, /data-v219-nara-size="medium"/);
});

test("auth persistence is preserved while release metadata makes no fake capacity claim", () => {
  assert.match(auth, /persistSession: true/);
  assert.match(auth, /autoRefreshToken: true/);
  assert.equal(release.release, RELEASE);
  assert.equal(release.theme.builtInThemesRequired, 100);
  assert.equal(release.theme.codeLineLimitSupported, 10000);
  assert.equal(release.nara.camera, true);
  assert.equal(release.nara.photo, true);
  assert.equal(release.nara.file, true);
  assert.equal(release.analytics.fakeProductionStatisticsAdded, false);
  assert.equal(release.claims.massUserCapacityClaimed, false);
});
