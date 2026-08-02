import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v204.js");
const css = read("src/studio-production-v204.css");
const runtime205 = read("src/studio-production-v205.js");
const css205 = read("src/studio-production-v205.css");
const shellController = read("src/studio-shell-controller-v147.js");
const accountRuntime = read("src/studio-production-mobile-v189.js");
const patch = read("scripts/patch-production-v204.mjs");
const patch205 = read("scripts/patch-production-v205.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");
const supabase = read("src/lib/supabase.js");
const session = read("src/lib/auth-session-v76.js");
const nara = read("src/NaraAssistant.jsx");
const theme = read("src/ThemeStudio.jsx");
const release = JSON.parse(read("public/release-v204.json"));
const release205 = JSON.parse(read("public/release-v205.json"));

const RELEASE = "studio-production-v204-20260802";
const RELEASE205 = "studio-production-v205-20260802";

test("v204 remains directly after v203 and v205 is the final screenshot authority", () => {
  const v203 = entry.indexOf('import "./studio-production-v203.js";');
  const v204 = entry.indexOf('import "./studio-production-v204.js";');
  const v205 = entry.indexOf('import "./studio-production-v205.js";');
  assert.ok(v203 >= 0);
  assert.ok(v204 > v203);
  assert.ok(v205 > v204);
  assert.ok(chain.indexOf('patch-production-v203.mjs') < chain.indexOf('patch-production-v204.mjs'));
  assert.ok(chain.indexOf('patch-production-v204.mjs') < chain.indexOf('patch-production-v205.mjs'));
  assert.match(runtime, /studio-production-v204-20260802/);
  assert.match(runtime205, /studio-production-v205-20260802/);
});

test("physical mobile topbar always reserves left logo, middle workspace and right profile", () => {
  assert.match(css, /\.sn-shell > \.sn-main > \.sn-top[\s\S]*grid-template-columns: 52px minmax\(0,1fr\) 44px !important/);
  assert.match(css, /\.sn-shell \.sn-sidebar-toggle[\s\S]*grid-column: 1 !important/);
  assert.match(css, /\.sn-shell \.sn-workspace[\s\S]*grid-column: 2 !important/);
  assert.match(css, /\.sn-shell \.sn-top-actions[\s\S]*grid-column: 3 !important/);
  assert.match(css, /\.sn-shell \.sn-top-actions > \.sn-avatar[\s\S]*display: grid !important/);
  assert.match(runtime, /normalizeTopbar/);
  assert.match(runtime, /avatar\.setAttribute\("aria-haspopup", "menu"\)/);
});

test("mobile profile menu keeps Profile Settings and Logout and stays inside viewport", () => {
  for (const action of ["profile", "settings", "logout"]) assert.ok(shellController.includes(`data-action="${action}"`), `profile menu action missing ${action}`);
  assert.match(accountRuntime, /studioAccountViewV189 = profileButton \? "profile" : "settings"/);
  assert.match(css, /\.sn-profile-menu-v147/);
  assert.match(css, /width: min\(260px,calc\(100vw - 20px\)\) !important/);
  assert.match(css, /max-height: min\(430px,calc\(100dvh - 82px\)\) !important/);
  assert.match(runtime, /normalizeProfileMenu/);
});

test("desktop sidebar edge toggle is suppressed on physical phones because n owns drawer toggle", () => {
  assert.match(css, /\.sn-sidebar-edge-toggle-v147[\s\S]*display: none !important/);
});

test("retained valid login is clearly separated from a Studio data synchronization failure", () => {
  assert.match(runtime, /verifiedUserKnown/);
  assert.match(runtime, /Sinkronisasi data belum selesai\./);
  assert.match(runtime, /LOGIN AKTIF · MENYAMBUNGKAN DATA STUDIO/);
  assert.match(runtime, /Sesi login masih aktif\. Gangguan ini berada pada sinkronisasi data ruang kerja/);
  assert.match(runtime, /retryStartupWhenOnline/);
  assert.match(runtime, /now - lastOnlineRetry < 5_000/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
});

test("auth transport still persists and transient failures retain local verified session", () => {
  assert.match(supabase, /persistSession: true/);
  assert.match(supabase, /autoRefreshToken: true/);
  assert.match(session, /retainSessionDuringNetworkFailure/);
  assert.match(session, /Sesi lokal dipertahankan selama layanan autentikasi belum dapat dijangkau/);
  assert.match(session, /if \(!force && window\.__ngebloggingVerifiedSession\?\.session\?\.access_token\)/);
});

test("v205 renders one Theme layout label and keeps real layout/code controls functional", () => {
  for (const oldLabel of [".v199-button-label", ".v201-button-label", ".v202-button-label"]) assert.ok(css205.includes(oldLabel), `missing hidden legacy label ${oldLabel}`);
  assert.match(css205, /button\[data-v202-theme-action="layout"\][\s\S]*display\s*:\s*none\s*!important/);
  assert.match(runtime205, /normalizeThemeActions/);
  assert.match(runtime205, /dataset\.v205Duplicate/);
  assert.match(theme, /setModal\("code"\)/);
  assert.match(theme, /saveThemeCode/);
  assert.match(theme, /CodeEditor/);
  assert.match(patch205, /tn-layout-canvas-v170/);
});

test("v205 mobile layout map keeps paired left/right areas and removes fixed giant height", () => {
  for (const row of ['"top-left-1 top-right-1"','"sidebar-left-1 sidebar-right-1"','"bottom-left-1 bottom-right-1"']) {
    assert.ok(css205.includes(row), `missing paired mobile layout row ${row}`);
  }
  assert.match(css205, /\.tn-layout-canvas-v170[\s\S]*height\s*:\s*auto\s*!important[\s\S]*min-height\s*:\s*0\s*!important/);
  assert.match(css205, /\.tn-layout-slot-v170\.content-main[\s\S]*min-height\s*:\s*126px\s*!important/);
  assert.match(runtime205, /paired-mobile-map/);
});

test("v205 logo has deterministic closed/open colors and stays centered", () => {
  assert.match(css205, /\.sn-sidebar-toggle\[aria-expanded="false"\][\s\S]*background\s*:\s*linear-gradient\(145deg,#2d73e6,#5149dc\)/);
  assert.match(css205, /\.sn-sidebar-toggle\[aria-expanded="false"\][\s\S]*-webkit-text-fill-color\s*:\s*#fff/);
  assert.match(css205, /\.sn-sidebar-toggle\[aria-expanded="true"\][\s\S]*background\s*:\s*#fff\s*!important/);
  assert.match(css205, /\.sn-sidebar-toggle\[aria-expanded="true"\][\s\S]*-webkit-text-fill-color\s*:\s*#2869df/);
  assert.match(runtime205, /closed-white-on-blue/);
  assert.match(runtime205, /open-blue-on-white/);
});

test("v205 keeps Camera Photo File inside plus menu and removes external duplicate controls from final UI", () => {
  for (const label of ["Kamera", "Foto", "File teks"]) assert.ok(nara.includes(label), `Nara + menu missing ${label}`);
  assert.match(nara, /nara-attachment-menu-wrap/);
  assert.match(nara, /nara-attachment-menu/);
  assert.match(css205, /\.nara-direct-attachments-v202[\s\S]*display\s*:\s*none\s*!important/);
  assert.match(css205, /grid-template-columns\s*:\s*32px 32px minmax\(62px,\.82fr\) minmax\(78px,1fr\) 34px\s*!important/);
  assert.match(css205, /\.nara-select[\s\S]*animation\s*:\s*none\s*!important[\s\S]*transition\s*:\s*none\s*!important/);
  assert.match(runtime205, /plus-menu-compact-model-intelligence/);
});

test("v205 keeps Posts and Pages create actions visible on mobile", () => {
  assert.match(css205, /\.sc161-content-page\s*>\s*\.sn-page-title\s*>\s*\.sn-primary/);
  assert.match(css205, /\.sn-view-pad\s*>\s*\.sn-page-title\s*>\s*\.sn-primary/);
  assert.match(runtime205, /normalizeCreateActions/);
});

test("v204 rotates only the active v203 update event and v205 rotates only active v204 event", () => {
  assert.match(patch, /replaceAll\("NGE_BLOGGING_UPDATE_AVAILABLE_V203", "NGE_BLOGGING_UPDATE_AVAILABLE_V204"\)/);
  assert.doesNotMatch(patch, /NGE_BLOGGING_FORCE_RELOAD_V\\d\+/);
  assert.match(patch205, /replaceAll\("NGE_BLOGGING_UPDATE_AVAILABLE_V204", "NGE_BLOGGING_UPDATE_AVAILABLE_V205"\)/);
  for (const marker of [
    "ngeblogging-app-v205-theme-mobile-controls-20260802","theme-mobile-controls-cache-v205","theme-mobile-controls-v205",
    "ngeblogging-app-v204-topbar-session-20260802","topbar-session-cache-v204",
  ]) assert.ok(patch205.includes(marker), `v205 patch marker missing ${marker}`);
  assert.doesNotMatch(patch205, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("release claims remain factual", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.repairs.mobileProfileAlwaysVisible, true);
  assert.equal(release.repairs.profileMenuKeepsProfileSettingsLogout, true);
  assert.equal(release.repairs.retainedSessionDataErrorClarified, true);
  assert.equal(release.authenticationEvidence.googlePkceSuccessObservedInProductionLogs, true);
  assert.equal(release.validation.googleLoginEndToEndClaimed, false);
  assert.equal(release.validation.linkedinLoginEndToEndClaimed, false);
  assert.equal(release.validation.emailPasswordEndToEndClaimed, false);
  assert.equal(release.validation.nineHundredMillionUserCapacityClaimed, false);
  assert.equal(release.validation.realDeviceRequiredBeforeHundredPercentClaim, true);

  assert.equal(release205.release, RELEASE205);
  assert.equal(release205.repairs.themeLayoutDuplicateLabelsSuppressed, true);
  assert.equal(release205.repairs.layoutMapPairedLeftRightOnMobile, true);
  assert.equal(release205.repairs.naraCameraPhotoFileInsidePlusMenuPreserved, true);
  assert.equal(release205.validation.googleLoginEndToEndClaimed, false);
  assert.equal(release205.validation.linkedinLoginEndToEndClaimed, false);
  assert.equal(release205.validation.emailPasswordEndToEndClaimed, false);
  assert.equal(release205.validation.nineHundredMillionUserCapacityClaimed, false);
  assert.equal(release205.validation.realDeviceRequiredBeforeHundredPercentClaim, true);
});
