import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v285 responsive lock is loaded after v284", async () => {
  const entry = await read("src/Studio.jsx");
  assert.match(entry, /studio-native-polish-v284\.css/);
  assert.match(entry, /studio-responsive-lock-v285\.js/);
  assert.match(entry, /studio-responsive-lock-v285\.css/);
  assert.ok(entry.indexOf("studio-responsive-lock-v285.css") > entry.indexOf("studio-native-polish-v284.css"));
});

test("v285 locks actual wide viewport to desktop family", async () => {
  const runtime = await read("src/studio-responsive-lock-v285.js");
  assert.match(runtime, /BREAKPOINT = 761/);
  assert.match(runtime, /width >= BREAKPOINT/);
  assert.match(runtime, /app\.dataset\.v285Family = family/);
  assert.doesNotMatch(runtime, /new MutationObserver|stopImmediatePropagation|setInterval\s*\(/);
});

test("v285 keeps one n, desktop rail and mobile drawer", async () => {
  const css = await read("src/studio-responsive-lock-v285.css");
  for (const marker of [
    'data-v285-family="large"',
    'data-v285-family="small"',
    '--v285-side-open:248px',
    '--v285-side-rail:72px',
    'mobile-open',
    'pointer-events:none!important',
  ]) assert.ok(css.includes(marker), marker);
});

test("v285 keeps Nara fixed and nonmodal small/medium", async () => {
  const css = await read("src/studio-responsive-lock-v285.css");
  assert.match(css, /\.nara-floating-button\{position:fixed!important/);
  assert.match(css, /data-v285-interaction="nonmodal"/);
  assert.match(css, /data-nara-size="small"/);
  assert.match(css, /data-nara-size="medium"/);
  assert.match(css, /data-nara-size="full"/);
  assert.match(css, /nara-attachment-menu/);
});

test("v285 preserves Theme Studio geometry for compact and desktop", async () => {
  const css = await read("src/studio-responsive-lock-v285.css");
  assert.match(css, /\.tn-layout-map-v264\{width:660px!important/);
  assert.match(css, /grid-template-areas:"preview" "code"!important/);
  assert.match(css, /grid-template-areas:"code preview"!important/);
});
