import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studio = read("src/Studio.jsx");
const runtime = read("src/studio-screenshot-recovery-v193.js");
const css = read("src/studio-screenshot-recovery-v193.css");
const supabase = read("src/lib/supabase.js");
const gate = read("src/StudioOnboardingGate.jsx");
const callback = read("src/lib/auth-callback-v162.js");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v193.json"));

test("v193 is loaded after v191 and keeps v192 auth bootstrap intact", () => {
  assert.match(studio, /studio-screenshot-recovery-v191-hotfix\.css";\nimport "\.\/studio-screenshot-recovery-v193\.js/);
  assert.match(runtime, /studio-screenshot-recovery-v193-20260801/);
  assert.match(gate, /listUserSitesDirectV192/);
  assert.match(callback, /recovered-provider-replay-v192/);
  assert.match(supabase, /persistSession:\s*true/);
  assert.match(supabase, /autoRefreshToken:\s*true/);
});

test("Theme Studio screenshot surfaces are returned to normal mobile document flow", () => {
  for (const marker of [
    ".tn-library>header",
    ".tn-layout-studio-header",
    ".tn-layout-canvas-v170",
    ".tn-theme-grid",
    ".tn-code-workspace",
    ".tn-code-preview-pane",
  ]) assert.ok(css.includes(marker), `${marker} must be governed by v193`);
  assert.match(css, /position:static\s*!important/);
  assert.match(css, /overflow-wrap:anywhere\s*!important/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\)\s*!important/);
  assert.match(runtime, /recoverThemeStudioV193/);
  assert.match(runtime, /themeScreenshotFlowV193 = "normal-document-flow"/);
});

test("drawer and mobile n stay interactive, opaque and unblurred", () => {
  assert.match(runtime, /recoverDrawerV193/);
  assert.match(runtime, /drawerBlockingV193 = "false"/);
  assert.match(css, /#ngeblogging-studio-sidebar[\s\S]*pointer-events:auto\s*!important/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*background:transparent\s*!important/);
  assert.match(css, /\.sn-mobile-menu-mark>strong[\s\S]*place-items:center\s*!important/);
});

test("Nara small and medium are non-modal while full screen remains modal", () => {
  assert.match(runtime, /recoverNaraV193/);
  assert.match(runtime, /layer\.dataset\.v193NaraMode = full \? "modal" : "nonmodal"/);
  assert.match(css, /\.nara-assistant-layer\[aria-modal="false"\]/);
  assert.match(css, /\.nara-assistant-layer\[aria-modal="false"\]>\.nara-assistant-backdrop[\s\S]*display:none\s*!important/);
  assert.match(css, /data-nara-size="small"[\s\S]*68dvh/);
  assert.match(css, /data-nara-size="medium"[\s\S]*82dvh/);
  assert.match(css, /data-nara-size="full"[\s\S]*100dvh/);
  assert.match(css, /\.nara-assistant-header[\s\S]*grid-template-areas:"brand title voice close" "sizes sizes reset reset"/);
  assert.match(css, /\.nara-assistant-header>button:last-child[\s\S]*visibility:visible\s*!important/);
});

test("v193 service worker rotates cache without navigation or session destruction", () => {
  assert.match(worker, /ngeblogging-app-v193-screenshot-recovery-20260801/);
  assert.match(worker, /screenshot-recovery-cache-v193/);
  assert.match(worker, /SCREENSHOT_RECOVERY_RELEASE_V193/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
  assert.doesNotMatch(worker, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("release v193 stays factual and does not claim untested mass capacity", () => {
  assert.equal(release.release, "studio-screenshot-recovery-v193-20260801");
  assert.equal(release.repairs.themeStudioMobileHeadingNormalFlow, true);
  assert.equal(release.repairs.naraSmallMediumNonModal, true);
  assert.equal(release.repairs.drawerClickableAndUnblurred, true);
  assert.equal(release.preserved.postsPagesWordLimit, 5000);
  assert.equal(release.preserved.themeMinimum, 100);
  assert.equal(release.serviceWorker.forcedNavigation, false);
  assert.equal(release.validation.massCapacityClaimed, false);
  assert.equal(release.validation.physicalDeviceVerificationStillRequired, true);
});
