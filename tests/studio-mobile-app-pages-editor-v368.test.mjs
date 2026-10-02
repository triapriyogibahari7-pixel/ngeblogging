import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/studio-mobile-final-v369.css", import.meta.url), "utf8");
const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
const studio = await readFile(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");
const sw = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");

test("v369 mobile authority is loaded after existing editor/studio CSS", () => {
  assert.match(editor, /content-editor-mobile-v324\.css/);
  assert.match(editor, /studio-mobile-app-pages-editor-v368\.css/);
  assert.match(studio, /studio-recovery-v135\.css/);
  assert.match(studio, /studio-mobile-app-pages-editor-v368\.css/);
});

test("v369 only targets the small device family", () => {
  assert.match(css, /html\[data-studio-device-mode="small"\]/);
  assert.match(css, /html\.editor-v266-small/);
  assert.doesNotMatch(css, /data-studio-device-mode="large"/);
  assert.doesNotMatch(css, /editor-v266-large/);
  assert.doesNotMatch(css, /@media\s*\(min-width/);
});

test("v369 covers every requested Studio surface without changing semantics", () => {
  for (const marker of [
    ".sn-view-pad",
    ".sn-content-card",
    ".sn-settings-grid",
    ".sn-members",
    ".sn-api-page",
    ".sv124-comments-page",
    ".sv124-domain-page",
    ".tn-studio",
    ".sn-analytics-data-host",
    ".ce-app",
    ".ce-paper",
    ".ce-sidebar",
    ".ce-preview-layer",
    ".ce-source-layer",
  ]) assert.match(css, new RegExp(marker.replaceAll(".", "\\.")));
  assert.match(css, /overflow-wrap:anywhere/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /font-size:16px/);
  assert.match(css, /display-mode: standalone/);
});

test("v369 keeps editor SEO/content implementation unchanged", () => {
  assert.match(editor, /const isPage = doc\.type === "page"/);
  assert.match(editor, /dangerouslySetInnerHTML=\{\{ __html: doc\.content \|\| "" \}\}/);
  assert.match(editor, /<h1>\{doc\.title\}<\/h1>/);
  assert.match(editor, /canonicalUrl/);
  assert.match(editor, /schemaType/);
});

test("v369 bumps the service-worker cache so stale mobile CSS is not retained", () => {
  assert.match(sw, /ngeblogging-app-v369-mobile-final-20261001/);
  assert.match(sw, /studio-mobile-final-cache-v369/);
  assert.match(sw, /mobile-final-v369/);
});

test("v369 editor uses natural mobile flow and never changes large layout", () => {
  assert.match(css, /\.ce-titlebar[\s\S]*position:relative!important/);
  assert.match(css, /\.ce-tabs[\s\S]*position:relative!important/);
  assert.match(css, /\.ce-ribbon[\s\S]*position:relative!important/);
  assert.match(css, /\.ce-workspace[\s\S]*display:flex!important/);
  assert.match(css, /\.ce-field-grid[\s\S]*grid-template-columns:minmax\(0,1fr\)!important/);
  assert.doesNotMatch(css, /html\.editor-v266-large/);
  assert.doesNotMatch(css, /data-studio-device-mode="large"/);
});
