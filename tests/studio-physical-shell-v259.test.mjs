import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const runtime = read("src/studio-physical-shell-v259.js");
const css = read("src/studio-physical-shell-v259.css");
const entry = read("src/Studio.jsx");
const finalizer = read("scripts/finalize-studio-v259-order.mjs");
const vite = read("vite.config.js");
const rotate = read("scripts/service-worker-v259-rotate.mjs");


test("physical shell mode is derived from real viewport, not Theme preview dataset", () => {
  assert.match(runtime, /function viewportWidth\(\)/);
  assert.match(runtime, /window\.visualViewport\?\.width/);
  assert.match(runtime, /function physicalMode\(\)/);
  assert.match(runtime, /width <= 430[\s\S]*return "phone"/);
  assert.match(runtime, /width <= 600[\s\S]*return "mobile"/);
  assert.match(runtime, /width <= 760[\s\S]*return "compact"/);
  assert.match(runtime, /width <= 1180[\s\S]*return "tablet"/);
  assert.doesNotMatch(runtime, /studioResponsiveMode|studioDeviceVariant/);
  assert.match(runtime, /display-mode: standalone/);
  assert.match(runtime, /return "application"/);
});


test("mobile physical viewport always removes desktop sidebar offset", () => {
  assert.match(css, /data-studio-v259-family="small"\] \.sn-main[\s\S]*margin-left:0!important[\s\S]*width:100%!important/);
  assert.match(css, /@media \(max-width:760px\)[\s\S]*data-studio-visual-native-v257\] \.sn-main[\s\S]*margin-left:0!important/);
  assert.match(css, /data-studio-v259-family="small"\] \.sn-top[\s\S]*left:0!important[\s\S]*width:100%!important/);
  assert.match(css, /data-studio-v259-family="small"\] :is\([\s\S]*\.sn-view-pad[\s\S]*margin-left:0!important/);
});


test("mobile drawer is off-canvas until mobile-open and backdrop never darkens page", () => {
  assert.match(css, /data-studio-v259-family="small"\] #ngeblogging-studio-sidebar[\s\S]*translate3d\(-105%,0,0\)[\s\S]*visibility:hidden/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open[\s\S]*translate3d\(0,0,0\)[\s\S]*pointer-events:auto/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*background:transparent!important[\s\S]*backdrop-filter:none!important/);
  assert.match(runtime, /side\.classList\.contains\("mobile-open"\)/);
});


test("desktop family retains expandable rail independent from Preview selection", () => {
  assert.match(css, /data-studio-v259-family="large"\]\[data-studio-v259-sidebar="expanded"\] \.sn-main[\s\S]*margin-left:var\(--v259-side-open\)/);
  assert.match(css, /data-studio-v259-family="large"\]\[data-studio-v259-sidebar="collapsed"\] \.sn-main[\s\S]*margin-left:var\(--v259-side-rail\)/);
  assert.match(runtime, /side\.classList\.contains\("collapsed"\)/);
});


test("Theme code editor and Nara follow the physical device without losing existing v257 functionality", () => {
  assert.match(css, /data-studio-v259-family="small"\] \.tn-code-workspace[\s\S]*flex-direction:column/);
  assert.match(css, /data-studio-v259-family="small"\] \.tn-code-preview-pane[\s\S]*order:1/);
  assert.match(css, /data-studio-v259-family="small"\] \.tn-code-pane[\s\S]*order:2/);
  assert.match(css, /data-studio-physical-v259\] \.nara-floating-button[\s\S]*position:fixed!important/);
  assert.match(css, /nara-assistant-layer\[data-v257-interaction="nonmodal"\][\s\S]*pointer-events:none!important/);
  assert.match(css, /nara-assistant-shell[\s\S]*pointer-events:auto!important/);
});


test("v259 is final after v257 and PWA cache rotation remains session-safe", () => {
  const v257 = entry.lastIndexOf('import "./studio-visual-native-v257.css";');
  const v259js = entry.lastIndexOf('import "./studio-physical-shell-v259.js";');
  const v259css = entry.lastIndexOf('import "./studio-physical-shell-v259.css";');
  assert.ok(v257 >= 0 && v259js > v257 && v259css > v259js);
  assert.match(finalizer, /V259_FINAL_ORDER_INVALID/);
  assert.match(vite, /finalizeStudioV257Order\(\)[\s\S]*finalizeStudioV259Order\(\)/);
  assert.match(vite, /rotateServiceWorkerV258\(\)[\s\S]*rotateServiceWorkerV259\(\)/);
  assert.match(rotate, /ACTIVE_VERSION_V258/);
  assert.match(rotate, /ngeblogging-app-v259-physical-shell-20260804/);
  assert.doesNotMatch(rotate, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});
