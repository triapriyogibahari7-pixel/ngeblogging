import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/studio-mobile-editor-v376.css", import.meta.url), "utf8");

test("v376 is loaded after v375", () => {
  assert.ok(editor.indexOf('import "./studio-mobile-editor-v376.css";') > editor.indexOf('import "./studio-mobile-editor-v375.css";'));
});

test("v376 explicitly activates grid for the containers that were previously flex", () => {
  assert.match(css, /\.ce-titlebar\{[\s\S]*display:grid!important/);
  assert.match(css, /\.ce-file\{[\s\S]*display:grid!important/);
  assert.match(css, /\.ce-file label\{[\s\S]*display:grid!important/);
  assert.match(css, /\.ce-actions\{[\s\S]*display:grid!important/);
});

test("v376 remains small-device-only", () => {
  assert.doesNotMatch(css, /editor-v266-large/);
  assert.doesNotMatch(css, /data-studio-device-mode="large"/);
  assert.doesNotMatch(css, /tablet/);
  assert.match(css, /editor-v266-small/);
  assert.match(css, /data-studio-device-mode="small"/);
});
