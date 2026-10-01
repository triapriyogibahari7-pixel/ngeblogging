import assert from "node:assert/strict";
import fs from "node:fs";

const studio=fs.readFileSync("src/Studio.jsx","utf8");
const css=fs.readFileSync("src/studio-mobile-all-pages-v370.css","utf8");
const editor=fs.readFileSync("src/content-editor.css","utf8");

assert.match(studio,/studio-mobile-all-pages-v370\.css/);
assert.match(css,/@media \(max-width:760px\)/);
assert.match(css,/\.sn-main,\n  \.sn-side\.collapsed\+\.sn-main/);
assert.match(css,/margin-left:0!important/);
assert.match(css,/\.sn-side\.mobile-open/);
assert.match(css,/\.sn-view-pad/);
assert.match(css,/\.sn-content-card/);
assert.match(css,/\.sn-media-grid/);
assert.match(css,/\.sn-api-page/);
assert.match(css,/\.sn-members-v304/);
assert.match(css,/\.sv124-comment-workspace/);
assert.match(css,/\.tn-code-workspace/);
assert.match(css,/\.tn-widget-grid/);
assert.match(css,/overflow-wrap:anywhere!important/);
assert.match(editor,/@media\(max-width:760px\)/);
assert.doesNotMatch(css,/@media \(min-width/);
assert.doesNotMatch(css,/@media \(min-width:761px/);
console.log("mobile-v370 assertions: 15 passed");
