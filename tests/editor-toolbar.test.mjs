import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const bridge = readFileSync(new URL("../src/editor-toolbar-bridge.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("advanced typography bridge is loaded by the application", () => {
  assert.match(index, /editor-toolbar-bridge\.js/);
});

test("editor exposes precise font sizes and text colors", () => {
  assert.match(bridge, /12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 72/);
  assert.match(bridge, /foreColor/);
  assert.match(bridge, /hiliteColor/);
  assert.match(bridge, /applyFontSize/);
});

test("editor exposes spacing, clear formatting, and separators", () => {
  assert.match(bridge, /applyLineHeight/);
  assert.match(bridge, /applyLetterSpacing/);
  assert.match(bridge, /removeFormat/);
  assert.match(bridge, /insertHorizontalRule/);
});

test("advanced controls notify React autosave after formatting", () => {
  assert.match(bridge, /new InputEvent\("input"/);
  assert.match(bridge, /editor\.dispatchEvent/);
});
