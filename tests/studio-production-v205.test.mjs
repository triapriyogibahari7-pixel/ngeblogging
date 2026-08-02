import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v205.js");
const css = read("src/studio-production-v205.css");
const nara = read("src/NaraAssistant.jsx");
const patch = read("scripts/patch-production-v205.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");
const supabase = read("src/lib/supabase.js");
const release = JSON.parse(read("public/release-v205.json"));

const RELEASE = "studio-production-v205-20260802";

test("v205 is loaded after v204 and chained after the v204 production patch", () => {
  const v204 = entry.indexOf('import "./studio-production-v204.js";');
  const v205 = entry.indexOf('import "./studio-production-v205.js";');
  assert.ok(v204 >= 0);
  assert.ok(v205 > v204);
  assert.ok(chain.indexOf('patch-production-v204.mjs') < chain.indexOf('patch-production-v205.mjs'));
  assert.match(runtime, /studio-production-v205-20260802/);
});

test("Theme Studio shows one layout label and four contained primary actions", () => {
  assert.match(css, /\.v199-button-label,\.v201-button-label,\.v202-button-label/);
  assert.match(css, /display: none !important/);
  assert.match(runtime, /data-v202-theme-action=\\"layout\\"/);
  assert.match(runtime, /v205ThemeAction = "layout"/);
  assert.match(runtime, /Edit Kode HTML CSS JavaScript/);
  assert.match(css, /\.tn-hero-actions[\s\S]*grid-template-columns: repeat\(2,minmax\(0,1fr\)\) !important/);
  assert.match(css, /\.tn-hero-actions > button[\s\S]*word-break: normal !important/);
});

test("physical phones keep a readable left-right layout map even under desktop-site viewport", () => {
  for (const marker of [
    "studioMobileV204", "studioMobileV203", "studioPhysicalMobileV193", "studioDesktopSitePhone",
    "navigator.userAgentData?.mobile", "physicalShortEdge",
  ]) assert.ok(runtime.includes(marker), `missing physical-mobile marker ${marker}`);
  assert.match(css, /data-studio-mobile-v205="true"[\s\S]*\.tn-layout-canvas-v170/);
  assert.match(css, /grid-template-columns: repeat\(2,minmax\(0,1fr\)\) !important/);
  for (const area of [
    '"top-left-1 top-right-1"',
    '"sidebar-left-1 sidebar-right-1"',
    '"content-main content-main"',
    '"bottom-left-1 bottom-right-1"',
  ]) assert.ok(css.includes(area), `missing layout relation ${area}`);
  assert.match(css, /\.tn-layout-slot-v170 > small[\s\S]*font-size: 10px !important/);
});

test("theme code editor stacks code above live preview on physical mobile", () => {
  assert.match(css, /\.tn-code-workspace[\s\S]*grid-template-columns: minmax\(0,1fr\) !important/);
  assert.match(css, /grid-template-rows: minmax\(420px,52dvh\) minmax\(360px,48dvh\) !important/);
  assert.match(css, /\.tn-code-pane textarea[\s\S]*ui-monospace/);
  assert.match(css, /\.tn-code-pane textarea[\s\S]*white-space: pre !important/);
  assert.match(css, /\.tn-code-preview-pane \.tn-frame-shell[\s\S]*overflow: auto !important/);
});

test("Nara keeps camera photo and file inside native plus menu and removes visible duplicate row", () => {
  assert.match(nara, /nara-attachment-menu-wrap/);
  assert.match(nara, /Tambahkan lampiran/);
  assert.match(nara, /<Camera \/><span><b>Kamera<\/b>/);
  assert.match(nara, /<ImageIcon \/><span><b>Foto<\/b>/);
  assert.match(nara, /<File \/><span><b>File teks<\/b>/);
  assert.match(css, /\.nara-direct-attachments-v202,[\s\S]*display: none !important/);
  assert.match(css, /\.nara-composer-tools[\s\S]*grid-template-columns: 36px 36px minmax\(76px,.8fr\) minmax\(94px,1fr\) 40px !important/);
  assert.match(css, /\.nara-select > span[\s\S]*text-overflow: ellipsis !important/);
});

test("Nara small and medium stay non-modal and all unstable controls stop animating", () => {
  assert.match(runtime, /layer\.dataset\.v205Mode = full \? "modal" : "nonmodal"/);
  assert.match(runtime, /backdrop\.hidden = !full/);
  assert.match(css, /data-v205-mode="nonmodal"[\s\S]*pointer-events: none !important/);
  assert.match(css, /data-v205-mode="nonmodal"[\s\S]*nara-assistant-shell[\s\S]*pointer-events: auto !important/);
  assert.match(css, /\.nara-select,[\s\S]*animation: none !important/);
  assert.match(runtime, /Tutup Nara AI/);
});

test("mobile n logo remains white centered and drawer remains clickable without blur", () => {
  assert.match(css, /:is\(\.sn-mobile-menu-mark,\.sn-logo-mark\)[\s\S]*place-items: center !important/);
  assert.match(css, /:is\(\.sn-mobile-menu-mark,\.sn-logo-mark\) > strong[\s\S]*-webkit-text-fill-color: #fff !important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open[\s\S]*pointer-events: auto !important/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*background: transparent !important/);
  assert.match(runtime, /normalizeLogoAndDrawer/);
});

test("verified login is not presented as an authentication failure and retry is bounded", () => {
  assert.match(runtime, /verifiedUserKnown/);
  assert.match(runtime, /Login berhasil\. Data Studio sedang disinkronkan\./);
  assert.match(runtime, /SESI LOGIN AKTIF · SINKRONISASI RUANG KERJA/);
  assert.match(runtime, /startupAttempts < 2/);
  assert.match(runtime, /startupAttempts === 0 \? 900 : 2400/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
  assert.match(supabase, /persistSession: true/);
  assert.match(supabase, /autoRefreshToken: true/);
});

test("v205 rotates service worker cache while retaining v204 compatibility", () => {
  for (const marker of [
    "ngeblogging-app-v205-theme-nara-auth-mobile-20260802",
    "theme-nara-auth-mobile-cache-v205",
    "theme-nara-auth-mobile-v205",
    "studio-production-v205-20260802",
    "ngeblogging-app-v204-topbar-session-20260802",
    "topbar-session-cache-v204",
  ]) assert.ok(patch.includes(marker), `missing v205 SW marker ${marker}`);
  assert.match(patch, /replaceAll\("NGE_BLOGGING_UPDATE_AVAILABLE_V204", "NGE_BLOGGING_UPDATE_AVAILABLE_V205"\)/);
  assert.doesNotMatch(patch, /NGE_BLOGGING_FORCE_RELOAD_V\\d\+/);
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("release remains factual and does not claim unverified provider or mass capacity success", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.repairs.themeLayoutActionSingleVisibleLabel, true);
  assert.equal(release.repairs.naraCameraPhotoFileRemainInsidePlusMenu, true);
  assert.equal(release.repairs.verifiedSessionStartupRetryIsBounded, true);
  assert.equal(release.productionEvidence.googlePkceToken200ObservedOn20260802, true);
  assert.equal(release.validation.googleLoginEndToEndClaimed, false);
  assert.equal(release.validation.linkedinLoginEndToEndClaimed, false);
  assert.equal(release.validation.emailPasswordEndToEndClaimed, false);
  assert.equal(release.validation.nineHundredMillionUserCapacityClaimed, false);
  assert.equal(release.validation.realDeviceRequiredBeforeHundredPercentClaim, true);
});
