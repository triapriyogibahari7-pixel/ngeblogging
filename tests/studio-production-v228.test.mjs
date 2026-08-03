import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const device = read("src/studio-device-mode-v140.js");
const runtime = read("src/studio-production-v228.js");
const css = read("src/studio-production-v228.css");
const theme = read("src/ThemeStudio.jsx");
const widgets = read("src/widget-system.js");
const nara = read("src/NaraAssistant.jsx");
const auth = read("src/lib/supabase.js");
const reauth = read("scripts/patch-data-reauth-v224.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");
const worker = read("public/sw.js");
const analytics = read("src/studio-analytics-v41.js");
const release = JSON.parse(read("public/release-v228.json"));

const RELEASE = "studio-production-v228-green-editor-nara-20260803";

test("v228 is the final Studio authority after v227 compatibility chain", () => {
  assert.match(chain, /patch-nara-fallback-v227\.mjs/);
  assert.match(chain, /patch-production-v228\.mjs/);
  assert.ok(chain.indexOf("patch-nara-fallback-v227.mjs") < chain.indexOf("patch-production-v228.mjs"));
  assert.match(entry, /studio-production-v228\.js/);
  assert.match(runtime, new RegExp(RELEASE));
});

test("browser Desktop Site on a physical phone is classified before phone/mobile", () => {
  assert.match(device, /V228_DESKTOP_SITE_PHYSICAL_PHONE_LOCK/);
  assert.match(device, /if \(desktopSitePhone\) return "desktop"/);
  const classifier = device.slice(device.indexOf("function classifyResponsiveMode"), device.indexOf("function desktopVariant"));
  assert.ok(classifier.indexOf('if (desktopSitePhone) return "desktop"') < classifier.indexOf('physicalShortSide <= PHONE_MAX'));
  assert.match(device, /const variant = desktopSitePhone \? "desktop" : desktopVariant/);
});

test("native Theme map is semantic on small and large devices, not a flat tile board", () => {
  for (const marker of [
    'data-v226-layout-source="native-green-reference"',
    'data-v226-green-map="four-left-post-four-right"',
    'data-layout-area={area.id}',
    'preferredArea={widgetArea}',
  ]) assert.ok(theme.includes(marker), `Theme source missing ${marker}`);
  for (const marker of [
    'data-v228-layout-canvas="semantic-small"',
    'data-v228-layout-canvas="semantic-large"',
    ".sidebar-left-1", ".sidebar-left-2", ".sidebar-left-3", ".sidebar-left-4",
    ".sidebar-right-1", ".sidebar-right-2", ".sidebar-right-3", ".sidebar-right-4",
    ".content-main", ".before-content", ".after-content",
  ]) assert.ok(css.includes(marker), `v228 CSS missing ${marker}`);
  assert.match(runtime, /semantic-green-blueprint/);
  assert.match(runtime, /below-map/);
});

test("Theme Studio retains one hundred themes, twenty-six widgets, area editing and custom code", () => {
  assert.match(theme, /tn-widget-custom-code-v209/);
  assert.match(theme, /Tema Custom/);
  assert.match(theme, /LAYOUT_AREAS\.map/);
  assert.match(widgets, /id: "custom-html"/);
  assert.match(release.theme.builtInThemesRequired.toString(), /100/);
  assert.equal(release.theme.widgetCountRequired, 26);
  assert.equal(release.theme.customHtmlJavascriptWidgetPreserved, true);
});

test("HTML CSS JavaScript editor has actual gutter, readable long source and deterministic preview layout", () => {
  assert.match(runtime, /actual-1-to-10000/);
  assert.match(runtime, /readable-long-editor/);
  assert.match(css, /v222-code-line-gutter\[data-v228-gutter\]/);
  assert.match(css, /data-v228-workspace="preview-above-code"/);
  assert.match(css, /data-v228-workspace="code-left-preview-right"/);
  assert.match(css, /background:#f8fafc!important/);
  assert.match(css, /place-items:start center!important/);
  assert.equal(release.codeEditor.maxSupportedLines, 10000);
});

test("Nara keeps Camera Photo File microphone speaker model and intelligence without modal small/medium", () => {
  for (const marker of ["Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) {
    assert.ok(nara.includes(marker), `Nara missing ${marker}`);
  }
  assert.match(runtime, /camera-photo-file/);
  assert.match(runtime, /viewport-fixed/);
  assert.match(css, /data-v228-nara-mode="nonmodal"/);
  assert.match(css, /nara-assistant-backdrop\{display:none!important/);
  assert.match(css, /nara-composer-tools/);
  assert.equal(release.nara.smallMediumNonModal, true);
  assert.equal(release.nara.cameraPhotoFile, true);
});

test("Domain actions remain horizontal and Analytics keeps the real production RPC", () => {
  assert.match(css, /data-v228-domain-action="horizontal-full"/);
  assert.match(css, /writing-mode:horizontal-tb!important/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.equal(release.analytics.fakeStatisticsAdded, false);
});

test("session persistence and v224 one-refresh data recovery remain mandatory", () => {
  assert.match(auth, /persistSession: true/);
  assert.match(auth, /autoRefreshToken: true/);
  assert.match(reauth, /retryDataAfterReauthV224/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.match(worker, /ngeblogging-app-v228-green-editor-nara-20260803/);
  assert.match(worker, /green-editor-nara-cache-v228/);
  assert.match(worker, new RegExp(RELEASE));
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
  assert.equal(release.authentication.forcedLogoutAdded, false);
});

test("release is factual and does not claim untested mass capacity", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.claims.massCapacityClaimed, false);
  assert.equal(release.claims.providerOAuthEndToEndClaimed, false);
  assert.equal(release.claims.realDeviceVerificationRequired, true);
});