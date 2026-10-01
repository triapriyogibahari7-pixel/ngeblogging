import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("v430 closed mobile sidebar paints only the original N", () => {
  const studio = read("src/StudioNext.jsx");
  const css = read("src/studio-mobile-v430.css");
  assert.match(studio, /className="sn-logo-mark"/);
  assert.match(css, /#ngeblogging-studio-sidebar:not\(\.mobile-open\)>\.sn-logo>b/);
  assert.match(css, /#ngeblogging-studio-sidebar:not\(\.mobile-open\)>\.sn-logo>\.sn-side-close/);
  assert.match(css, /#ngeblogging-studio-sidebar:not\(\.mobile-open\)>:not\(\.sn-logo\)/);
  assert.match(css, /\.sn-logo-mark>strong/);
  assert.match(css, /overflow:visible!important/);
  assert.doesNotMatch(css, /sn-mobile-menu-mark/);
});

test("v430 Nara matches the editor button geometry", () => {
  const css = read("src/studio-mobile-v430.css");
  assert.match(css, /grid-template-columns:40px!important/);
  assert.match(css, /width:40px!important/);
  assert.match(css, /width:18px!important/);
  assert.match(css, /height:18px!important/);
  assert.match(css, /transform:translateX\(1px\)!important/);
});
