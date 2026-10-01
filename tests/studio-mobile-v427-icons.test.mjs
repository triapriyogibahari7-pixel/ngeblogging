import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("v427 is the absolute root-entry authority for the single mobile N and centered Nara", () => {
  const studio = read("src/StudioNext.jsx");
  const entry = read("src/Studio.jsx");
  const css = read("src/studio-mobile-v427.css");
  const sw = read("public/sw.js");

  assert.match(studio, /\{deviceMode !== "small" && <button className="sn-icon sn-sidebar-toggle"/);
  assert.match(studio, /className="sn-logo-mark"/);
  assert.doesNotMatch(studio, /\{!mobileSidebar && <button className="sn-icon sn-sidebar-toggle"/);

  assert.ok(
    entry.indexOf('import "./studio-mobile-v427.css"') > entry.indexOf('import "./studio-mobile-all-pages-v370.css"'),
    "v427 must load after the historical root-entry CSS"
  );

  assert.match(css, /data-device-mode="small"/);
  assert.match(css, /#ngeblogging-studio-sidebar:not\(\.mobile-open\)/);
  assert.match(css, /\.sn-logo-mark>strong/);
  assert.match(css, /\.nara-floating-button>\.nara-launcher-icon-box>svg/);
  assert.match(css, /width:18px!important/);
  assert.match(css, /height:18px!important/);
  assert.doesNotMatch(css, /sn-top[^\n]*sn-sidebar-toggle[^\n]*width:46px/);

  assert.match(sw, /ngeblogging-app-v427-mobile-n-nara-root-authority-20261001/);
  assert.match(sw, /v427-mobile-n-nara-root-authority-20261001/);
});

test("v427 lets React own the original mobile sidebar N click", () => {
  const runtime = read("src/studio-sidebar-direct-v300.js");
  assert.match(runtime, /family\(\) === "small"/);
  assert.match(runtime, /react-small/);
  assert.match(runtime, /mark\.addEventListener\("click", directToggle/);
  assert.match(runtime, /family\(\) === "small"\)/);\n  assert.match(runtime, /side\.classList\.toggle\("mobile-open"\)/);
});

test("v427 keeps the Nara icon implementation identical to editor", () => {
  const nara = read("src/NaraAssistant.jsx");
  const editor = read("src/ContentEditor.jsx");
  assert.match(nara, /nara-launcher-icon-box[^>]*><Sparkles \/><\/span>/);
  assert.match(editor, /className="ce-mobile-toolbar-nara"[^>]*>[\s\S]*<Sparkles\/>/);
});
