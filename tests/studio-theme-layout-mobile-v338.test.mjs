import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const entryFile = new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url);
const runtimeFile = new URL("../src/studio-theme-layout-mobile-v338.js", import.meta.url);
const cssFile = new URL("../src/studio-theme-layout-mobile-v338.css", import.meta.url);
const releaseFile = new URL("../public/release-v338.json", import.meta.url);

const [entry, runtime, css, release] = await Promise.all([
  readFile(entryFile, "utf8"),
  readFile(runtimeFile, "utf8"),
  readFile(cssFile, "utf8"),
  readFile(releaseFile, "utf8"),
]);

test("v338 keeps the former right-hand Theme design below the primary map on compact devices", () => {
  assert.match(entry, /studio-theme-layout-mobile-v338\.js/);
  assert.match(runtime, /new Set\(\["application", "phone", "mobile", "compact", "tablet"\]\)/);
  assert.match(runtime, /data-v337-secondary-layout/);
  assert.match(runtime, /v338LayoutFamily/);
  assert.match(css, /data-v338-layout-family="compact"/);
  assert.match(css, /data-v338-layout-role="secondary-below"/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css, /\.tn-layout-map-v264[\s\S]*?width:100%!important[\s\S]*?min-width:0!important/);
  assert.doesNotMatch(css, /min-width:720px!important/);
  assert.doesNotMatch(css, /width:720px!important/);
});

test("v338 remains narrowly scoped and preserves production authorities", () => {
  for (const marker of [
    '"themes": 100',
    '"layoutAreas": 26',
    '"widgets": 26',
    '"previewModes": 8',
    '"sidebar": true',
    '"nara": true',
    '"authSession": true',
  ]) assert.ok(release.includes(marker), `missing release marker ${marker}`);

  assert.doesNotMatch(css, /#ngeblogging-studio-sidebar|\.nara-assistant|\.sv124-domain-page|\.ce-app|\.sn-side/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/);
  assert.doesNotMatch(runtime, /setInterval\s*\(/);
});
