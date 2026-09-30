import fs from "node:fs";
import assert from "node:assert/strict";

const jsx=fs.readFileSync("src/ThemeStudio.jsx","utf8");
const js=fs.readFileSync("src/studio-theme-code-editor-v361.js","utf8");
const css=fs.readFileSync("src/studio-theme-code-editor-v361.css","utf8");

assert.match(jsx,/studio-theme-code-editor-v361\.js/);
assert.match(js,/Array\.from\(\{length:10000\}/);
assert.match(js,/data-v361-code-editor/);
assert.match(js,/MutationObserver/);
assert.match(js,/getBoundingClientRect/);
assert.doesNotMatch(js,/sidebar\.style/);
assert.doesNotMatch(js,/sidebar\.classList/);
assert.match(css,/45fr/);
assert.match(css,/55fr/);
assert.match(css,/pre-wrap/);
assert.match(css,/overflow-wrap:anywhere/);
assert.match(css,/tn-code-gutter-v350/);
assert.match(css,/tn-code-gutter-v342/);
assert.match(css,/max-width:100%/);

console.log("v361 editor-only containment checks passed");
