import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v204.js");
const css = read("src/studio-production-v204.css");
const shellController = read("src/studio-shell-controller-v147.js");
const accountRuntime = read("src/studio-production-mobile-v189.js");
const patch = read("scripts/patch-production-v204.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");
const supabase = read("src/lib/supabase.js");
const session = read("src/lib/auth-session-v76.js");
const release = JSON.parse(read("public/release-v204.json"));

const RELEASE = "studio-production-v204-20260802";

test("v204 is the final UI authority after v203 and is chained after v203 patch", () => {
  const v203 = entry.indexOf('import "./studio-production-v203.js";');
  const v204 = entry.indexOf('import "./studio-production-v204.js";');
  assert.ok(v203 >= 0);
  assert.ok(v204 > v203);
  assert.ok(chain.indexOf('patch-production-v203.mjs') < chain.indexOf('patch-production-v204.mjs'));
  assert.match(runtime, /studio-production-v204-20260802/);
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
  for (const action of ["profile", "settings", "logout"]) {
    assert.ok(shellController.includes(`data-action="${action}"`), `profile menu action missing ${action}`);
  }
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

test("v204 rotates only the active v203 update event and preserves historical compatibility evidence", () => {
  assert.match(patch, /replaceAll\("NGE_BLOGGING_UPDATE_AVAILABLE_V203", "NGE_BLOGGING_UPDATE_AVAILABLE_V204"\)/);
  assert.doesNotMatch(patch, /NGE_BLOGGING_FORCE_RELOAD_V\\d\+/);
  for (const marker of [
    "ngeblogging-app-v204-topbar-session-20260802",
    "topbar-session-cache-v204",
    "topbar-session-v204",
    "ngeblogging-app-v203-mobile-reflow-20260802",
    "mobile-reflow-cache-v203",
  ]) assert.ok(patch.includes(marker), `v204 patch marker missing ${marker}`);
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
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
});