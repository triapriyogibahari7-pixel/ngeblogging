import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const runtime = read("src/studio-six-mode-authority-v259.js");
const styles = read("src/studio-six-mode-authority-v259.css");
const patch = read("scripts/patch-six-mode-physical-v260.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");
const theme = read("src/ThemeStudio.jsx");

function activeResolvedMode() {
  const start = runtime.indexOf("function resolvedMode()");
  const end = runtime.indexOf("function syncModeLock", start);
  assert.ok(start >= 0 && end > start, "resolvedMode block missing");
  return runtime.slice(start, end);
}

test("v260 separates physical shell mode from Theme preview selection", () => {
  const block = activeResolvedMode();
  assert.match(runtime, /studioSixModePhysicalV260=studio-six-mode-physical-v260-20260804/);
  assert.match(runtime, /function installedApplicationV260\(\)/);
  assert.match(block, /if \(view\.desktopSitePhone\)/);
  assert.doesNotMatch(block, /studioResponsiveMode|studioDeviceVariant|v232ModeLock/);
  assert.match(block, /width <= 430\) return \{ family: "small", mode: "phone"/);
  assert.match(block, /width <= 600\) return \{ family: "small", mode: "mobile"/);
  assert.match(block, /width <= 760\) return \{ family: "small", mode: "compact"/);
  assert.match(block, /width <= 1180\) return \{ family: "large", mode: "tablet"/);
  assert.match(block, /width <= 1366\) return \{ family: "large", mode: "laptop"/);
  assert.match(block, /width <= 1720\) return \{ family: "large", mode: "desktop"/);
  assert.match(block, /mode: "computer"/);
});

test("stale desktop-site lock is removed after returning to the real phone viewport", () => {
  assert.match(runtime, /if \(html\.dataset\.v232ModeLock === "desktop-site-large"\) delete html\.dataset\.v232ModeLock/);
  assert.match(runtime, /if \(html\.dataset\.studioDesktopSitePhone === "true"\) delete html\.dataset\.studioDesktopSitePhone/);
  assert.match(runtime, /studioResponsiveMode = "desktop"/);
  assert.match(runtime, /studioDeviceVariant = "desktop"/);
  assert.match(runtime, /studioDeviceMode = "large"/);
});

test("physical mobile fallback prevents any desktop margin from clipping Studio pages", () => {
  assert.match(styles, /studio-six-mode-physical-v260/);
  assert.match(styles, /@media \(max-width:760px\)/);
  assert.match(styles, /data-studio-six-mode-authority-v259\] \.sn-main[\s\S]*margin-left:0!important[\s\S]*width:100%!important/);
  assert.match(styles, /data-studio-six-mode-authority-v259\] \.sn-top[\s\S]*left:0!important[\s\S]*width:100%!important/);
  assert.match(styles, /#ngeblogging-studio-sidebar[\s\S]*translate3d\(-105%,0,0\)!important/);
  assert.match(styles, /#ngeblogging-studio-sidebar\.mobile-open[\s\S]*translate3d\(0,0,0\)!important/);
  assert.match(styles, /\.sn-side-backdrop[\s\S]*background:transparent!important[\s\S]*backdrop-filter:none!important/);
});

test("Theme preview devices remain available independently from physical shell", () => {
  for (const device of ["application", "phone", "mobile", "compact", "tablet", "laptop", "desktop", "computer"]) {
    assert.ok(theme.includes(`id: "${device}"`), `missing Theme preview mode ${device}`);
  }
  assert.match(styles, /\.tn-code-workspace[\s\S]*grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(styles, /\.tn-code-preview-pane[\s\S]*order:1!important/);
  assert.match(styles, /\.tn-code-pane[\s\S]*order:2!important/);
});

test("Nara launcher remains fixed on the physical viewport and animations cannot cause blinking", () => {
  assert.match(styles, /\.nara-floating-button[\s\S]*position:fixed!important/);
  assert.match(styles, /right:calc\(var\(--v259-safe-right\) \+ 2px\)!important/);
  assert.match(styles, /bottom:calc\(var\(--v259-safe-bottom\) \+ 2px\)!important/);
  assert.match(styles, /animation:none!important/);
  assert.match(styles, /transition:none!important/);
});

test("v260 runs after persisted Theme right4 and does not create a second visual finalizer", () => {
  assert.ok(chain.indexOf('patch-six-mode-physical-v260.mjs') > chain.indexOf('patch-sidebar-right4-v258.mjs'));
  assert.match(patch, /V260_STALE_PREVIEW_OR_LOCK_CONTROLS_PHYSICAL_MODE/);
  assert.doesNotMatch(patch, /finalizeStudioV260Order/);
});
