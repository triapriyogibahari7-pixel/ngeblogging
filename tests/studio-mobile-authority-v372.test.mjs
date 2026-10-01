import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/studio-mobile-authority-v372.css", import.meta.url), "utf8");
const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
const secure = await readFile(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");

test("v372 is loaded last in both editor entry points", () => {
  assert.match(editor, /import "\.\/studio-mobile-authority-v372\.css";/);
  assert.match(secure, /import "\.\/studio-mobile-authority-v372\.css";/);
  assert.ok(editor.lastIndexOf("studio-mobile-authority-v372.css") > editor.lastIndexOf(".css"));
  assert.ok(secure.lastIndexOf("studio-mobile-authority-v372.css") > secure.lastIndexOf(".css"));
});

test("v372 is small-device only", () => {
  assert.match(css, /html\.editor-v266-small/);
  assert.match(css, /html\[data-studio-device-mode="small"\]/);
  assert.doesNotMatch(css, /editor-v266-large/);
  assert.doesNotMatch(css, /data-studio-device-mode="large"/);
  assert.doesNotMatch(css, /@media\s*\(min-width/);
});

test("v372 gives the title a real mobile writing width", () => {
  assert.match(css, /\.ce-file\{[\s\S]*grid-template-columns:20px minmax\(0,1fr\)/);
  assert.match(css, /\.ce-file label[\s\S]*width:100%!important/);
  assert.match(css, /\.ce-file input[\s\S]*width:100%!important[\s\S]*font-size:16px!important/);
});

test("v372 keeps the editor in normal flow and removes accidental overlay geometry", () => {
  for (const selector of [".ce-titlebar",".ce-actions",".ce-tabs",".ce-ribbon",".ce-workspace",".ce-paper-shell",".ce-paper",".ce-sidebar"]) {
    assert.match(css, new RegExp(selector.replaceAll(".","\\.") + "[\\s\\S]*position:relative!important"));
  }
  assert.match(css, /\.ce-paper[\s\S]*visibility:visible!important[\s\S]*opacity:1!important/);
  assert.match(css, /\.ce-sidebar[\s\S]*border-top:1px solid/);
  assert.match(css, /\.ce-actions \.ce-primary[\s\S]*justify-self:stretch!important/);
});

test("v372 reserves overlays only for preview/media/source", () => {
  assert.match(css, /\.ce-preview-layer/);
  assert.match(css, /\.ce-media-layer/);
  assert.match(css, /\.ce-source-layer/);
  assert.match(css, /z-index:5000!important/);
});

test("editor semantic/SEO fields remain present", () => {
  assert.match(editor, /const isPage = doc\.type === "page"/);
  assert.match(editor, /canonicalUrl/);
  assert.match(editor, /schemaType/);
  assert.match(editor, /contentEditable/);
});
