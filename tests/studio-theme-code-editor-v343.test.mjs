import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v343 loads after the v342 Theme code editor", async () => {
  const entry = await read("src/studio-theme-surface-final-v341.js");
  const v342 = entry.indexOf('import "./studio-theme-code-editor-v342.js"');
  const v343 = entry.indexOf('import "./studio-theme-code-editor-v343.js"');
  assert.ok(v342 >= 0, "v342 editor must remain loaded");
  assert.ok(v343 > v342, "v343 compact height polish must load after v342");
});

test("v343 shortens only the compact vertical editor and keeps the 10000 gutter visible", async () => {
  const [css, release] = await Promise.all([
    read("src/studio-theme-code-editor-v343.css"),
    read("public/release-v343.json"),
  ]);

  assert.match(css, /data-v342-editor-family="compact"/);
  assert.match(css, /max-height:640px!important/);
  assert.match(css, /max-height:540px!important/);
  assert.match(css, /max-height:510px!important/);
  assert.match(css, /\.tn-code-gutter-v342/);
  assert.match(css, /textarea\[data-v342-code-source="ready"\]/);
  assert.doesNotMatch(css, /data-v342-editor-family="large"/);
  assert.doesNotMatch(css, /#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.nara-assistant|\.nara-floating-button|\.sv124-domain-page|\.ce-app/);

  assert.match(release, /"inheritsV342Editor": true/);
  assert.match(release, /"realLineNumbersPreserved": 10000/);
  assert.match(release, /"desktopSplit5050Preserved": true/);
  assert.match(release, /"realDeviceCertificationClaimed": false/);
});
