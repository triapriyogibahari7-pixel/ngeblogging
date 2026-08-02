import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v205-hotfix.js");
const css = read("src/studio-production-v205-hotfix.css");
const callback = read("src/lib/auth-callback-v162.js");
const supabase = read("src/lib/supabase.js");
const nara = read("src/NaraAssistant.jsx");
const patch = read("scripts/patch-production-v205-hotfix.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");
const release = JSON.parse(read("public/release-v205.json"));

const HOTFIX = "studio-production-v205-hotfix-logo-auth-20260802";

test("v205.1 loads after validated v205 and build chain applies it last", () => {
  const baseRuntime = entry.indexOf('import "./studio-production-v205.js";');
  const hotfixRuntime = entry.indexOf('import "./studio-production-v205-hotfix.js";');
  assert.ok(baseRuntime >= 0);
  assert.ok(hotfixRuntime > baseRuntime);
  assert.ok(chain.indexOf('patch-production-v205-hotfix.mjs') > chain.indexOf('patch-production-v205.mjs'));
  assert.match(runtime, /studio-production-v205-hotfix-logo-auth-20260802/);
});

test("mobile n has separate deterministic colors for closed and open drawer", () => {
  assert.match(css, /\.sn-sidebar-toggle\[aria-expanded="false"\] \.sn-mobile-menu-mark[\s\S]*linear-gradient\(145deg,#2f75e8,#4f46e5\)/);
  assert.match(css, /\.sn-sidebar-toggle\[aria-expanded="false"\] \.sn-mobile-menu-mark > strong[\s\S]*-webkit-text-fill-color: #fff/);
  assert.match(css, /\.sn-sidebar-toggle\[aria-expanded="true"\] \.sn-mobile-menu-mark[\s\S]*background: #fff/);
  assert.match(css, /\.sn-sidebar-toggle\[aria-expanded="true"\] \.sn-mobile-menu-mark > strong[\s\S]*-webkit-text-fill-color: #2869df/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open \.sn-logo-mark > strong[\s\S]*#2869df/);
  assert.match(runtime, /toggle\.setAttribute\("aria-expanded", String\(open\)\)/);
  assert.match(runtime, /open-blue-on-white/);
  assert.match(runtime, /closed-white-on-blue/);
});

test("Theme layout and code controls cannot remain hidden inert or unclickable", () => {
  assert.match(runtime, /function ensureThemeActions/);
  assert.match(runtime, /layout\.hidden = false/);
  assert.match(runtime, /layout\.disabled = false/);
  assert.match(runtime, /layout\.removeAttribute\("inert"\)/);
  assert.match(runtime, /layout\.removeAttribute\("aria-hidden"\)/);
  assert.match(runtime, /layout\.scrollIntoView|target\.scrollIntoView/);
  assert.match(runtime, /code\.hidden = false/);
  assert.match(runtime, /code\.disabled = false/);
  assert.match(css, /data-v205-hotfix-theme-action[\s\S]*pointer-events: auto !important/);
  assert.match(css, /\.tn-code-workspace[\s\S]*pointer-events: auto !important/);
});

test("Nara keeps Camera Foto File inside + and compact controls do not blink", () => {
  for (const marker of ["nara-attachment-menu-wrap", "Kamera", "Foto", "File teks"]) {
    assert.ok(nara.includes(marker), `native Nara attachment missing ${marker}`);
  }
  assert.match(css, /\.nara-direct-attachments-v202,\.nara-mobile-direct-tools-v199[\s\S]*display: none !important/);
  assert.match(css, /grid-template-columns: 34px 34px minmax\(62px,\.74fr\) minmax\(78px,\.96fr\) 38px !important/);
  assert.match(css, /\.nara-select > span[\s\S]*text-overflow: ellipsis !important/);
  assert.match(css, /\.nara-select[\s\S]*animation: none !important/);
  assert.match(css, /\.nara-select[\s\S]*transition: none !important/);
  assert.match(runtime, /Tambah kamera, foto, atau file/);
});

test("stale OAuth callback replay keeps an already valid persisted session", () => {
  assert.match(callback, /AUTH_CALLBACK_REPLAY_RECOVERY_V205/);
  assert.match(callback, /recoverExistingSessionFromReplay/);
  assert.match(callback, /recovered-provider-state-replay/);
  assert.match(callback, /providerStateReplayRecovered: true/);
  assert.match(callback, /isConsumedCodeError\(oauthError\)/);
  assert.equal((callback.match(/exchangeCodeForSession\(code\)/g) || []).length, 1);
  assert.doesNotMatch(callback, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
  assert.match(supabase, /persistSession: true/);
  assert.match(supabase, /autoRefreshToken: true/);
});

test("v205.1 rotates service-worker cache without forced navigation or session destruction", () => {
  for (const marker of [
    "ngeblogging-app-v205-hotfix-logo-auth-20260802",
    "v205-hotfix-logo-auth-cache",
    "v205-hotfix-logo-auth",
    "studio-production-v205-20260802",
    "ngeblogging-app-v205-theme-nara-auth-mobile-20260802",
    "theme-nara-auth-mobile-cache-v205",
  ]) assert.ok(patch.includes(marker), `hotfix patch missing ${marker}`);
  assert.match(patch, /NGE_BLOGGING_UPDATE_AVAILABLE_V205_HOTFIX/);
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("release stays v205 for production gate and records only supported evidence", () => {
  assert.equal(release.release, "studio-production-v205-20260802");
  assert.equal(release.hotfix, HOTFIX);
  assert.equal(release.repairs.mobileNLogoClosedWhiteOnBlue, true);
  assert.equal(release.repairs.mobileNLogoOpenBlueOnWhite, true);
  assert.equal(release.repairs.themeLayoutAndCodeActionsForceClickable, true);
  assert.equal(release.repairs.oauthExpiredStateReplayKeepsValidSession, true);
  assert.equal(release.productionEvidence.googlePkceToken200ObservedOn20260802, true);
  assert.equal(release.validation.googleLoginEndToEndClaimed, false);
  assert.equal(release.validation.linkedinLoginEndToEndClaimed, false);
  assert.equal(release.validation.emailPasswordEndToEndClaimed, false);
  assert.equal(release.validation.nineHundredMillionUserCapacityClaimed, false);
  assert.equal(release.validation.realDeviceRequiredBeforeHundredPercentClaim, true);
});
