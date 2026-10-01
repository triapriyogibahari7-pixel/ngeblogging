import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

test("v429 keeps one original sidebar N and editor-matched Nara geometry", () => {
  const studio = read("src/StudioNext.jsx");
  const root = read("src/Studio.jsx");
  const css = read("src/studio-mobile-v429.css");
  const sw = read("public/sw.js");

  assert.match(studio, /<aside id="ngeblogging-studio-sidebar"/);
  assert.match(studio, /deviceMode !== "small" && <button className="sn-icon sn-sidebar-toggle"/);
  assert.doesNotMatch(studio, /deviceMode !== "small" \|\| !mobileSidebar/);

  assert.ok(root.indexOf('import "./studio-mobile-v429.css"') > root.indexOf('import "./studio-mobile-v428.css"'));
  assert.match(css, /data-studio-device-mode="small"/);
  assert.match(css, /data-studio-responsive-mode="application"/);
  assert.match(css, /data-studio-responsive-mode="phone"/);
  assert.match(css, /data-studio-responsive-mode="mobile"/);
  assert.match(css, /data-studio-responsive-mode="compact"/);
  assert.match(css, /width:48px!important/);
  assert.match(css, /left:max\(8px/);
  assert.match(css, /\.sn-logo-mark>strong/);
  assert.match(css, /grid-template-columns:40px!important/);
  assert.match(css, /\.nara-floating-button>\.nara-launcher-icon-box>svg/);
  assert.match(css, /width:18px!important/);
  assert.match(css, /transform:none!important/);
  assert.match(sw, /v429-mobile-n-nara-structural/);
  assert.match(sw, /v429-mobile-n-nara-refresh/);
});
