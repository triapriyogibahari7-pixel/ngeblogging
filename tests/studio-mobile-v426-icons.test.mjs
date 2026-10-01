import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("v426 is the final handheld icon authority in StudioSecure", () => {
  const secure = read("src/StudioSecure.jsx");
  const css = read("src/studio-mobile-v426.css");

  assert.ok(secure.indexOf('studio-mobile-v426.css') > secure.indexOf('studio-mobile-v421.css'));
  assert.match(css, /\.sn-side\.mobile-open/);
  assert.match(css, /\.sn-side:not\(\.mobile-open\)/);
  assert.match(css, /width:21px!important/);
  assert.match(css, /height:21px!important/);
  assert.match(css, /width:42px!important/);
  assert.match(css, /height:42px!important/);
  assert.match(css, /width:52px!important/);
  assert.match(css, /height:52px!important/);
  assert.doesNotMatch(css, /width:18px!important/);
});

test("mobile sidebar has one React trigger and the sidebar N is the close button", () => {
  const studio = read("src/StudioNext.jsx");

  assert.match(studio, /\{\(deviceMode !== "small" \|\| !mobileSidebar\) && <button type="button" className="sn-icon sn-sidebar-toggle"/);
  assert.match(studio, /onClick=\{deviceMode === "small" \? \(\) => setMobileSidebar\(false\) : undefined\}/);
  assert.match(studio, /className="sn-logo-mark"/);
  assert.doesNotMatch(studio, /\{deviceMode !== "small" && <button className="sn-icon sn-sidebar-toggle"/);
});
