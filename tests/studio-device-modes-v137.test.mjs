import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Studio activates the final device-mode runtime instead of a static early CSS authority", () => {
  const studio = read("src/Studio.jsx");
  assert.match(studio, /studio-device-mode-v137\.js/);
  assert.doesNotMatch(studio, /studio-final-recovery-v136\.css/);
});

test("device runtime distinguishes small application and large browser layouts", () => {
  const runtime = read("src/studio-device-mode-v137.js");
  assert.match(runtime, /SMALL_MAX = 700/);
  assert.match(runtime, /studioDeviceMode = mode/);
  assert.match(runtime, /"small" : "large"/);
  assert.match(runtime, /display-mode: standalone/);
  assert.match(runtime, /visualViewport/);
  assert.match(runtime, /orientationchange/);
  assert.match(runtime, /pageshow/);
  assert.match(runtime, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
  assert.match(runtime, /import\("\.\/studio-device-modes-v137\.css"\)/);
});

test("final authority prevents white right and bottom gaps", () => {
  const css = read("src/studio-device-modes-v137.css");
  assert.match(css, /html\{width:100%;max-width:100%;min-height:100%;background:#f5f7fb;overflow-x:hidden\}/);
  assert.match(css, /body,#root\{width:100%;max-width:100%;min-width:0;min-height:100%/);
  assert.match(css, /body,#root,\.sn-shell,\.sn-main\{min-height:100vh;min-height:100dvh\}/);
  assert.match(css, /max-width:100vw!important/);
  assert.match(css, /overflow-x:clip!important/);
});

test("small mode is an off-canvas drawer with full-width content", () => {
  const css = read("src/studio-device-modes-v137.css");
  assert.match(css, /data-studio-device-mode="small"/);
  assert.match(css, /transform:translateX\(-105%\)!important/);
  assert.match(css, /\.sn-side\.mobile-open/);
  assert.match(css, /margin-left:0!important;width:100%!important;max-width:100%!important/);
  assert.match(css, /safe-area-inset-left/);
  assert.match(css, /safe-area-inset-bottom/);
});

test("large mode keeps precise expanded and collapsed desktop geometry", () => {
  const css = read("src/studio-device-modes-v137.css");
  assert.match(css, /data-studio-device-mode="large"/);
  assert.match(css, /width:220px!important;max-width:220px!important/);
  assert.match(css, /width:70px!important;max-width:70px!important/);
  assert.match(css, /width:calc\(100% - 220px\)!important/);
  assert.match(css, /width:calc\(100% - 70px\)!important/);
});

test("Domain, API Keys, tables, and Nara remain isolated and responsive", () => {
  const css = read("src/studio-device-modes-v137.css");
  assert.match(css, /#ngeblogging-api-keys-v135/);
  assert.match(css, /\.sv124-page/);
  assert.match(css, /\.sn-api-table\{overflow-x:auto!important/);
  assert.match(css, /\.nara-assistant-shell\{pointer-events:auto!important/);
  assert.match(css, /\.nara-assistant-shell\.nara-fullscreen-v135/);
  assert.match(css, /height:min\(52dvh,460px\)!important/);
});
