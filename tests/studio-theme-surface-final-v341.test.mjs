import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v341 loads after v340 and is limited to Theme Studio", async () => {
  const [entry, runtime, css] = await Promise.all([
    read("src/studio-sidebar-direct-v300.js"),
    read("src/studio-theme-surface-final-v341.js"),
    read("src/studio-theme-surface-final-v341.css"),
  ]);
  const v340At = entry.indexOf('import "./studio-theme-final-v340.js"');
  const v341At = entry.indexOf('import "./studio-theme-surface-final-v341.js"');
  assert.ok(v340At >= 0 && v341At > v340At, "v341 must load after v340");
  assert.match(runtime, /STUDIO_THEME_SURFACE_FINAL_RELEASE_V341/);
  assert.match(css, /\.tn-studio/);
  assert.doesNotMatch(css, /#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.nara-assistant|\.nara-floating-button|\.sv124-domain-page|\.ce-app/);
});

test("v341 mobile Theme surface is bounded and does not use the legacy four-area canvas", async () => {
  const css = await read("src/studio-theme-surface-final-v341.css");
  assert.match(css, /data-studio-device-mode="small"/);
  assert.match(css, /\.tn-active-stage/);
  assert.match(css, /height:clamp\(300px,48dvh,420px\)!important/);
  assert.match(css, /\.tn-category-tabs/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(css, /\.tn-layout-studio \.tn-layout-canvas\{display:none!important\}/);
  assert.match(css, /\.tn-layout-map-v264/);
});

test("v341 keeps left widgets, centered post and right widgets recognizable on small screens", async () => {
  const css = await read("src/studio-theme-surface-final-v341.css");
  assert.match(css, /grid-template-columns:minmax\(56px,\.62fr\) minmax\(138px,1\.76fr\) minmax\(56px,\.62fr\)!important/);
  assert.match(css, /\.tn-layout-post-v264\{min-height:235px!important/);
  assert.match(css, /\.tn-layout-stack-v264/);
});

test("v341 patch rotates cache and preserves inherited authorities without logout", async () => {
  const [patch, release] = await Promise.all([
    read("scripts/patch-studio-theme-surface-final-v341.mjs"),
    read("public/release-v341.json"),
  ]);
  assert.match(patch, /ngeblogging-app-v341-theme-surface-final-20260807/);
  assert.match(patch, /studio-theme-surface-final-cache-v341/);
  assert.match(patch, /STUDIO_THEME_FINAL_RELEASE_V340/);
  assert.match(patch, /AUTH_SESSION_HANDOFF_RELEASE_V292/);
  assert.doesNotMatch(patch, /location\.(?:reload|replace)\s*\(/);
  assert.match(release, /"themes": 100/);
  assert.match(release, /"layoutAreas": 26/);
  assert.match(release, /"widgets": 26/);
  assert.match(release, /"previewModes": 8/);
  assert.match(release, /"realDeviceCertificationClaimed": false/);
});
