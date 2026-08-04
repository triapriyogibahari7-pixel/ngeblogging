import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const device = read("src/studio-device-mode-v140.js");
const runtime = read("src/studio-stability-v260.js");
const css = read("src/studio-stability-v260.css");
const studio = read("src/Studio.jsx");
const finalizer = read("scripts/finalize-studio-v259-order.mjs");
const sw = read("scripts/service-worker-v259-rotate.mjs");
const auth = read("src/lib/supabase.js");
const release = JSON.parse(read("public/release-v260.json"));

const requiredMenu = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];
const viewports = [
  "320x568", "360x640", "375x667", "390x844", "412x915", "430x932",
  "600x960", "768x1024", "820x1180", "1024x768", "1280x720", "1366x768",
  "1440x900", "1920x1080",
];

test("v260 device classifier stops desktop-site phones from bouncing back to mobile", () => {
  assert.match(device, /studio-device-mode-v260-20260804/);
  assert.match(device, /function desktopSiteRequested/);
  assert.match(device, /DESKTOP_SITE_MIN_LAYOUT = 900/);
  assert.match(device, /if \(desktopSiteRequested\(view, handheld\)\) return "desktop"/);
  assert.match(device, /if \(handheld && view\.physicalShortSide < 768\) return "compact"/);
  assert.match(device, /if \(handheld\) return "tablet"/);
  assert.match(device, /root\.dataset\.studioDesktopSitePhone = String\(desktopSitePhone\)/);
  assert.match(device, /root\.dataset\.studioDeviceMode = nextLayoutMode/);
});

test("v260 is last after v259 and the build finalizer preserves that order", () => {
  const v259 = studio.indexOf('import "./studio-six-mode-authority-v259-hotfix.css";');
  const runtimeIndex = studio.indexOf('import "./studio-stability-v260.js";');
  const cssIndex = studio.indexOf('import "./studio-stability-v260.css";');
  assert.ok(v259 >= 0);
  assert.ok(runtimeIndex > v259);
  assert.ok(cssIndex > runtimeIndex);
  assert.match(finalizer, /studio-v260-post-build-order-20260804/);
  assert.match(finalizer, /const V260_RUNTIME = "studio-stability-v260\.js"/);
  assert.match(finalizer, /const V260_STYLES = "studio-stability-v260\.css"/);
  assert.match(finalizer, /v260Runtime > hotfix && v260Styles > v260Runtime/);
  assert.match(finalizer, /V260_FINAL_ORDER_INVALID/);
});

test("sidebar contract keeps one n, all menu destinations and no mobile blank rail", () => {
  assert.match(runtime, /v260SingleN/);
  assert.match(runtime, /studioV253Family = current/);
  assert.match(runtime, /studioV259Family = current/);
  assert.match(css, /data-studio-v260-family="small"\] \.sn-main[\s\S]*margin-left:0!important/);
  assert.match(css, /data-studio-v260-family="large"[\s\S]*#ngeblogging-studio-sidebar/);
  assert.match(css, /--v260-side-open:248px/);
  assert.match(css, /--v260-side-rail:70px/);
  assert.match(css, /\.sn-side-close[\s\S]*display:none!important/);
  for (const label of requiredMenu) {
    const source = read("src/StudioNext.jsx");
    assert.ok(source.includes(label), `missing sidebar destination ${label}`);
  }
});

test("profile menu is separated from Settings and exposes six working actions", () => {
  for (const action of ["profile", "settings", "add-site", "view-site", "nara", "logout"]) {
    assert.ok(runtime.includes(`"${action}"`), `missing profile action ${action}`);
  }
  assert.match(runtime, /studioAccountViewV189 = action/);
  assert.match(runtime, /sn-account-settings-v135/);
  assert.match(runtime, /sn-account-logout-v135/);
  assert.match(runtime, /sn-nara-button/);
  assert.match(css, /sn-profile-menu-v260[\s\S]*position:fixed!important/);
  assert.match(css, /max-width:calc\(100vw - 20px\)!important/);
});

test("mobile pages are bounded and editor/domain controls cannot create page overflow", () => {
  assert.match(css, /data-studio-v260-family="small"\] \.sn-view-pad[\s\S]*margin:0!important[\s\S]*overflow-x:clip!important/);
  assert.match(css, /\.sn-welcome h1[\s\S]*font-size:clamp\(27px,8vw,38px\)!important/);
  assert.match(css, /\.sn-metrics[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(css, /\.ce-app[\s\S]*overflow-x:clip!important/);
  assert.match(css, /writing-mode:horizontal-tb!important/);
  assert.match(css, /op41-table-wrap[\s\S]*overflow-x:auto!important/);
});

test("Theme editor keeps code and preview responsive with the existing 1-10000 gutter authority", () => {
  const v259 = read("src/studio-six-mode-authority-v259.js");
  assert.match(v259, /Math\.min\(10_000/);
  assert.match(v259, /v259-code-gutter/);
  assert.match(css, /data-studio-v260-family="large"\] \.tn-code-workspace[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css, /data-studio-v260-family="small"\] \.tn-code-preview-pane\{order:1!important\}/);
  assert.match(css, /data-studio-v260-family="small"\] \.tn-code-pane\{order:2!important\}/);
  assert.match(css, /min-height:680px!important/);
  assert.match(css, /v257-layout-popover[\s\S]*position:fixed!important/);
});

test("Nara launcher stays fixed and small/medium remain non-modal with camera-photo-file controls", () => {
  assert.match(runtime, /v260Interaction = full \? "modal" : "nonmodal"/);
  assert.match(runtime, /Tambah kamera, foto, atau file/);
  assert.match(runtime, /nara-select\.intelligence/);
  assert.match(runtime, /nara-select\.model/);
  assert.match(css, /nara-floating-button:not\(\[hidden\]\)[\s\S]*position:fixed!important/);
  assert.match(css, /data-v260-interaction="nonmodal"[\s\S]*pointer-events:none!important/);
  assert.match(css, /data-v260-interaction="nonmodal"[\s\S]*nara-assistant-shell[\s\S]*pointer-events:auto!important/);
  assert.match(css, /nara-attachment-menu[\s\S]*bottom:calc\(100% \+ 8px\)!important/);
});

test("auth persistence and v260 cache rotation do not contain destructive session clearing", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /flowType:\s*"pkce"/);
  assert.match(sw, /ACTIVE_VERSION_V260/);
  assert.match(sw, /ACTIVE_CACHE_RELEASE_V260/);
  assert.match(sw, /NGE_BLOGGING_UPDATE_AVAILABLE_V260/);
  assert.match(sw, /studioStabilityReleaseV260/);
  assert.doesNotMatch(auth, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
  assert.doesNotMatch(sw, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("v260 manifest carries the requested viewport matrix without fake live-device or login claims", () => {
  assert.equal(release.release, "studio-stability-v260-20260804");
  for (const viewport of viewports) assert.ok(release.viewportMatrix.includes(viewport), viewport);
  assert.equal(release.validation.realDeviceExecutionVerifiedByManifest, false);
  assert.equal(release.validation.googleLoginEndToEndVerifiedByManifest, false);
  assert.equal(release.validation.linkedinLoginEndToEndVerifiedByManifest, false);
  assert.equal(release.validation.emailPasswordLoginEndToEndVerifiedByManifest, false);
  assert.equal(release.validation.productionDeploymentVerifiedByManifest, false);
  assert.match(release.validation.capacityClaim, /No 900-billion-user login claim/i);
});