import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v206.js");
const css = read("src/studio-production-v206.css");
const theme = read("src/ThemeStudio.jsx");
const nara = read("src/NaraAssistant.jsx");
const chain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-production-v206.mjs");
const supabase = read("src/lib/supabase.js");
const release = JSON.parse(read("public/release-v206.json"));
const RELEASE = "studio-production-v206-20260802";

test("v206 loads and patches after validated v205.1", () => {
  const hotfix = entry.indexOf('import "./studio-production-v205-hotfix.js";');
  const v206 = entry.indexOf('import "./studio-production-v206.js";');
  assert.ok(hotfix >= 0);
  assert.ok(v206 > hotfix);
  assert.ok(chain.indexOf('patch-production-v206.mjs') > chain.indexOf('patch-production-v205-hotfix.mjs'));
  assert.match(runtime, /studio-production-v206-20260802/);
});

test("Theme hero has one native layout action and one native code action", () => {
  assert.match(theme, /data-v202-theme-action="layout" data-v206-theme-action="layout"/);
  assert.match(theme, /data-v206-theme-action="code"/);
  const start = theme.indexOf('<div className="tn-hero-actions">');
  const end = theme.indexOf('</div><div className="tn-trust">', start);
  const hero = theme.slice(start, end);
  assert.equal((hero.match(/data-v206-theme-action="layout"/g) || []).length, 1);
  assert.equal((hero.match(/data-v206-theme-action="code"/g) || []).length, 1);
  assert.match(hero, /Edit Tata Letak/);
  assert.match(hero, /Edit Kode/);
  assert.doesNotMatch(hero, /\{WIDGET_COUNT\} Widget/);
  assert.match(theme, /<LayoutMap widgets=\{themeState\.widgets\}/);
});

test("historical Theme labels cannot paint duplicate layout text", () => {
  assert.match(css, /data-v206-theme-action="layout"[\s\S]*font-size:0!important/);
  assert.match(css, /data-v206-theme-action="layout"[\s\S]*> span[\s\S]*display:none!important/);
  assert.match(css, /content:"Edit Tata Letak"!important/);
});

test("HTML CSS JavaScript editor and live preview remain real controls", () => {
  assert.match(theme, /const tabs = \[\{ id:"html",label:"HTML"/);
  assert.match(theme, /\{ id:"css",label:"CSS"/);
  assert.match(theme, /\{ id:"javascript",label:"JavaScript"/);
  assert.match(theme, /saveThemeCode\(themeState,codeDraft\)/);
  assert.match(css, /\.tn-code-workspace[\s\S]*grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css, /\.tn-code-pane textarea[\s\S]*ui-monospace/);
});

test("mobile n is white centered on blue for both drawer states", () => {
  assert.match(css, /data-studio-v205-hotfix="true"[\s\S]*aria-expanded="true"[\s\S]*linear-gradient\(145deg,#2f75e8,#4f46e5\)!important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open \.sn-logo-mark > strong[\s\S]*-webkit-text-fill-color:#fff!important/);
  assert.match(runtime, /toggle\.setAttribute\("aria-expanded", String\(open\)\)/);
});

test("Nara handheld header is two clean rows and controls cannot blink", () => {
  assert.ok(css.includes('grid-template-areas:"orb brand voice close" "sizes sizes sizes reset"!important'));
  assert.match(css, /\.nara-size-controls-v147[\s\S]*grid-template-columns:repeat\(3,36px\)!important/);
  assert.match(css, /\.nara-floating-button > :is\(b,small\)[\s\S]*display:none!important/);
  assert.match(css, /\.nara-assistant-shell button,.nara-select,.nara-select \*[\s\S]*animation:none!important/);
});

test("Nara keeps camera photo file inside plus and bounds model/intelligence width", () => {
  for (const marker of ["nara-attachment-menu-wrap", "Kamera", "Foto", "File teks"]) assert.ok(nara.includes(marker), marker);
  assert.match(css, /nara-direct-attachments-v202,.nara-mobile-direct-tools-v199[\s\S]*display:none!important/);
  assert.match(css, /grid-template-columns:36px 36px minmax\(72px,84px\) minmax\(92px,108px\) 38px!important/);
  assert.match(css, /\.nara-select\.intelligence \{ max-width:84px!important; \}/);
  assert.match(css, /\.nara-select\.model \{ max-width:108px!important; \}/);
});

test("Nara close releases voice resources and small medium remain non-modal", () => {
  assert.match(nara, /nara-close-stops-media-v206/);
  assert.match(nara, /recognition\.current\?\.stop\?\.\(\)/);
  assert.match(nara, /recognition\.current = null/);
  assert.match(nara, /setListening\(false\)/);
  assert.match(runtime, /layer\.dataset\.v206Mode = full \? "modal" : "nonmodal"/);
  assert.match(css, /data-v206-mode="nonmodal"[\s\S]*pointer-events:none!important/);
});

test("verified session recovery reads only real Supabase RLS membership rows", () => {
  assert.match(runtime, /async function fetchMembershipDirect/);
  assert.match(runtime, /\/rest\/v1\/site_members/);
  assert.match(runtime, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(runtime, /studioRecoveryV206 = site \? "real-site" : "real-empty-membership"/);
  assert.match(runtime, /recoveryAttempts >= 2/);
  assert.doesNotMatch(runtime, /createUserSite|getOrCreatePrimarySite/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
});

test("session persistence and v206 cache rotation remain non-destructive", () => {
  assert.match(supabase, /persistSession: true/);
  assert.match(supabase, /autoRefreshToken: true/);
  for (const marker of [
    "ngeblogging-app-v206-native-theme-nara-session-20260802",
    "native-theme-nara-session-cache-v206",
    "native-theme-nara-session-v206",
    "studio-production-v205-hotfix-logo-auth-20260802",
    "ngeblogging-app-v205-hotfix-logo-auth-20260802",
  ]) assert.ok(patch.includes(marker), marker);
  assert.doesNotMatch(patch, /NGE_BLOGGING_FORCE_RELOAD_V\d+/);
});

test("release does not claim unverified providers devices or mass capacity", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.repairs.themeLayoutActionNative, true);
  assert.equal(release.repairs.mobileNLogoWhiteOnBlueOpen, true);
  assert.equal(release.repairs.naraHeaderTwoRowsOnHandheld, true);
  assert.equal(release.repairs.studioDirectMembershipRecovery, true);
  assert.equal(release.validation.googleLoginEndToEndClaimed, false);
  assert.equal(release.validation.linkedinLoginEndToEndClaimed, false);
  assert.equal(release.validation.emailPasswordEndToEndClaimed, false);
  assert.equal(release.validation.nineHundredMillionUserCapacityClaimed, false);
  assert.equal(release.validation.realDeviceRequiredBeforeHundredPercentClaim, true);
});
