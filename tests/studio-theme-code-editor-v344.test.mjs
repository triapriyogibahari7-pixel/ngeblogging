import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v344 loads after v343 and only tightens Theme code editor geometry", async () => {
  const [entry, runtime, css, release] = await Promise.all([
    read("src/studio-theme-surface-final-v341.js"),
    read("src/studio-theme-code-editor-v344.js"),
    read("src/studio-theme-code-editor-v344.css"),
    read("public/release-v344.json"),
  ]);

  const v343At = entry.indexOf('import "./studio-theme-code-editor-v343.js"');
  const v344At = entry.indexOf('import "./studio-theme-code-editor-v344.js"');
  assert.ok(v343At >= 0, "v343 must remain loaded");
  assert.ok(v344At > v343At, "v344 must load after v343");
  assert.match(runtime, /STUDIO_THEME_CODE_EDITOR_RELEASE_V344/);
  assert.match(css, /grid-template-areas:"preview" "code"!important/);
  assert.match(css, /height:clamp\(400px,45dvh,500px\)!important/);
  assert.match(css, /height:clamp\(340px,41dvh,420px\)!important/);
  assert.match(release, /"shorterCodeWorkspace": true/);
});

test("v344 keeps the real v342 1-10000 gutter visible and readable", async () => {
  const [css, v342, release] = await Promise.all([
    read("src/studio-theme-code-editor-v344.css"),
    read("src/studio-theme-code-editor-v342.js"),
    read("public/release-v344.json"),
  ]);

  assert.match(v342, /THEME_CODE_EDITOR_LINE_GUIDE_V342 = 10000/);
  assert.match(v342, /gutter\.scrollTop = textarea\.scrollTop/);
  assert.match(css, /\.tn-code-gutter-v342/);
  assert.match(css, /width:60px!important/);
  assert.match(css, /color:#aebcd0!important/);
  assert.match(css, /z-index:2!important/);
  assert.match(release, /"realLineNumbers": 10000/);
  assert.match(release, /"lineNumberGutterStrengthened": true/);
});

test("v344 does not restyle protected Studio surfaces", async () => {
  const css = await read("src/studio-theme-code-editor-v344.css");
  assert.doesNotMatch(css, /#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.nara-assistant|\.nara-floating-button|\.sv124-domain-page|\.ce-app/);
});
