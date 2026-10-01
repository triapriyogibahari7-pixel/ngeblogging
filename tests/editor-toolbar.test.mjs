import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const editor = readFileSync(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("advanced typography is integrated directly in the React editor", () => {
  assert.match(editor, /function command/);
  assert.match(editor, /contentEditable/);
  assert.match(editor, /onInput=.*patch/);
  assert.doesNotMatch(index, /editor-toolbar-bridge\.js/);
});

test("editor exposes font sizes font families and text colors", () => {
  for (const size of ["12", "14", "16", "20", "28", "38", "52"]) {
    assert.match(editor, new RegExp(`>${size}\\{?[^<]*px|["']${size}["']`));
  }
  assert.match(editor, /fontName/);
  assert.match(editor, /fontSize/);
  assert.match(editor, /foreColor/);
  assert.match(editor, /hiliteColor/);
  assert.match(editor, /type="color"/);
});

test("editor exposes formatting layout media tables links and HTML source", () => {
  for (const command of ["removeFormat", "insertUnorderedList", "insertOrderedList", "justifyLeft", "justifyCenter", "justifyRight", "justifyFull"]) {
    assert.match(editor, new RegExp(command));
  }
  assert.match(editor, /insertTable/);
  assert.match(editor, /insertLink/);
  assert.match(editor, /insertMedia/);
  assert.match(editor, /sourceDraft/);
  assert.match(editor, /HTML konten disimpan/);
});

test("contenteditable stays mounted while autosave state changes", () => {
  assert.match(editor, /const RichTextEditor = memo\(function RichTextEditor/);
  assert.match(editor, /patchRef\.current\?\.\(\{ content: event\.currentTarget\.innerHTML \}\)/);
  assert.match(editor, /previous\.documentId === next\.documentId/);
  assert.match(editor, /editor\.current\?\.sync\(doc\.content \|\| ""\)/);
  assert.match(editor, /if \(document\.activeElement === root\) return/);
  assert.match(editor, /className="ce-paper" contentEditable suppressContentEditableWarning onInput=/);
});

test("editor formatting immediately patches React autosave state", () => {
  assert.match(editor, /patch\(\{ content: editor\.current\?\.innerHTML/);
  assert.match(editor, /onInput=\{\(event\) => patch\(\{ content:/);
});
