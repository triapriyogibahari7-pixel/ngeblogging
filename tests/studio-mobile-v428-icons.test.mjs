import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("v428 covers every handheld family without adding a second N", () => {
  const studio = read("src/StudioNext.jsx");
  const root = read("src/Studio.jsx");
  const css = read("src/studio-mobile-v428.css");
  assert.match(studio, /<aside id="ngeblogging-studio-sidebar"/);
  assert.match(studio, /className="sn-logo-mark"/);
  assert.match(studio, /\{deviceMode !== "small" && <button className="sn-icon sn-sidebar-toggle"/);
  assert.match(css, /data-studio-device-mode="small"/);
  assert.match(css, /data-studio-responsive-mode="application"/);
  assert.match(css, /data-studio-responsive-mode="phone"/);
  assert.match(css, /data-studio-responsive-mode="mobile"/);
  assert.match(css, /data-studio-responsive-mode="compact"/);
  assert.match(css, /#ngeblogging-studio-sidebar:not\(\.mobile-open\)/);
  assert.match(css, /\.sn-logo-mark>strong/);
  assert.match(css, /\.nara-floating-button>\.nara-launcher-icon-box>svg/);
  assert.match(css, /width:18px!important/);
  assert.match(css, /height:18px!important/);
  assert.ok(root.indexOf('import "./studio-mobile-v428.css"') > root.indexOf('import "./studio-mobile-v427.css"'));
  assert.doesNotMatch(css, /sn-mobile-menu-mark/);
});

test("v428 does not alter desktop/tablet", () => {
  const css = read("src/studio-mobile-v428.css");
  assert.match(css, /@media screen and \(max-width:760px\)/);
  assert.doesNotMatch(css, /min-width:\s*761px/);
});
