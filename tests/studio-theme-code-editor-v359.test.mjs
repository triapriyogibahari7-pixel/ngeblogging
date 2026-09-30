import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const jsx=fs.readFileSync(new URL("../src/ThemeStudio.jsx",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../src/studio-theme-code-editor-v359.css",import.meta.url),"utf8");
const js=fs.readFileSync(new URL("../src/studio-theme-code-editor-v359.js",import.meta.url),"utf8");

test("ThemeStudio loads the editor-only v359 cascade",()=>{
  assert.match(jsx,/studio-theme-code-editor-v359\.js/);
});

test("v359 never mutates the sidebar",()=>{
  assert.match(js,/getBoundingClientRect/);
  assert.doesNotMatch(js,/sidebar\.(style|classList|innerHTML|textContent)/);
  assert.doesNotMatch(js,/removeChild|appendChild|replaceChildren/);
});

test("v359 keeps the real v350 1-10000 gutter",()=>{
  assert.match(css,/tn-code-gutter-v350/);
  assert.match(css,/display:block!important/);
  assert.match(css,/data-v350-source="ready"/);
  assert.doesNotMatch(css,/tn-code-gutter-v350[\\s\\S]{0,120}display:none!important/);
});

test("v359 wraps long source lines and prevents horizontal overflow",()=>{
  assert.match(css,/white-space:pre-wrap!important/);
  assert.match(css,/overflow-wrap:anywhere!important/);
  assert.match(css,/word-break:break-word!important/);
  assert.match(css,/overflow-x:hidden!important/);
});

test("v359 reserves the sidebar edge only for the editor modal",()=>{
  assert.match(css,/var\(--tn-v359-sidebar-right,232px\)/);
  assert.match(css,/data-v359-code-editor="ready"/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
});
