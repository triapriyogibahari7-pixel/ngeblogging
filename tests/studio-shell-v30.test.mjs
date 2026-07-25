import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const css = read("src/studio-shell-v30.css");
const runtime = read("src/studio-shell-v30.js");
const sw = read("public/sw.js");

test("v30 is the only active Studio shell authority", () => {
  assert.match(index, /studio-shell-v29\.css[^>]+media="not all"/);
  assert.match(index, /studio-shell-v29\.js[^>]+application\/x-disabled/);
  assert.match(index, /studio-shell-v30\.css" rel="stylesheet"/);
  assert.match(index, /studio-shell-v30\.js/);
});

test("mobile drawer is flush left and its launcher stays at the top-left", () => {
  assert.match(css, /\.sn-shell > \.sn-side \{[\s\S]*left: 0 !important;[\s\S]*margin: 0 !important;[\s\S]*padding: 0 !important;/);
  assert.match(css, /\.sn-mobile-v30-launcher \{[\s\S]*left: 0 !important;[\s\S]*top: max\(14px, env\(safe-area-inset-top\)\) !important;/);
  assert.doesNotMatch(css, /\.sn-mobile-v30-launcher[\s\S]{0,500}top: 50dvh/);
  assert.match(css, /grid-template-columns: 42px minmax\(0, 1fr\)/);
  assert.match(runtime, /sn-mobile-v30-logo/);
  assert.match(runtime, />Ngeblogging<\/b>/);
  assert.match(runtime, /sn-mobile-v30-close/);
});

test("mobile header, search and navigation cannot overlap", () => {
  assert.match(css, /\.sn-mobile-v30-header[\s\S]*grid-template-columns: minmax\(0, 1fr\) 44px/);
  assert.match(css, /\.sn-mobile-v30-search[\s\S]*position: static !important/);
  assert.match(css, /\.sn-side > nav > button[\s\S]*position: relative !important/);
  assert.match(css, /text-overflow: ellipsis !important/);
});

test("Nara portal is watched outside root and defaults to a widget", () => {
  assert.match(runtime, /observe\(document\.documentElement/);
  assert.match(runtime, /window\.setTimeout\(schedule, 60\)/);
  assert.match(css, /html\[data-studio-shell-authority-v30\] \.nara-assistant-layer/);
  assert.match(css, /background: transparent !important/);
  assert.match(css, /width: min\(430px, calc\(100vw - 24px\)\) !important/);
  assert.match(css, /data-nara-size-v30="expanded"/);
  assert.match(runtime, /nara-expand-toggle-v30/);
  assert.match(runtime, /nara-speaker-v30/);
  assert.match(runtime, /Mode kerja Nara/);
});

test("desktop sidebar geometry remains locked and PWA cache rotates", () => {
  assert.match(css, /--sn-v30-desktop-open: 220px/);
  assert.match(css, /--sn-v30-desktop-closed: 70px/);
  assert.match(sw, /ngeblogging-app-v30-20260725/);
});
