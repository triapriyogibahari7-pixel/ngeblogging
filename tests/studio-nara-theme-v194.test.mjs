import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studio = read("src/Studio.jsx");
const css = read("src/studio-nara-theme-v194.css");
const runtime = read("src/studio-nara-theme-v194.js");
const patch = read("scripts/patch-studio-nara-theme-v194.mjs");
const supabase = read("src/lib/supabase.js");
const gate = read("src/StudioOnboardingGate.jsx");
const release = JSON.parse(read("public/release-v194.json"));

test("v194 loads after v193 and preserves the v192 login/session contract", () => {
  assert.match(studio, /studio-screenshot-recovery-v193-hotfix\.css";\nimport "\.\/studio-nara-theme-v194\.js/);
  assert.match(supabase, /persistSession:\s*true/);
  assert.match(supabase, /autoRefreshToken:\s*true/);
  assert.match(gate, /listUserSitesDirectV192/);
  assert.match(gate, /force:\s*attempt\s*>\s*0/);
});

test("Theme Studio headers cannot inherit the absolute landing-page header geometry", () => {
  assert.match(css, /\.tn-library>header/);
  assert.match(css, /\.tn-layout-studio-header/);
  assert.match(css, /position:static\s*!important/);
  assert.match(css, /inset:auto\s*!important/);
  assert.match(css, /height:auto\s*!important/);
  assert.match(css, /overflow-wrap:anywhere\s*!important/);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /data-studio-physical-mobile-v191="true"/);
});

test("Nara top controls and composer controls each occupy exactly one compact row on mobile", () => {
  assert.match(css, /grid-template-areas:"title sizes voice reset close"/);
  assert.match(css, /grid-template-rows:58px\s*!important/);
  assert.match(css, /grid-template-columns:30px 30px minmax\(58px,\.82fr\) minmax\(72px,1fr\) 32px\s*!important/);
  assert.match(css, /\.nara-select\.intelligence[\s\S]*grid-column:3/);
  assert.match(css, /\.nara-select\.model[\s\S]*grid-column:4/);
  assert.match(css, /\.nara-send[\s\S]*grid-column:5/);
});

test("small and medium Nara are non-modal from first paint and do not blink the page", () => {
  assert.match(css, /:has\(> \.nara-assistant-shell\[data-nara-size="small"\]\)/);
  assert.match(css, /:has\(> \.nara-assistant-shell\[data-nara-size="medium"\]\)/);
  assert.match(css, /display:none\s*!important/);
  assert.match(css, /pointer-events:none\s*!important/);
  assert.match(css, /animation:none\s*!important/);
  assert.match(runtime, /attributeFilter:\s*\["data-nara-size", "data-studio-responsive-mode", "data-studio-handheld"\]/);
  assert.doesNotMatch(runtime, /attributeFilter:[\s\S]*"aria-modal"/);
});

test("build patch makes React render the correct modal state before recovery observers", () => {
  assert.match(patch, /changeSize\(\"small\"\); setOpen\(true\)/);
  assert.match(patch, /aria-modal=\{size === \"full\"\}/);
  assert.match(patch, /hidden=\{size !== \"full\"\}/);
  assert.match(patch, /recognition\.current = null/);
  assert.match(patch, /SCREENSHOT_RECOVERY_COMPAT_VERSION_V193/);
  assert.match(patch, /ngeblogging-app-v194-nara-theme-20260801/);
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(/);
});

test("release v194 remains factual", () => {
  assert.equal(release.release, "studio-nara-theme-v194-20260801");
  assert.equal(release.repairs.themeStudioGlobalHeaderLeakIsolated, true);
  assert.equal(release.repairs.naraTopControlsSingleRow, true);
  assert.equal(release.repairs.naraComposerControlsSingleRow, true);
  assert.equal(release.repairs.naraFirstPaintNonModalForSmallMedium, true);
  assert.equal(release.authentication.persistSession, true);
  assert.equal(release.serviceWorker.forcedNavigation, false);
  assert.equal(release.validation.massCapacityClaimed, false);
  assert.equal(release.validation.physicalDeviceVerificationStillRequired, true);
});
