import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/studio-mobile-editor-v375.css", import.meta.url), "utf8");

test("v375 is the last imported editor stylesheet", () => {
  const v373 = editor.indexOf('import "./studio-mobile-editor-v373.css";');
  const v375 = editor.indexOf('import "./studio-mobile-editor-v375.css";');
  assert.ok(v373 >= 0 && v375 > v373);
  assert.equal(editor.slice(v375).trimStart().startsWith('import'), true);
});

test("v375 is strictly small-device scoped", () => {
  assert.match(css, /html\.editor-v266-small/);
  assert.match(css, /data-studio-device-mode="small"/);
  assert.doesNotMatch(css, /editor-v266-large/);
  assert.doesNotMatch(css, /data-studio-device-mode="large"/);
  assert.doesNotMatch(css, /data-studio-responsive-mode="tablet"/);
});

test("v375 prevents the injected navigation from covering the editor", () => {
  assert.match(css, /#ngeblogging-editor-nav-v266[\s\S]*pointer-events:none!important/);
  assert.match(css, /ce-editor-side-v266[\s\S]*visibility:hidden!important[\s\S]*opacity:0!important/);
  assert.match(css, /mobile-open[\s\S]*ce-editor-side-v266[\s\S]*visibility:visible!important/);
});

test("v375 gives the title field real width and keeps actions in the second row", () => {
  assert.match(css, /grid-template-areas:"back file" "actions actions"/);
  assert.match(css, /ce-file input[\s\S]*width:100%!important[\s\S]*font-size:16px!important/);
  assert.match(css, /ce-actions[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
});

test("v375 keeps the writing canvas in normal document flow", () => {
  assert.match(css, /ce-workspace[\s\S]*position:relative!important[\s\S]*overflow:visible!important/);
  assert.match(css, /ce-paper-shell[\s\S]*position:relative!important/);
  assert.match(css, /ce-paper[\s\S]*visibility:visible!important[\s\S]*opacity:1!important[\s\S]*transform:none!important/);
  assert.match(css, /ce-sidebar[\s\S]*grid-template-columns:minmax\(0,1fr\)!important/);
});

test("v375 removes the old long boxed status treatment", () => {
  assert.match(css, /ce-word-status[\s\S]*border:0!important[\s\S]*background:transparent!important/);
});
