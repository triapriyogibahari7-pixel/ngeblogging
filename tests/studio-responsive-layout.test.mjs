import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/studio-responsive-fix.css", import.meta.url), "utf8");

test("Studio loads the final responsive override after module styles", () => {
  assert.match(index, /studio-responsive-fix\.css/);
  assert.match(index, /width=device-width,initial-scale=1,viewport-fit=cover/);
  assert.doesNotMatch(index, /maximum-scale=1/);
});

test("small screens remove the desktop rail and use the full viewport", () => {
  assert.match(css, /@media\(max-width:1100px\)/);
  assert.match(css, /\.sn-side\{display:none!important\}/);
  assert.match(css, /margin-left:0!important/);
  assert.match(css, /width:100%!important/);
  assert.match(css, /\.sn-mobile-nav\{display:flex!important\}/);
});

test("Settings is full width while preserving its content and backup center", () => {
  assert.match(css, /body:has\(\.sn-settings-grid\) \.sn-side/);
  assert.match(css, /\.sn-settings-grid\{grid-template-columns:1fr!important;width:100%\}/);
  assert.match(css, /\.bc-center/);
  assert.match(css, /\.bc-actions button\{width:100%!important/);
});

test("only truly empty sidebar containers are suppressed", () => {
  assert.match(css, /aside:empty/);
  assert.match(css, /div:empty\[data-sidebar\]/);
  assert.doesNotMatch(css, /section:empty/);
});
