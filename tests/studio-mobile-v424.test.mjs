import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const studio = await readFile(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/studio-mobile-v424.css", import.meta.url), "utf8");

test("v424 is the only final mobile icon layer imported by StudioNext", () => {
  assert.match(studio, /studio-mobile-v424\.css/);
  assert.doesNotMatch(studio, /studio-mobile-v421\.css/);
  assert.doesNotMatch(studio, /studio-mobile-v422\.css/);
  assert.doesNotMatch(studio, /studio-mobile-v423\.css/);
});

test("mobile sidebar has one N glyph and the open drawer N closes the drawer", () => {
  assert.equal((studio.match(/className="sn-mobile-menu-mark"[^>]*><strong>n<\/strong>/g) || []).length, 1);
  assert.match(studio, /className="sn-logo-mark" role="button"/);
  assert.match(studio, /onClick=\{deviceMode === "small" \? toggleSidebar : undefined\}/);
  assert.match(studio, /onKeyDown=\{deviceMode === "small"/);
  assert.match(css, /sn-logo-mark>strong/);
  assert.match(css, /sn-logo-mark>i/);
  assert.match(css, /display:none!important/);
  assert.match(css, /overflow:visible!important/);
});

test("Nara mobile geometry matches the Post/Pages editor reference", () => {
  assert.match(css, /width:54px!important/);
  assert.match(css, /height:54px!important/);
  assert.match(css, /width:42px!important/);
  assert.match(css, /height:42px!important/);
  assert.match(css, /width:21px!important/);
  assert.match(css, /height:21px!important/);
  assert.match(css, /transform:none!important/);
});
