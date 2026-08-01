import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-real-device-v190.js");
const css = read("src/studio-real-device-v190.css");
const patch = read("scripts/patch-production-v190.mjs");
const finalizer = read("scripts/patch-production-v190-finalize.mjs");
const v189Patch = read("scripts/patch-production-mobile-v189.mjs");
const supabase = read("src/lib/supabase.js");
const onboarding = read("src/StudioOnboardingGate.jsx");
const fastGate = read("src/StudioFastGate.jsx");
const nara = read("src/NaraAssistant.jsx");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v190.json"));

const viewportMatrix = [
  "320x568", "360x640", "375x667", "390x844", "412x915", "430x932",
  "600x960", "768x1024", "820x1180", "1024x768", "1280x720", "1366x768",
  "1440x900", "1920x1080",
];

test("v190 is activated after v189 and chained into every production patch run", () => {
  assert.match(entry, /studio-real-device-v190\.js/);
  assert.ok(entry.indexOf("studio-production-mobile-v189-fix.css") < entry.indexOf("studio-real-device-v190.js"));
  assert.match(v189Patch, /patch-production-v190\.mjs/);
  assert.match(v189Patch, /patch-production-v190-finalize\.mjs/);
  assert.ok(v189Patch.indexOf("patch-production-v190.mjs") < v189Patch.indexOf("patch-production-v190-finalize.mjs"));
});

test("desktop-site phones use calibrated root geometry instead of an unverified fixed zoom", () => {
  assert.match(runtime, /resetLegacyViewportGeometry/);
  assert.match(runtime, /calibrateDesktopSite/);
  assert.match(runtime, /getBoundingClientRect\(\)\.width/);
  assert.match(runtime, /studioViewportCalibrationV190/);
  assert.match(runtime, /fallback-transform/);
  assert.doesNotMatch(runtime, /setImportant\(body, "width", `\$\{state\.physicalWidth\}px`/);
  assert.match(css, /overflow-x: clip/);
});

test("mobile drawer remains fully clickable without dark or blurred screen locking", () => {
  assert.match(css, /#ngeblogging-studio-sidebar[\s\S]*z-index: 2147483500/);
  assert.match(css, /#ngeblogging-studio-sidebar>nav[\s\S]*justify-content: safe center/);
  assert.match(css, /#ngeblogging-studio-sidebar>nav[\s\S]*overflow-y: auto/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*background: transparent !important/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*backdrop-filter: none !important/);
  assert.match(runtime, /sidebar\.querySelectorAll\("button,a,input,select,textarea"\)/);
  assert.match(runtime, /main\?\.removeAttribute\("inert"\)/);
});

test("n logo and Nara launcher are centered and launcher cannot blink", () => {
  assert.match(css, /\.sn-sidebar-toggle[\s\S]*place-items: center/);
  assert.match(css, /\.sn-mobile-menu-mark[\s\S]*place-items: center/);
  assert.match(css, /\.nara-floating-button[\s\S]*place-items: center/);
  assert.match(css, /\.nara-floating-button[\s\S]*animation: none !important/);
  assert.match(css, /\.nara-floating-button svg[\s\S]*transform: none !important/);
});

test("Members and Analytics operational controls cannot retain desktop absolute geometry on physical mobile", () => {
  assert.match(css, /\.op41-toolbar>\*/);
  assert.match(css, /\.op41-toolbar-actions>\*/);
  assert.match(css, /\.op41-active-site>\*/);
  assert.match(css, /\.op41-form>\*/);
  assert.match(css, /position: static !important/);
  assert.match(css, /\.op41-metrics[\s\S]*grid-template-columns: minmax\(0,1fr\)/);
  assert.match(css, /\.op41-table-wrap[\s\S]*overflow-x: auto/);
});

test("Nara small and medium remain non-modal, full remains modal, and close stops voice plus microphone", () => {
  assert.match(runtime, /layer\.dataset\.v190NaraMode = mode/);
  assert.match(css, /data-v190-nara-mode="nonmodal"[\s\S]*pointer-events: none/);
  assert.match(css, /data-v190-nara-mode="nonmodal"[\s\S]*nara-assistant-shell[\s\S]*pointer-events: auto/);
  assert.match(css, /data-nara-size="small"[\s\S]*58dvh/);
  assert.match(css, /data-nara-size="medium"[\s\S]*78dvh/);
  assert.match(nara, /aria-modal=\{size === "full"\}/);
  assert.match(nara, /recognition\.current\?\.stop\?\.\(\)/);
  assert.match(nara, /setListening\(false\)/);
  assert.match(nara, /stopSpeech\(\)/);
});

test("Studio data uses same-origin REST and Storage gateway before direct Supabase fallback", () => {
  assert.match(supabase, /DATA_TRANSPORT_RELEASE_V190/);
  assert.match(supabase, /DATA_GATEWAY_PREFIX/);
  assert.match(supabase, /\/rest\/v1\//);
  assert.match(supabase, /\/storage\/v1\//);
  assert.match(supabase, /proxiedDataUrlV190/);
  assert.match(supabase, /same-origin-data-gateway/);
  assert.match(supabase, /direct-supabase-fallback/);
  assert.match(patch, /x-ngeblogging-data-gateway/);
});

test("transient onboarding failure may only resume a cached workspace bound to the current user", () => {
  assert.match(onboarding, /ACTIVE_SITE_SNAPSHOT_V190/);
  assert.match(onboarding, /__ngebloggingUserId/);
  assert.match(onboarding, /cachedActiveSiteV190\(props\.user\.id\)/);
  assert.match(onboarding, /boundUserId === userId/);
  assert.match(fastGate, /ngeblogging-active-site-snapshot-v190/);
});

test("v190 service worker identity rotates without forced navigation or session destruction", () => {
  assert.match(worker, /ngeblogging-app-v190-real-device-20260801/);
  assert.match(worker, /real-device-cache-v190/);
  assert.match(worker, /REAL_DEVICE_RELEASE_V190/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(|signOut\s*\(/);
  assert.doesNotMatch(finalizer, /localStorage\.clear\s*\(|signOut\s*\(/);
});

test("release contract covers requested simulated viewport matrix without presenting simulation as physical proof", () => {
  assert.equal(release.release, "studio-real-device-v190-20260801");
  for (const viewport of viewportMatrix) assert.ok(release.validation.viewportMatrix.includes(viewport), viewport);
  assert.equal(release.repairs.sixResponsiveFamiliesPreserved, true);
  assert.equal(release.repairs.supabaseDataGatewayFirst, true);
  assert.match(release.validation.physicalDevices, /do not replace real-device verification/i);
  assert.match(release.validation.capacity, /planning simulation only/i);
  assert.doesNotMatch(JSON.stringify(release), /900[- ]?million.*proven|900 juta.*terbukti/i);
});
