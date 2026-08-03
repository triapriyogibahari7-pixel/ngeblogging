import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const compatChain = read("scripts/patch-v216-v215-auth-compat.mjs");
const topChain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-production-v223.mjs");
const runtime = read("src/studio-production-v223.js");
const css = read("src/studio-production-v223.css");
const auth = read("src/lib/supabase.js");
const nara = read("src/NaraAssistant.jsx");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v223.json"));
const RELEASE = "studio-production-v223-20260803";

test("v223 executes after v222 once and remains preserved under later authorities", () => {
  assert.match(compatChain, /patch-production-v222\.mjs/);
  assert.doesNotMatch(compatChain, /patch-production-v223\.mjs/);
  assert.match(topChain, /patch-production-v222\.mjs/);
  assert.match(topChain, /patch-production-v223\.mjs/);
  assert.ok(topChain.lastIndexOf("patch-production-v222.mjs") < topChain.lastIndexOf("patch-production-v223.mjs"));
  assert.match(patch, /studio-production-v223\.js/);
  assert.match(runtime, new RegExp(RELEASE));
  assert.match(worker, /STUDIO_PRODUCTION_RELEASE_V223/);
  assert.match(worker, /ngeblogging-app-v223-physical-ui-route-20260803/);
  assert.match(worker, /physical-ui-route-cache-v223/);
});

test("preview selection is independent from physical editor UI", () => {
  assert.match(runtime, /v223PreviewModeLock/);
  assert.match(runtime, /physicalMetrics/);
  assert.match(runtime, /desktopSitePhone/);
  assert.match(runtime, /preview-above-code/);
  assert.match(runtime, /code-left-preview-right/);
  assert.doesNotMatch(runtime, /studioResponsiveMode\s*=/);
  assert.doesNotMatch(runtime, /studioDeviceVariant\s*=/);
  assert.equal(release.theme.previewModeIndependentFromPhysicalEditorUi, true);
  assert.equal(release.responsive.previewSelectionNotRewrittenByV223, true);
});

test("green reference map stays real and readable on both physical-small and large devices", () => {
  assert.match(runtime, /green-reference/);
  assert.match(runtime, /four-left-four-right/);
  assert.match(css, /data-v223-layout="green-reference"/);
  assert.match(css, /data-v223-layout-canvas/);
  assert.match(css, /data-v223-ui-family="physical-small"/);
  assert.match(css, /data-v223-ui-family="large"/);
  assert.match(css, /\.content-main/);
  assert.equal(release.theme.fourLeftFourRight, true);
});

test("Theme code editor keeps actual line gutter and physically readable geometry", () => {
  assert.match(css, /data-v223-workspace="preview-above-code"/);
  assert.match(css, /data-v223-workspace="code-left-preview-right"/);
  assert.match(css, /\.v222-code-line-gutter/);
  assert.match(css, /--v223-ui-scale/);
  assert.match(runtime, /responsive-readable/);
  assert.equal(release.theme.codeLineLimitSupported, 10000);
  assert.equal(release.theme.actualLineNumbersRetained, true);
});

test("Nara plus menu still exposes camera photo file while small and medium remain nonmodal", () => {
  assert.match(runtime, /camera-photo-file/);
  assert.match(runtime, /viewport-visible/);
  assert.match(css, /data-v223-attachment-menu="viewport-visible"/);
  assert.match(css, /data-v223-nara-mode="nonmodal"/);
  for (const label of ["Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) {
    assert.ok(nara.includes(label), `missing Nara feature ${label}`);
  }
  assert.equal(release.nara.attachmentMenuCameraPhotoFile, true);
  assert.equal(release.nara.smallMediumNonModal, true);
});

test("100 themes, 26 widgets and custom HTML JavaScript stay preserved", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(WIDGET_COUNT, 26);
  assert.ok(BUILT_IN_WIDGETS.some((widget) => widget.id === "custom-html"));
});

test("persistent authentication is untouched and no destructive logout is introduced", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  for (const source of [runtime, patch]) assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.equal(release.auth.forcedLogoutAdded, false);
  assert.equal(release.claims.massUserCapacityClaimed, false);
});
