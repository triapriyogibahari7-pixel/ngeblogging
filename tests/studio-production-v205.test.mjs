import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v205.js");
const css = read("src/studio-production-v205.css");
const patch = read("scripts/patch-production-v205.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");
const nara = read("src/NaraAssistant.jsx");
const theme = read("src/ThemeStudio.jsx");
const callback = read("src/lib/auth-callback-v162.js");
const supabase = read("src/lib/supabase.js");
const release = JSON.parse(read("public/release-v205.json"));

const RELEASE = "studio-production-v205-20260802";

function hasAll(source, markers) {
  for (const marker of markers) assert.ok(source.includes(marker), `missing ${marker}`);
}

test("v205 is loaded and patched after v204 without replacing prior authorities", () => {
  assert.ok(entry.indexOf('import "./studio-production-v204.js";') >= 0);
  assert.ok(entry.indexOf('import "./studio-production-v205.js";') > entry.indexOf('import "./studio-production-v204.js";'));
  assert.ok(chain.indexOf('patch-production-v205.mjs') > chain.indexOf('patch-production-v204.mjs'));
  hasAll(runtime, [RELEASE, "normalizeThemeActions", "normalizeLogoState", "normalizeThemeLayout", "normalizeNara", "normalizeCreateActions"]);
});

test("Theme Studio suppresses the three injected label spans and keeps one functional layout action", () => {
  hasAll(css, [".v199-button-label,.v201-button-label,.v202-button-label", 'button[data-v202-theme-action="layout"]', "display:none!important"]);
  hasAll(runtime, ["dataset.v205Duplicate", "data-v205-duplicate", "layout", "code", "customize", "site"]);
  hasAll(theme, ['setModal("code")', "saveThemeCode", "CodeEditor", "openSite"]);
});

test("mobile Theme map preserves left-right meaning and has content-derived height", () => {
  hasAll(css, [
    '"top-left-1 top-right-1"',
    '"sidebar-left-1 sidebar-right-1"',
    '"content-main content-main"',
    '"bottom-left-1 bottom-right-1"',
    "height:auto!important",
    "min-height:0!important",
    ".tn-layout-slot-v170.content-main",
    "min-height:126px!important",
  ]);
  assert.ok(!css.includes("min-height:920px"));
  assert.ok(!css.includes("height:920px"));
  assert.ok(runtime.includes("paired-mobile-map"));
});

test("Theme code editor keeps desktop split and mobile vertical workspaces", () => {
  hasAll(css, [
    "@media (min-width:1025px)",
    "grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important",
    "@media (max-width:1024px)",
    "grid-template-rows:minmax(360px,46dvh) minmax(360px,46dvh)!important",
    "ui-monospace",
  ]);
});

test("n logo has deterministic closed and open colors", () => {
  hasAll(css, [
    '.sn-sidebar-toggle[aria-expanded="false"] .sn-mobile-menu-mark',
    "linear-gradient(145deg,#2d73e6,#5149dc)",
    "-webkit-text-fill-color:#fff!important",
    '.sn-sidebar-toggle[aria-expanded="true"] .sn-mobile-menu-mark',
    "background:#fff!important",
    "-webkit-text-fill-color:#2869df!important",
  ]);
  hasAll(runtime, ["closed-white-on-blue", "open-blue-on-white", "drawer-blue-on-white"]);
});

test("Nara keeps Camera Foto File inside plus and hides v202 direct duplicates", () => {
  hasAll(nara, ["nara-attachment-menu-wrap", "nara-attachment-menu", "Kamera", "Foto", "File teks"]);
  hasAll(css, [
    ".nara-direct-attachments-v202,.nara-mobile-direct-tools-v199",
    "grid-template-columns:32px 32px minmax(62px,.82fr) minmax(78px,1fr) 34px!important",
    ".nara-select.intelligence",
    ".nara-select.model",
    "animation:none!important",
    "transition:none!important",
  ]);
  hasAll(runtime, ["plus-menu-compact-model-intelligence", "Tambah kamera, foto, atau file"]);
});

test("Posts and Pages retain a real create action on mobile", () => {
  hasAll(css, [".sc161-content-page>.sn-page-title>.sn-primary", ".sn-view-pad>.sn-page-title>.sn-primary", "pointer-events:auto!important"]);
  assert.ok(runtime.includes("normalizeCreateActions"));
});

test("stale OAuth state replay cannot replace an already valid persisted session", () => {
  hasAll(callback, [
    "AUTH_CALLBACK_REPLAY_RECOVERY_V205",
    "recoverExistingSessionFromReplay",
    "recovered-provider-state-replay",
    "providerStateReplayRecovered",
    "OAuth state not found or expired",
  ]);
  assert.match(supabase, /persistSession: true/);
  assert.match(supabase, /autoRefreshToken: true/);
  assert.doesNotMatch(callback, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
});

test("v205 service-worker patch rotates cache without forced navigation or logout", () => {
  hasAll(patch, [
    "ngeblogging-app-v205-theme-mobile-controls-20260802",
    "theme-mobile-controls-cache-v205",
    "theme-mobile-controls-v205",
    "NGE_BLOGGING_UPDATE_AVAILABLE_V205",
    "studio-production-v204-20260802",
  ]);
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("release records observed evidence without claiming untested providers or mass capacity", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.repairs.themeLayoutDuplicateLabelsSuppressed, true);
  assert.equal(release.repairs.layoutMapPairedLeftRightOnMobile, true);
  assert.equal(release.repairs.naraCameraPhotoFileInsidePlusMenuPreserved, true);
  assert.equal(release.repairs.oauthExpiredStateReplayRecoversValidSession, true);
  assert.equal(release.authentication.googlePkceTokenStatusObserved, 200);
  assert.equal(release.authentication.postLoginUserStatusObserved, 200);
  assert.equal(release.validation.googleLoginEndToEndObservedInProductionLogs, true);
  assert.equal(release.validation.googleLoginEndToEndClaimed, false);
  assert.equal(release.validation.linkedinLoginEndToEndClaimed, false);
  assert.equal(release.validation.emailPasswordEndToEndClaimed, false);
  assert.equal(release.validation.nineHundredMillionUserCapacityClaimed, false);
  assert.equal(release.validation.massLoginLoadTestPerformed, false);
  assert.equal(release.validation.realDeviceRequiredBeforeHundredPercentClaim, true);
});
