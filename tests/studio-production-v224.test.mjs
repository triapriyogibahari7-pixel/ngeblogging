import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const chain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-production-v224.mjs");
const runtime = read("src/studio-production-v224.js");
const css = read("src/studio-production-v224.css");
const v222 = read("src/studio-production-v222.js");
const v209 = read("src/studio-production-v209.js");
const themeStudio = read("src/ThemeStudio.jsx");
const nara = read("src/NaraAssistant.jsx");
const auth = read("src/lib/supabase.js");
const release = JSON.parse(read("public/release-v224.json"));
const worker = read("public/sw.js");

const RELEASE = "studio-production-v224-20260803";

test("v224 is the final production patch after v222 and v223", () => {
  const v222Pos = chain.lastIndexOf('patch-production-v222.mjs');
  const v223Pos = chain.lastIndexOf('patch-production-v223.mjs');
  const v224Pos = chain.lastIndexOf('patch-production-v224.mjs');
  assert.ok(v222Pos >= 0 && v223Pos > v222Pos && v224Pos > v223Pos);
  assert.match(patch, /studio-production-v224\.js/);
  assert.match(runtime, new RegExp(RELEASE));
  assert.match(worker, /ngeblogging-app-v224-visible-actions-cutover-20260803/);
  assert.match(worker, /visible-actions-cutover-cache-v224/);
  assert.match(worker, /STUDIO_PRODUCTION_RELEASE_V224/);
});

test("legacy v209 can no longer hide explicit HTML CSS JavaScript Theme actions", () => {
  assert.match(patch, /expanded-html-css-javascript-v224/);
  assert.match(patch, /data-v222-code-tab/);
  assert.match(runtime, /html-css-javascript-visible/);
  assert.match(runtime, /Edit HTML/);
  assert.match(runtime, /Edit CSS/);
  assert.match(runtime, /Edit JavaScript/);
  assert.match(css, /data-v224-code-action/);
  for (const kind of ["html", "css", "javascript"]) {
    assert.ok(themeStudio.includes(`data-v222-code-tab="${kind}"`), `missing Theme action ${kind}`);
  }
  // Source may still be pre-patch when this test file is inspected directly; the build chain
  // must contain the mutation that expands v209's canonical set before production output.
  assert.match(v209, /canonical = new Set/);
  assert.equal(release.theme.legacyV209ActionConflictRemoved, true);
});

test("physical-small layout follows green 4-left + center + 4-right topology", () => {
  assert.match(runtime, /compact-green-map/);
  assert.match(runtime, /green-reference-four-left-four-right/);
  assert.match(css, /data-v224-layout-canvas="compact-green-map"/);
  for (const selector of [
    ".sidebar-left-1", ".sidebar-left-2", ".sidebar-left-3", ".sidebar-left-4",
    ".sidebar-right-1", ".sidebar-right-2", ".sidebar-right-3", ".sidebar-right-4",
    ".content-main", ".before-content", ".after-content",
  ]) assert.ok(css.includes(selector), `missing compact green-map selector ${selector}`);
  assert.match(themeStudio, /preferredArea=\{widgetArea\}/);
  assert.equal(release.theme.physicalSmallFourLeftFourRight, true);
});

test("Theme editor retains actual numbered lines to 10000 and readable device geometry", () => {
  assert.match(v222, /MAX_CODE_LINES = 10000/);
  assert.match(v222, /v222-code-line-gutter/);
  assert.match(v222, /Array\.from\(\{ length: shown \}/);
  assert.match(v222, /v222-format-code/);
  assert.match(v222, /prettyCode/);
  assert.match(runtime, /1-to-10000-actual/);
  assert.match(css, /v222-code-line-gutter\[data-v224-gutter\]/);
  assert.match(css, /data-v224-workspace="preview-above-code"/);
  assert.match(css, /data-v224-workspace="code-left-preview-right"/);
  assert.equal(release.theme.codeLineLimitSupported, 10000);
  assert.equal(release.theme.actualLineNumbersRetained, true);
  assert.equal(release.theme.minifiedCodePrettyPrintRetained, true);
});

test("100 real themes, Theme Custom and 26 real widgets remain available", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(WIDGET_COUNT, 26);
  assert.ok(BUILT_IN_WIDGETS.some((widget) => widget.id === "custom-html"));
  assert.match(themeStudio, /Tema Custom/);
  assert.match(themeStudio, /tn-widget-custom-code-v209/);
  assert.equal(release.theme.builtInThemesRequired, 100);
  assert.equal(release.theme.widgetCountRequired, 26);
});

test("Nara keeps camera photo file mic speaker model intelligence and nonmodal small medium", () => {
  assert.match(runtime, /camera-photo-file/);
  assert.match(runtime, /viewport-visible/);
  assert.match(css, /data-v224-nara-mode="nonmodal"/);
  assert.match(css, /data-v224-attachment-menu="viewport-visible"/);
  for (const marker of ["Kamera", "Foto", "File teks", "Mic", "SpeakerIcon", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) {
    assert.ok(nara.includes(marker), `Nara feature missing ${marker}`);
  }
  assert.equal(release.nara.smallMediumNonModal, true);
  assert.equal(release.nara.attachmentMenuCameraPhotoFile, true);
  assert.equal(release.nara.modelAndIntelligenceControlsRetained, true);
});

test("physical-small Domain actions stay full width and horizontal", () => {
  assert.match(runtime, /full-horizontal/);
  assert.match(css, /data-v224-domain-action="full-horizontal"/);
  assert.match(css, /writing-mode:horizontal-tb!important/);
  assert.match(css, /white-space:nowrap!important/);
  assert.equal(release.domain.physicalSmallActionsFullHorizontal, true);
});

test("persistent authentication stays enabled and no destructive session action is introduced", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  for (const source of [runtime, patch]) {
    assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  }
  assert.equal(release.auth.forcedLogoutAdded, false);
  assert.equal(release.claims.massUserCapacityClaimed, false);
  assert.equal(release.claims.nineHundredMillionOrBillionLoginSimulationClaimed, false);
});
