import fs from "node:fs";
import assert from "node:assert/strict";

const jsx=fs.readFileSync("src/ThemeStudio.jsx","utf8");
const js=fs.readFileSync("src/studio-theme-code-editor-v362.js","utf8");
const css=fs.readFileSync("src/studio-theme-code-editor-v362.css","utf8");

assert.match(jsx,/studio-theme-code-editor-v362\.js/);
assert.doesNotMatch(jsx,/studio-theme-code-editor-v361\.js/);
assert.match(js,/Array\.from\(\{length:10000\}/);
assert.match(js,/data\.v362CodeEditor/);
assert.match(js,/getBoundingClientRect/);
assert.doesNotMatch(js,/sidebar\.style/);
assert.doesNotMatch(js,/sidebar\.classList/);
assert.doesNotMatch(js,/sidebar\.remove/);
assert.match(css,/data-v362-code-editor="ready"/);
assert.match(css,/42fr/);
assert.match(css,/58fr/);
assert.match(css,/white-space:pre-wrap/);
assert.match(css,/overflow-wrap:anywhere/);
assert.match(css,/overflow-x:hidden/);
assert.match(css,/tn-code-gutter-v350/);
assert.match(css,/tn-code-gutter-v342/);
assert.match(css,/max-width:100%/);
assert.match(css,/calc\(var\(--tn-v362-editor-left,232px\) \+ 8px\)/);

console.log("v362 editor-only checks passed");
