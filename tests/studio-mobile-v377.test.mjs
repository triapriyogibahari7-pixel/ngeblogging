import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = {
  next: await readFile(new URL("../src/StudioNext.jsx", import.meta.url), "utf8"),
  secure: await readFile(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8"),
  editor: await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8"),
  allPages: await readFile(new URL("../src/studio-mobile-all-pages-v377.css", import.meta.url), "utf8"),
  editorFix: await readFile(new URL("../src/studio-mobile-editor-v376.css", import.meta.url), "utf8"),
};

test("small-device authority styles load from Studio entry points", () => {
  assert.match(files.next, /studio-mobile-all-pages-v377\.css/);
  assert.match(files.secure, /studio-mobile-all-pages-v377\.css/);
  assert.match(files.editor, /studio-mobile-editor-v376\.css/);
});

test("all-page v377 covers every requested Studio surface", () => {
  for (const selector of [
    "sn-metrics","sn-content-card","tn-studio","sn-media-library",
    "sn-analytics-data-host","sn-members","sv124-comment-workspace",
    "sv124-domain-page","sn-api-page","sn-settings-grid"
  ]) assert.match(files.allPages, new RegExp(selector));
});

test("v377 is small-device-only", () => {
  assert.match(files.allPages, /editor-v266-small/);
  assert.match(files.allPages, /data-studio-device-mode="small"/);
  assert.doesNotMatch(files.allPages, /editor-v266-large/);
  assert.doesNotMatch(files.allPages, /data-studio-device-mode="large"/);
  assert.doesNotMatch(files.allPages, /tablet/);
  assert.doesNotMatch(files.allPages, /desktop/);
  assert.doesNotMatch(files.allPages, /laptop/);
  assert.doesNotMatch(files.allPages, /computer/);
});

test("v376 explicitly fixes the flex-to-grid root cause", () => {
  assert.match(files.editorFix, /\.ce-titlebar\{[\s\S]*display:grid!important/);
  assert.match(files.editorFix, /\.ce-file\{[\s\S]*display:grid!important/);
  assert.match(files.editorFix, /\.ce-file label\{[\s\S]*display:grid!important/);
  assert.match(files.editorFix, /\.ce-actions\{[\s\S]*display:grid!important/);
});

test("small editor keeps the real Nara button visible while large-device behavior remains hidden", async () => {
  const secure = await readFile(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");
  assert.match(secure, /isSmallEditor/);
  assert.match(secure, /documentElement\.classList\.contains\("editor-v266-small"\)/);
  assert.match(secure, /dataset\.studioDeviceMode === "small"/);
  assert.match(secure, /shell\.querySelectorAll\("\.ce-nara"\)/);
  assert.match(secure, /if \(isSmallEditor\)/);
  assert.match(secure, /button\.hidden = false/);
});
