import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/studio-content-editor-post-page-polish-v309.css", import.meta.url), "utf8");
const runtime = await readFile(new URL("../src/studio-content-editor-responsive-v308.js", import.meta.url), "utf8");
const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
const studio = await readFile(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");

test("v309 loads after v308 and remains editor-only", () => {
  assert.match(runtime, /studio-content-editor-responsive-v308\.css/);
  assert.match(runtime, /studio-content-editor-post-page-polish-v309\.css/);
  assert.match(runtime, /studio-content-editor-post-page-polish-v309-20260806/);
  assert.doesNotMatch(css, /#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.ce-editor-side-v266|\.ce-editor-sidebar-toggle-v266/);
});

test("large family removes excessive blank paper and survives desktop-site on a narrow viewport", () => {
  assert.match(css, /html\.editor-v266-large \.ce-paper\{/);
  assert.match(css, /min-height:clamp\(420px,46dvh,600px\)/);
  assert.match(css, /@media \(max-width:760px\)/);
  assert.match(css, /html\.editor-v266-large \.ce-workspace/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\)!important/);
});

test("small family stays one-column, touch-safe and compact", () => {
  assert.match(css, /html\.editor-v266-small \.ce-paper/);
  assert.match(css, /min-height:clamp\(320px,42dvh,480px\)/);
  assert.match(css, /min-height:44px!important/);
  assert.match(css, /overflow-x:auto!important/);
});

test("Posts and Pages still share the same ContentEditor implementation", () => {
  assert.match(editor, /const isPage = doc\.type === "page"/);
  assert.match(studio, /<ContentEditor doc=\{active\}/);
  assert.match(studio, /active\.type === "page" \? "pages" : "posts"/);
});
