import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("v426 is the final mobile icon authority in StudioSecure", () => {
  const secure = read("src/StudioSecure.jsx");
  const css = read("src/studio-mobile-v426.css");
  const sw = read("public/sw.js");

  assert.ok(secure.indexOf('studio-mobile-v426.css') > secure.indexOf('studio-mobile-v421.css'));
  assert.match(css, /html body:not\(\.sn-mobile-sidebar-open\)[\s\S]*\.sn-sidebar-toggle/);
  assert.match(css, /\.sn-logo-mark>strong/);
  assert.match(css, /\.nara-floating-button>[.]nara-launcher-icon-box>svg/);
  assert.match(css, /width:18px!important/);
  assert.match(css, /height:18px!important/);
  assert.match(sw, /ngeblogging-app-v426-mobile-icons-20261001/);
});

test("Studio keeps one React N trigger while drawer is open", () => {
  const studio = read("src/StudioNext.jsx");
  assert.match(studio, /\{!mobileSidebar && <button className="sn-icon sn-sidebar-toggle"/);
  assert.match(studio, /className="sn-logo-mark"/);
  assert.doesNotMatch(studio, /mobileSidebar &&[\s\S]{0,300}sn-sidebar-toggle/);
});
