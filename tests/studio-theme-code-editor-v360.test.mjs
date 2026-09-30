import assert from "node:assert/strict";
import fs from "node:fs";

const jsx=fs.readFileSync("src/ThemeStudio.jsx","utf8");
const css=fs.readFileSync("src/studio-theme-code-editor-v360.css","utf8");
const js=fs.readFileSync("src/studio-theme-code-editor-v360.js","utf8");

assert.match(jsx,/studio-theme-code-editor-v360\.js/);
assert.match(js,/data\.v360CodeEditor/);\nassert.match(js,/Array\.from\(\{length:10000\}/);
assert.match(js,/getBoundingClientRect/);
assert.doesNotMatch(js,/sidebar\.style|sidebar\.classList|sidebar\.remove|sidebar\.append|sidebar\.removeChild/);
assert.match(css,/data-v360-code-editor="ready"/);
assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
assert.match(css,/white-space:pre-wrap/);
assert.match(css,/overflow-wrap:anywhere/);
assert.match(css,/overflow-x:hidden/);
assert.match(css,/tn-code-gutter-v350/);
assert.match(css,/tn-code-gutter-v342/);
assert.match(css,/max-width:100%/);
console.log("v360 editor regression checks passed");
