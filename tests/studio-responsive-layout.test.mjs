import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/studio-responsive-fix.css", import.meta.url), "utf8");
const studio = readFileSync(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");

test("Studio loads the final responsive override after module styles", () => {
  assert.match(index, /studio-responsive-fix\.css/);
  assert.match(index, /width=device-width,initial-scale=1,viewport-fit=cover/);
  assert.doesNotMatch(index, /maximum-scale=1/);
});

test("small screens keep the left sidebar as a toggleable drawer", () => {
  assert.match(css, /@media\(max-width:1100px\)/);
  assert.match(css, /\.sn-side\{[\s\S]*display:flex!important/);
  assert.match(css, /transform:translateX\(0\)/);
  assert.match(css, /\.sn-side\.collapsed\{[\s\S]*translateX\(calc\(-100% - 12px\)\)/);
  assert.match(css, /\.sn-icon\{[\s\S]*display:grid!important/);
  assert.match(css, /\.sn-side:not\(\.collapsed\)\+\.sn-main \.sn-icon/);
  assert.doesNotMatch(css, /\.sn-side\{display:none!important\}/);
});

test("the existing Studio button controls the same sidebar state", () => {
  assert.match(studio, /const \[sidebar,setSidebar\] = useState\(true\)/);
  assert.match(studio, /className=\{sidebar\?"sn-side":"sn-side collapsed"\}/);
  assert.match(studio, /className="sn-icon" onClick=\{\(\)=>setSidebar\(!sidebar\)\}/);
  assert.match(studio, /<PanelLeftClose\/>/);
});

test("Settings keeps the sidebar while its content remains responsive", () => {
  assert.doesNotMatch(css, /body:has\(\.sn-settings-grid\) \.sn-side/);
  assert.match(css, /\.sn-settings-grid\{grid-template-columns:1fr!important;width:100%\}/);
  assert.match(css, /\.bc-center/);
  assert.match(css, /\.bc-actions button\{width:100%!important/);
});

test("only truly empty sidebar containers are suppressed", () => {
  assert.match(css, /aside:empty/);
  assert.match(css, /div:empty\[data-sidebar\]/);
  assert.doesNotMatch(css, /section:empty/);
});
