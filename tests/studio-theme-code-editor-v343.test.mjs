import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v343 loads after the v342 Theme code editor", async () => {
  const entry = await read("src/studio-theme-surface-final-v341.js");
  const v342 = entry.indexOf('import "./studio-theme-code-editor-v342.js"');
  const v343 = entry.indexOf('import "./studio-theme-code-editor-v343.js"');
  assert.ok(v342 >= 0, "v342 editor must remain loaded");
  assert.ok(v343 > v342, "v343 geometry authority must load after v342");
});

test("v343 matches the supplied preview-above-code reference in every Studio family", async () => {
  const css = await read("src/studio-theme-code-editor-v343.css");

  assert.match(css, /data-v342-editor="ready"/);
  assert.match(css, /grid-template-areas:"preview" "code"!important/);
  assert.match(css, /height:clamp\(250px,33dvh,350px\)!important/);
  assert.match(css, /height:clamp\(460px,52dvh,590px\)!important/);
  assert.match(css, /data-studio-handheld="true"/);
  assert.match(css, /data-studio-device-mode="small"/);
  assert.match(css, /height:clamp\(400px,48dvh,500px\)!important/);
});

test("v343 keeps the dark source surface and one visible synchronized 1-10000 gutter", async () => {
  const [css, release, v342] = await Promise.all([
    read("src/studio-theme-code-editor-v343.css"),
    read("public/release-v343.json"),
    read("src/studio-theme-code-editor-v342.js"),
  ]);

  assert.match(css, /\.tn-code-gutter-v342/);
  assert.match(css, /width:56px!important/);
  assert.match(css, /background:#091321!important/);
  assert.match(css, /textarea\[data-v342-code-source="ready"\]/);
  assert.match(css, /background:#0c1525!important/);
  assert.match(v342, /THEME_CODE_EDITOR_LINE_GUIDE_V342 = 10000/);
  assert.match(v342, /gutter\.scrollTop = textarea\.scrollTop/);
  assert.doesNotMatch(css, /#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.nara-assistant|\.nara-floating-button|\.sv124-domain-page|\.ce-app/);

  assert.match(release, /"previewAboveCodeAllStudioModes": true/);
  assert.match(release, /"desktopSiteOnHandheldUsesStackedEditor": true/);
  assert.match(release, /"realLineNumbers": 10000/);
  assert.match(release, /"serviceWorkerCacheRotated": true/);
  assert.match(release, /"realDeviceCertificationClaimed": false/);
});
