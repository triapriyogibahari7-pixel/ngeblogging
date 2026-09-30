import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("v358 is loaded after v357 and is editor-only",async()=>{
  const [entry,runtime,css]=await Promise.all([
    read("src/ThemeStudio.jsx"),
    read("src/studio-theme-code-editor-v358.js"),
    read("src/studio-theme-code-editor-v358.css"),
  ]);
  assert.match(entry,/studio-theme-code-editor-v357\.js/);
  assert.match(entry,/studio-theme-code-editor-v358\.js/);
  assert.ok(entry.indexOf("studio-theme-code-editor-v358.js")>entry.indexOf("studio-theme-code-editor-v357.js"));
  assert.match(runtime,/STUDIO_THEME_CODE_EDITOR_RELEASE_V358/);
  assert.match(runtime,/--tn-v358-sidebar-right/);
  assert.match(runtime,/getBoundingClientRect/);
  assert.match(css,/data-v358-code-editor="ready"/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css,/white-space:pre-wrap!important/);
  assert.match(css,/overflow-wrap:anywhere!important/);
  assert.match(css,/\.tn-code-gutter-v350/);
  assert.doesNotMatch(css,/#ngeblogging-studio-sidebar\{|\.sn-side\{|\.nara-assistant\{|\.nara-floating-button\{/);
});

test("v358 protects the editor from horizontal overflow while retaining real 1-10000 numbering",async()=>{
  const [runtime,css,v350]=await Promise.all([
    read("src/studio-theme-code-editor-v358.js"),
    read("src/studio-theme-code-editor-v358.css"),
    read("src/studio-theme-code-editor-v350.js"),
  ]);
  assert.match(v350,/LINE_LIMIT=10000/);
  assert.match(v350,/Array\.from\(\{length:LINE_LIMIT\}/);
  assert.match(runtime,/tn-code-gutter-v350/);
  assert.match(css,/overflow-x:hidden!important/);
  assert.match(css,/word-break:break-word!important/);
  assert.match(css,/min-width:0!important/);
});

test("v358 never writes to sidebar geometry",async()=>{
  const [runtime,css]=await Promise.all([
    read("src/studio-theme-code-editor-v358.js"),
    read("src/studio-theme-code-editor-v358.css"),
  ]);
  assert.doesNotMatch(runtime,/sidebar\.(style|classList|setAttribute|removeAttribute)/);
  assert.doesNotMatch(runtime,/sidebar\.style\./);
  assert.doesNotMatch(css,/#ngeblogging-studio-sidebar[^,]*\{/);
});
