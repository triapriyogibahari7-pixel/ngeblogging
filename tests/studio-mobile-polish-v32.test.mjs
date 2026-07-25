import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v32 is loaded after v31 and its route reset runs after shell v30", async () => {
  const index = await read("index.html");
  const v31 = index.indexOf('/src/studio-mobile-content-v31.css');
  const v32 = index.indexOf('/src/studio-mobile-polish-v32.css');
  const shell = index.indexOf('/src/studio-shell-v30.js');
  const reset = index.indexOf('/src/studio-mobile-route-reset-v32.js');
  assert.ok(v31 >= 0 && v32 > v31, "v32 CSS must follow v31");
  assert.ok(shell >= 0 && reset > shell, "route reset must run after the v30 shell runtime");
});

test("v32 keeps the approved sidebar authority untouched", async () => {
  const css = await read("src/studio-mobile-polish-v32.css");
  assert.doesNotMatch(css, /\.sn-side\b/);
  assert.doesNotMatch(css, /\.sn-mobile-v30-launcher\b/);
  assert.doesNotMatch(css, /--sn-v30-desktop-open/);
  assert.match(css, /html\.studio-v30-compact/);
});

test("Nara compact toolbar exposes all eight columns and the send button", async () => {
  const css = await read("src/studio-mobile-polish-v32.css");
  assert.match(css, /grid-template-columns:\s*repeat\(4,[\s\S]*minmax\(34px,[\s\S]*minmax\(36px,[\s\S]*minmax\(46px,[\s\S]*28px/);
  assert.match(css, /\.nara-composer-tools\s*>\s*\.nara-send/);
  assert.match(css, /visibility:\s*visible\s*!important/);
  assert.match(css, /\.nara-plugin-panel-v29\[hidden\]/);
});

test("Theme Studio mobile page and customizer are single-column", async () => {
  const css = await read("src/studio-mobile-polish-v32.css");
  assert.match(css, /\.tn-hero[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.tn-customizer[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.tn-code-workspace[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.tn-modal\.fullscreen[\s\S]*height:\s*100dvh/);
});

test("mobile route reset returns new views and theme modals to the top", async () => {
  const runtime = await read("src/studio-mobile-route-reset-v32.js");
  assert.match(runtime, /\.sn-side > nav > button/);
  assert.match(runtime, /window\.scrollTo/);
  assert.match(runtime, /\.tn-modal-layer/);
  assert.match(runtime, /requestAnimationFrame/);
});

test("PWA cache is rotated for v32", async () => {
  const worker = await read("public/sw.js");
  assert.match(worker, /ngeblogging-app-v32-20260725/);
  assert.match(worker, /ngeblogging-app-v31-20260725/);
});
