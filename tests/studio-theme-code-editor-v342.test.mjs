import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v342 loads after the final Theme surface and owns only the code editor", async () => {
  const [entry, runtime, css, release] = await Promise.all([
    read("src/studio-theme-surface-final-v341.js"),
    read("src/studio-theme-code-editor-v342.js"),
    read("src/studio-theme-code-editor-v342.css"),
    read("public/release-v342.json"),
  ]);

  assert.match(entry, /import "\.\/studio-theme-code-editor-v342\.js";/);
  assert.match(runtime, /STUDIO_THEME_CODE_EDITOR_RELEASE_V342/);
  assert.match(runtime, /THEME_CODE_EDITOR_LINE_GUIDE_V342 = 10000/);
  assert.match(runtime, /Array\.from\(\{ length: THEME_CODE_EDITOR_LINE_GUIDE_V342 \}/);
  assert.match(css, /--studio-theme-code-editor-v342/);
  assert.match(release, /"realLineNumbers": 10000/);
  assert.doesNotMatch(css, /#ngeblogging-studio-sidebar|\.sn-side|\.nara-assistant|\.sv124-domain-page|\.ce-app/);
});

test("v342 desktop editor matches the reference split and compact editor remains vertical", async () => {
  const [runtime, css] = await Promise.all([
    read("src/studio-theme-code-editor-v342.js"),
    read("src/studio-theme-code-editor-v342.css"),
  ]);

  assert.match(runtime, /responsive === "desktop"/);
  assert.match(runtime, /COMPACT_MODES/);
  assert.match(css, /data-v342-editor-family="large"/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css, /grid-template-areas:"code preview"!important/);
  assert.match(css, /data-v342-editor-family="compact"/);
  assert.match(css, /grid-template-areas:"preview" "code"!important/);
});

test("v342 editor is dark readable, scrollable and has one synchronized gutter", async () => {
  const [runtime, css] = await Promise.all([
    read("src/studio-theme-code-editor-v342.js"),
    read("src/studio-theme-code-editor-v342.css"),
  ]);

  assert.match(runtime, /gutters\.forEach/);
  assert.match(runtime, /node !== gutter/);
  assert.match(runtime, /gutter\.scrollTop = textarea\.scrollTop/);
  assert.match(runtime, /textarea\.wrap = "off"/);
  assert.match(css, /\.tn-code-gutter-v342/);
  assert.match(css, /background:#0c1525!important/);
  assert.match(css, /white-space:pre!important/);
  assert.match(css, /overflow:auto!important/);
});
