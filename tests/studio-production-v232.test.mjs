import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v232.js");
const css = read("src/studio-production-v232.css");
const patch = read("scripts/patch-production-v232.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");
const auth = read("src/lib/supabase.js");
const nara = read("src/NaraAssistant.jsx");
const theme = read("src/ThemeStudio.jsx");
const analytics = read("src/studio-analytics-v41.js");
const release = JSON.parse(read("public/release-v232.json"));
const RELEASE = "studio-production-v232-single-n-theme-actions-20260803";

const viewports = [
  "320x568", "360x640", "375x667", "390x844", "412x915", "430x932",
  "600x960", "768x1024", "820x1180", "1024x768", "1280x720", "1366x768",
  "1440x900", "1920x1080",
];

test("v232 is explicit after v231 and final in production patch chain", () => {
  assert.match(entry, /studio-production-v231\.js/);
  assert.match(entry, /studio-production-v232\.js/);
  assert.ok(entry.indexOf("studio-production-v231.js") < entry.indexOf("studio-production-v232.js"));
  assert.match(chain, /patch-production-v231\.mjs/);
  assert.match(chain, /patch-production-v232\.mjs/);
  assert.ok(chain.indexOf("patch-production-v231.mjs") < chain.indexOf("patch-production-v232.mjs"));
  assert.match(runtime, new RegExp(RELEASE));
});

test("sidebar uses one n, tight menu stack, responsive main width, and desktop auto-collapse", () => {
  assert.match(runtime, /v232SingleN/);
  assert.match(runtime, /bindDesktopAutoCollapse/);
  assert.match(runtime, /sn-new,nav button,\.sn-account-settings-v135/);
  assert.match(runtime, /topToggle\.click\(\)/);
  assert.match(runtime, /tight-under-create/);
  assert.match(css, /data-v232-family="large"[\s\S]*width:248px!important/);
  assert.match(css, /data-v232-family="large"[\s\S]*width:68px!important/);
  assert.match(css, /width:calc\(100% - 248px\)!important/);
  assert.match(css, /width:calc\(100% - 68px\)!important/);
  assert.match(css, /data-v232-family="small"[\s\S]*translateX\(-105%\)/);
  assert.match(css, /sn-side-close/);
});

test("desktop-site phone choice remains large while normal handheld remains small", () => {
  assert.match(runtime, /desktopSitePhone = handheld && shortSide < 768 && layoutWidth >= 900/);
  assert.match(runtime, /v232ModeLock = "desktop-site-large"/);
  assert.match(runtime, /v232ModeLock = "physical-small"/);
  assert.equal(release.sidebar.singleNControl, true);
  assert.equal(release.sidebar.desktopAutoCollapseAfterMenuSelection, true);
});

test("Theme exposes explicit HTML CSS JavaScript Preview actions and preserves real map", () => {
  for (const marker of ["Edit HTML", "Edit CSS", "Edit JavaScript", "Preview"]) assert.ok(runtime.includes(marker), marker);
  assert.match(runtime, /v232-theme-code-actions/);
  assert.match(css, /v232-theme-code-actions/);
  assert.match(theme, /data-v226-layout-source="native-green-reference"/);
  assert.match(theme, /data-v226-green-map="four-left-post-four-right"/);
  assert.match(runtime, /same-blueprint-every-device/);
  assert.match(runtime, /data\.v232LayoutSlot|v232LayoutSlot/);
  assert.equal(release.theme.fourLeftAndFourRightSlots, true);
  assert.equal(release.theme.layoutSlotsInteractive, true);
});

test("Theme code editor remains long, sequential and device-responsive", () => {
  assert.match(runtime, /code-left-preview-right/);
  assert.match(runtime, /preview-top-code-bottom/);
  assert.match(runtime, /real-sequential-lines/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css, /min-height:520px!important/);
  assert.equal(release.theme.sequentialLineNumbersUpTo, 10000);
  assert.equal(release.theme.previewCentered, true);
});

test("100 themes and 26 widgets including custom HTML JavaScript are preserved", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((item) => item.id)).size, 100);
  assert.equal(WIDGET_COUNT, 26);
  assert.equal(BUILT_IN_WIDGETS.length, 26);
  assert.equal(BUILT_IN_WIDGETS.at(-1)?.id, "custom-html");
});

test("Nara keeps camera photo file mic speaker model intelligence and bounded sizes", () => {
  for (const marker of ["Kamera", "Foto", "File teks", "Pertanyaan suara", "Tingkat kecerdasan", "Model Nara", "SpeakerIcon"]) assert.ok(nara.includes(marker), marker);
  assert.match(runtime, /camera-photo-file/);
  assert.match(runtime, /nonmodal/);
  assert.match(css, /data-v232-nara-size="small"\]\[data-v232-nara-family="large"\]/);
  assert.match(css, /width:430px!important/);
  assert.match(css, /nara-attachment-menu\[data-v232-attachment-menu\]/);
  assert.equal(release.nara.smallMediumNonmodal, true);
});

test("Domain and Analytics remain real while geometry is bounded", () => {
  assert.match(runtime, /full-row/);
  assert.match(css, /data-v232-domain-action="full-row"/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.equal(release.preserved.realAnalyticsRpc, true);
});

test("auth persists session and release avoids unverified claims", () => {
  assert.match(auth, /persistSession: true/);
  assert.match(auth, /autoRefreshToken: true/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.match(patch, /ACTIVE_VERSION_V232/);
  assert.match(patch, /ACTIVE_CACHE_RELEASE_V232/);
  for (const viewport of viewports) assert.ok(release.validation.viewportMatrix.includes(viewport), viewport);
  assert.equal(release.authentication.googleEndToEndVerifiedByThisRelease, false);
  assert.equal(release.authentication.linkedinEndToEndVerifiedByThisRelease, false);
  assert.equal(release.authentication.emailPasswordEndToEndVerifiedByThisRelease, false);
  assert.match(release.validation.capacity, /No 900-million-user claim/i);
});
