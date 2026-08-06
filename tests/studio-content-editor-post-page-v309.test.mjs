import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/studio-content-editor-post-page-polish-v309.css", import.meta.url), "utf8");
const css310 = await readFile(new URL("../src/studio-content-editor-desktop-site-v310.css", import.meta.url), "utf8");
const runtime = await readFile(new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url), "utf8");
const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
const studio = await readFile(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");

test("v309/v310 load after v308 and remain editor-only", () => {
  assert.match(runtime, /studio-content-editor-responsive-v308\.css/);
  assert.match(runtime, /studio-content-editor-post-page-polish-v309\.css/);
  assert.match(runtime, /studio-content-editor-desktop-site-v310\.css/);
  assert.match(runtime, /studio-content-editor-post-page-polish-v309-20260806/);
  assert.match(runtime, /studio-content-editor-desktop-site-v310-20260806/);
  for (const source of [css, css310]) {
    assert.doesNotMatch(source, /#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.ce-editor-side-v266|\.ce-editor-sidebar-toggle-v266/);
  }
});

test("large family removes excessive blank paper", () => {
  assert.match(css, /html\.editor-v266-large \.ce-paper\{/);
  assert.match(css, /min-height:clamp\(420px,46dvh,600px\)/);
  assert.match(css, /@media \(max-width:760px\)/);
  assert.match(css, /html\.editor-v266-large \.ce-workspace/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\)!important/);
});

test("v310 restores desktop composition for Android desktop-site and large tablets", () => {
  assert.match(css310, /@media \(min-width:820px\) and \(max-width:1080px\)/);
  assert.match(css310, /grid-template-columns:minmax\(0,1fr\) clamp\(260px,29vw,300px\)!important/);
  assert.match(css310, /min-height:clamp\(400px,44dvh,560px\)!important/);
  assert.match(css310, /position:sticky!important/);
  assert.match(css310, /max-width:300px!important/);
});

test("small family stays one-column, touch-safe and compact", () => {
  assert.match(css, /html\.editor-v266-small \.ce-paper/);
  assert.match(css, /min-height:clamp\(320px,42dvh,480px\)/);
  assert.match(css, /min-height:44px!important/);
  assert.match(css, /overflow-x:auto!important/);
  assert.match(css310, /html\.editor-v266-small \.ce-actions>button/);
  assert.match(css310, /min-height:44px!important/);
  assert.match(css310, /width:34px!important;height:34px!important/);
  assert.match(css310, /overflow-x:auto!important/);
});

test("Posts and Pages still share the same ContentEditor implementation", () => {
  assert.match(editor, /const isPage = doc\.type === "page"/);
  assert.match(studio, /<ContentEditor doc=\{active\}/);
  assert.match(studio, /active\.type === "page" \? "pages" : "posts"/);
});
