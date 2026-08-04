import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const runtime = read("src/studio-visual-native-v257.js");
const styles = read("src/studio-visual-native-v257.css");
const patch = read("scripts/patch-studio-physical-mode-v259.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");
const theme = read("src/ThemeStudio.jsx");
const vite = read("vite.config.js");

function activeResponsiveBlock() {
  const start = runtime.indexOf("function responsiveMode()");
  const end = runtime.indexOf("function family", start);
  assert.ok(start >= 0 && end > start, "responsiveMode block is missing");
  return runtime.slice(start, end);
}

test("Studio shell mode follows physical viewport instead of Theme preview datasets", () => {
  const block = activeResponsiveBlock();
  assert.match(runtime, /studioPhysicalModeV259=studio-physical-mode-v259-20260804/);
  assert.match(runtime, /function physicalViewportWidthV259\(\)/);
  assert.match(runtime, /window\.visualViewport\?\.width/);
  assert.match(runtime, /function installedApplicationV259\(\)/);
  assert.match(runtime, /display-mode: standalone/);
  assert.doesNotMatch(block, /studioResponsiveMode|studioDeviceVariant/);
  assert.match(block, /width <= 430\) return "phone"/);
  assert.match(block, /width <= 600\) return "mobile"/);
  assert.match(block, /width <= 760\) return "compact"/);
  assert.match(block, /width <= 1180\) return "tablet"/);
  assert.match(block, /width <= 1536\) return "laptop"/);
  assert.match(block, /return "computer"/);
});

test("hard mobile guard removes desktop offset before and after JS synchronization", () => {
  assert.match(styles, /studio-physical-mode-v259/);
  assert.match(styles, /@media \(max-width:760px\)/);
  assert.match(styles, /data-studio-visual-native-v257\] \.sn-main[\s\S]*margin-left:0!important[\s\S]*width:100%!important/);
  assert.match(styles, /data-studio-visual-native-v257\] \.sn-top[\s\S]*left:0!important[\s\S]*width:100%!important/);
  assert.match(styles, /#ngeblogging-studio-sidebar[\s\S]*translate3d\(-105%,0,0\)!important/);
  assert.match(styles, /#ngeblogging-studio-sidebar\.mobile-open[\s\S]*translate3d\(0,0,0\)!important/);
  assert.match(styles, /\.sn-side-backdrop[\s\S]*background:transparent!important[\s\S]*backdrop-filter:none!important/);
});

test("mobile Theme editor remains bounded even when its preview is Desktop", () => {
  assert.match(styles, /\.tn-code-workspace[\s\S]*flex-direction:column!important/);
  assert.match(styles, /\.tn-code-preview-pane[\s\S]*order:1!important/);
  assert.match(styles, /\.tn-code-pane[\s\S]*order:2!important/);
  assert.match(styles, /\.tn-code-pane textarea[\s\S]*white-space:pre!important/);
  for (const device of ["application", "phone", "mobile", "compact", "tablet", "laptop", "desktop", "computer"]) {
    assert.ok(theme.includes(`id: "${device}"`), `missing independent Theme preview ${device}`);
  }
});

test("Nara launcher stays fixed and visible inside the physical mobile viewport", () => {
  assert.match(styles, /\.nara-floating-button[\s\S]*position:fixed!important/);
  assert.match(styles, /right:max\(14px,env\(safe-area-inset-right,0px\)\)!important/);
  assert.match(styles, /bottom:max\(14px,env\(safe-area-inset-bottom,0px\)\)!important/);
  assert.match(styles, /animation:none!important/);
});

test("v259 is a late source patch and keeps the proven v257 Vite finalizer", () => {
  assert.ok(chain.indexOf('patch-studio-physical-mode-v259.mjs') > chain.indexOf('patch-sidebar-right4-v258.mjs'));
  assert.match(patch, /V259_PREVIEW_DATASET_STILL_CONTROLS_PHYSICAL_MODE/);
  assert.match(vite, /finalizeStudioV257Order/);
  assert.doesNotMatch(vite, /finalizeStudioV259Order/);
});
