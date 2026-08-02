import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v212.js");
const css = read("src/studio-production-v212.css");
const themeStudio = read("src/ThemeStudio.jsx");
const themeRuntime = read("src/theme-layout-runtime-v170.js");
const themeLayoutCss = read("src/theme-layout-v170.css");
const nara = read("src/NaraAssistant.jsx");
const auth = read("src/lib/supabase.js");
const chain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-production-v212.mjs");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v212.json"));
const RELEASE = "studio-production-v212-20260802";

test("v212 runs after v211 and keeps compatibility instead of replacing old authorities", () => {
  assert.match(entry, /studio-production-v211\.js/);
  assert.match(entry, /studio-production-v212\.js/);
  assert.ok(entry.indexOf("studio-production-v211.js") < entry.indexOf("studio-production-v212.js"));
  assert.ok(chain.indexOf("patch-production-v212.mjs") > chain.indexOf("patch-production-v211.mjs"));
  assert.match(runtime, new RegExp(RELEASE));
  assert.match(worker, /STUDIO_PRODUCTION_RELEASE_V212/);
  assert.match(worker, /ngeblogging-app-v211-mobile-theme-nara-domain-20260802/);
});

test("explicit desktop-site and tablet/desktop families stay large while app/phone/mobile/compact stay small", () => {
  assert.match(runtime, /studioDesktopSitePhone === "true"/);
  assert.match(runtime, /LARGE_FAMILIES/);
  assert.match(runtime, /SMALL_FAMILIES/);
  assert.match(css, /data-studio-v212-family="large"/);
  assert.match(css, /data-studio-v212-family="small"/);
  assert.match(css, /data-v212-workspace="split"/);
  assert.match(css, /data-v212-workspace="preview-above-code"/);
});

test("Theme editor keeps HTML CSS JavaScript and selected preview viewport instead of shrinking desktop into mobile", () => {
  assert.match(themeStudio, /data-code-preview-device=\{device\}/);
  assert.match(themeStudio, /data-preview-device=\{device\}/);
  for (const marker of ["HTML", "CSS", "JavaScript", "PREVIEW LANGSUNG"]) assert.ok(themeStudio.includes(marker), marker);
  assert.match(css, /width:var\(--tn-preview-width,1440px\)!important/);
  assert.match(css, /grid-template-areas:"code preview"/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
});

test("layout map has four real left and four real right widget areas around a large center content slot", () => {
  for (const id of [
    "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
    "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4",
  ]) {
    assert.ok(LAYOUT_AREAS.some((area) => area.id === id), `missing ${id}`);
  }
  assert.match(themeRuntime, /sidebar-left-4/);
  assert.match(themeRuntime, /sidebar-right-4/);
  assert.match(themeRuntime, /Empat area widget kanan postingan/);
  assert.match(themeLayoutCss, /sidebar-right-4/);
  assert.match(css, /sidebar-left-4 content-main sidebar-right-4/);
  assert.match(css, /background:linear-gradient\(145deg,#1268e8,#0755c7\)/);
});

test("100 themes and custom HTML JavaScript widget remain synchronized with Theme Studio", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(WIDGET_COUNT, 26);
  assert.ok(BUILT_IN_WIDGETS.some((widget) => widget.id === "custom-html"));
  assert.match(themeStudio, /Peta tata letak 22 area widget/);
});

test("Nara small and medium remain non-modal and plus exposes Camera Photo File with model and intelligence controls", () => {
  assert.match(nara, /aria-controls="nara-attachment-menu-v211"/);
  assert.match(nara, /role="menu"/);
  for (const label of ["Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) {
    assert.ok(nara.includes(label), label);
  }
  assert.match(runtime, /camera-photo-file/);
  assert.match(runtime, /v212Mode/);
  assert.match(css, /data-v212-mode="nonmodal"/);
  assert.match(css, /data-v212-menu="camera-photo-file"/);
  assert.match(css, /nara-select\[data-v212-control="visible"\]/);
  assert.match(css, /nara-assistant-shell\[data-v212-size="small"\]/);
  assert.match(css, /nara-assistant-shell\[data-v212-size="medium"\]/);
});

test("Domain mobile actions are full-width horizontal and analytics charts receive readable area", () => {
  assert.match(runtime, /data-v212-domain-action|v212DomainAction/);
  assert.match(css, /data-v212-domain-action="horizontal"/);
  assert.match(css, /sv124-free-domain>aside[\s\S]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /sv124-free-domain>aside>\*[\s\S]*width:100%/);
  assert.match(css, /op41-line\[data-v212-chart="market-style"\]/);
  assert.match(css, /op41-donut\[data-v212-donut="large-detail"\]/);
});

test("login persistence and real Google LinkedIn email flows remain present and are not cleared by v212", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /flowType:\s*"pkce"/);
  assert.match(auth, /"google"/);
  assert.match(auth, /"linkedin_oidc"/);
  assert.match(auth, /signInWithPassword/);
  assert.match(auth, /signInWithMagicLink/);
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("v212 service worker rotates cache without forced navigation", () => {
  assert.match(worker, /ngeblogging-app-v212-large-mode-layout-nara-domain-20260802/);
  assert.match(worker, /large-mode-layout-nara-domain-cache-v212/);
  assert.match(worker, /studio-production-v212-20260802/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
});

test("v212 metadata stays factual and does not invent mass-capacity validation", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.preserved.themeCount, 100);
  assert.equal(release.preserved.widgetCount, 26);
  assert.equal(release.preserved.postPageWordLimit, 5000);
  assert.equal(release.repairs.desktopSitePhoneUsesLargeLayout, true);
  assert.equal(release.repairs.layoutFourthRightRealArea, true);
  assert.equal(release.repairs.naraAttachmentMenuCameraPhotoFile, true);
  assert.equal(release.validation.massCapacityClaimed, false);
  assert.equal(release.validation.nineHundredMillionOrBillionLoginSimulationClaimed, false);
  assert.equal(release.validation.realDeviceRequiredBeforeHundredPercentClaim, true);
});
