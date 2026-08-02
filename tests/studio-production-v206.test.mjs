import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v206.js");
const css = read("src/studio-production-v206.css");
const theme = read("src/ThemeStudio.jsx");
const nara = read("src/NaraAssistant.jsx");
const patch = read("scripts/patch-production-v206.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");
const supabase = read("src/lib/supabase.js");
const release = JSON.parse(read("public/release-v206.json"));

const RELEASE = "studio-production-v206-20260802";

test("v206 loads after v205 and is the final build patch authority", () => {
  const v205 = entry.indexOf('import "./studio-production-v205.js";');
  const v206 = entry.indexOf('import "./studio-production-v206.js";');
  assert.ok(v205 >= 0);
  assert.ok(v206 > v205);
  assert.ok(chain.indexOf('patch-production-v205.mjs') < chain.indexOf('patch-production-v206.mjs'));
  assert.match(runtime, /studio-production-v206-20260802/);
});

test("Theme Studio owns one native layout action and one native code action", () => {
  assert.match(theme, /data-v202-theme-action="layout" data-v206-theme-action="layout"/);
  assert.match(theme, /data-v206-theme-action="code"/);
  const heroStart = theme.indexOf('<div className="tn-hero-actions">');
  const heroEnd = theme.indexOf('</div><div className="tn-trust">', heroStart);
  const hero = theme.slice(heroStart, heroEnd);
  assert.equal((hero.match(/data-v206-theme-action="layout"/g) || []).length, 1);
  assert.equal((hero.match(/data-v206-theme-action="code"/g) || []).length, 1);
  assert.match(hero, /Edit Tata Letak/);
  assert.match(hero, /Edit Kode/);
  assert.doesNotMatch(hero, /\{WIDGET_COUNT\} Widget/);
  assert.match(theme, /<LayoutMap widgets=\{themeState\.widgets\}/);
});

test("compatibility labels cannot paint duplicate Edit Tata Letak text", () => {
  assert.match(css, /data-v206-theme-action="layout"[\s\S]*font-size: 0 !important/);
  assert.match(css, /data-v206-theme-action="layout"[\s\S]*> span[\s\S]*display: none !important/);
  assert.match(css, /content: "Edit Tata Letak" !important/);
  assert.match(css, /\.tn-hero-actions[\s\S]*grid-template-columns: repeat\(2,minmax\(0,1fr\)\) !important/);
});

test("real HTML CSS JavaScript editor remains functional and vertically contained on handhelds", () => {
  assert.match(theme, /const tabs = \[\{ id:"html",label:"HTML"/);
  assert.match(theme, /\{ id:"css",label:"CSS"/);
  assert.match(theme, /\{ id:"javascript",label:"JavaScript"/);
  assert.match(theme, /onChange=\{\(event\) => onChange\(\{ \.\.\.value, \[tab\]: event\.target\.value \}\)\}/);
  assert.match(theme, /saveThemeCode\(themeState,codeDraft\)/);
  assert.match(css, /\.tn-code-workspace[\s\S]*grid-template-columns: minmax\(0,1fr\) !important/);
  assert.match(css, /\.tn-code-pane textarea[\s\S]*ui-monospace/);
});

test("Nara mobile header is exactly two rows with stable size voice reset and close controls", () => {
  assert.ok(css.includes('"orb brand voice close"'));
  assert.ok(css.includes('"sizes sizes sizes reset"'));
  assert.match(css, /\.nara-size-controls-v147[\s\S]*grid-template-columns: repeat\(3,36px\) !important/);
  assert.match(css, /button\[title="Percakapan baru"\][\s\S]*grid-area: reset !important/);
  assert.match(css, /button\[title="Tutup"\][\s\S]*grid-area: close !important/);
  assert.match(css, /\.nara-floating-button > :is\(b,small\)[\s\S]*display: none !important/);
});

test("Nara keeps camera photo file in plus menu and bounds model/intelligence controls", () => {
  assert.match(nara, /nara-attachment-menu-wrap/);
  assert.match(nara, /Tambahkan lampiran/);
  assert.match(nara, /<b>Kamera<\/b>/);
  assert.match(nara, /<b>Foto<\/b>/);
  assert.match(nara, /<b>File teks<\/b>/);
  assert.match(css, /nara-mobile-direct-tools-v199,.nara-direct-attachments-v202/);
  assert.match(css, /\.nara-select\.intelligence \{ max-width: 84px !important; \}/);
  assert.match(css, /\.nara-select\.model \{ max-width: 108px !important; \}/);
  assert.match(css, /grid-template-columns: 36px 36px minmax\(72px,84px\) minmax\(92px,108px\) 38px !important/);
});

test("closing Nara releases microphone and speech and only full mode is modal", () => {
  assert.match(nara, /nara-close-stops-media-v206/);
  assert.match(nara, /recognition\.current\?\.stop\?\.\(\)/);
  assert.match(nara, /recognition\.current = null/);
  assert.match(nara, /setListening\(false\)/);
  assert.match(nara, /aria-modal=\{size === "full"\}/);
  assert.match(runtime, /layer\.dataset\.v206Mode = full \? "modal" : "nonmodal"/);
  assert.match(css, /data-v206-mode="nonmodal"[\s\S]*pointer-events: none !important/);
});

test("verified Studio startup recovers only real RLS membership data and never fabricates a site", () => {
  assert.match(runtime, /async function directMembership/);
  assert.match(runtime, /\/rest\/v1\/site_members/);
  assert.match(runtime, /Authorization: `Bearer \$\{accessToken\}`/);
  assert.match(runtime, /studioRecoveryV206 = site \? "real-site-recovered" : "real-empty-membership"/);
  assert.match(runtime, /SNAPSHOT_KEYS/);
  assert.match(runtime, /ngeblogging-active-site-snapshot-v195/);
  assert.match(runtime, /recoveryAttempts >= 2/);
  assert.doesNotMatch(runtime, /createUserSite|getOrCreatePrimarySite/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
});

test("session persistence and v206 service worker rotation are guarded", () => {
  assert.match(supabase, /persistSession: true/);
  assert.match(supabase, /autoRefreshToken: true/);
  for (const marker of [
    "ngeblogging-app-v206-native-theme-nara-session-20260802",
    "native-theme-nara-session-cache-v206",
    "native-theme-nara-session-v206",
    "studio-production-v206-20260802",
    "ngeblogging-app-v205-theme-nara-auth-mobile-20260802",
  ]) assert.ok(patch.includes(marker), marker);
  assert.doesNotMatch(patch, /NGE_BLOGGING_FORCE_RELOAD_V\d+/);
});

test("v206 release is factual and keeps real-device and capacity claims explicit", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.repairs.themeLayoutActionNative, true);
  assert.equal(release.repairs.naraHeaderTwoRowsOnHandheld, true);
  assert.equal(release.repairs.studioMembershipDirectRlsRecovery, true);
  assert.equal(release.repairs.studioMembershipEmptyResultDoesNotCreateSite, true);
  assert.equal(release.validation.googleLoginEndToEndClaimed, false);
  assert.equal(release.validation.linkedinLoginEndToEndClaimed, false);
  assert.equal(release.validation.emailPasswordEndToEndClaimed, false);
  assert.equal(release.validation.nineHundredMillionUserCapacityClaimed, false);
  assert.equal(release.validation.realDeviceRequiredBeforeHundredPercentClaim, true);
});
