import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studio = read("src/Studio.jsx");
const runtime = read("src/studio-scroll-chrome-v270.js");
const css = read("src/studio-scroll-chrome-v270.css");

function indexOf(source, marker) {
  const index = source.indexOf(marker);
  assert.notEqual(index, -1, `missing ${marker}`);
  return index;
}

test("v270 loads after the complete v269 responsive authority", () => {
  const v269 = indexOf(studio, 'import "./studio-final-authority-v269.js";');
  const v270js = indexOf(studio, 'import "./studio-scroll-chrome-v270.js";');
  const v270css = indexOf(studio, 'import "./studio-scroll-chrome-v270.css";');
  assert.ok(v270js > v269);
  assert.ok(v270css > v270js);
});

test("mobile n is fixed to the viewport and remains a direct touch target after scroll", () => {
  assert.match(css, /html\[data-v269-desktop-family="false"\] \.sn-top>\.sn-sidebar-toggle[\s\S]*position:fixed!important/);
  assert.match(css, /z-index:2147483050!important/);
  assert.match(css, /touch-action:manipulation!important/);
  assert.match(css, /-webkit-tap-highlight-color:transparent!important/);
  assert.match(runtime, /window\.addEventListener\("scroll", schedule/);
  assert.match(runtime, /visualViewport\?\.addEventListener\("scroll", schedule/);
});

test("mobile drawer has no dark blur freeze and only the outside close target intercepts clicks", () => {
  assert.match(css, /--v270-drawer:clamp\(248px,74vw,320px\)/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open[\s\S]*pointer-events:auto!important/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*left:var\(--v270-drawer\)!important[\s\S]*background:transparent!important/);
  assert.match(css, /body\.sn-mobile-sidebar-open :is\(\.sn-main,\.sn-shell\)[\s\S]*pointer-events:auto!important/);
});

test("desktop collapsed rail keeps all buttons and direct svg icons visible", () => {
  assert.match(css, /#ngeblogging-studio-sidebar\.collapsed :is\(\.sn-new,nav>button,\.sn-account-footer>button\)[\s\S]*display:flex!important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.collapsed :is\(\.sn-new,nav>button,\.sn-account-footer>button\)>svg[\s\S]*display:block!important/);
  assert.match(css, /visibility:visible!important/);
  assert.match(runtime, /button\.dataset\.v270Visible = "true"/);
  assert.match(runtime, /button\.setAttribute\("title", label\)/);
});

test("historical external n controls are hidden while the large top toggle is also hidden", () => {
  for (const marker of [
    ".sn-sidebar-edge-toggle-v147",
    ".v227-sidebar-fab",
    ".studio-external-sidebar-toggle",
    "[data-v173-collapse-toggle]",
    "[data-v229-sidebar-toggle]",
  ]) assert.ok(css.includes(marker), `missing duplicate-control guard ${marker}`);
  assert.match(css, /html\[data-v269-desktop-family="true"\] \.sn-top>\.sn-sidebar-toggle[\s\S]*display:none!important/);
});

test("Nara launcher is viewport fixed on every mode and small medium are nonmodal", () => {
  assert.match(css, /\.nara-floating-button[\s\S]*position:fixed!important/);
  assert.match(css, /right:var\(--v270-safe-right\)!important/);
  assert.match(css, /bottom:var\(--v270-safe-bottom\)!important/);
  assert.match(runtime, /launcher\.dataset\.scrollChromeV270 = "viewport-fixed"/);
  assert.match(runtime, /const full = size === "full"/);
  assert.match(runtime, /layer\.dataset\.v270Interaction = full \? "modal" : "nonmodal"/);
  assert.match(runtime, /backdrop\.hidden = !full/);
  assert.match(css, /data-v270-interaction="nonmodal"/);
});

test("Nara attachment menu stays above composer in a three-column Camera Photo File chooser", () => {
  assert.match(runtime, /attachment\.dataset\.v270Placement = "above-composer"/);
  assert.match(css, /\.nara-attachment-menu[\s\S]*bottom:calc\(100% \+ 8px\)!important/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
});

test("v270 does not clear storage sign out users or force navigation", () => {
  for (const source of [runtime, css]) {
    assert.doesNotMatch(source, /localStorage\.clear\s*\(/);
    assert.doesNotMatch(source, /sessionStorage\.clear\s*\(/);
    assert.doesNotMatch(source, /signOut\s*\(/);
    assert.doesNotMatch(source, /location\.reload\s*\(/);
    assert.doesNotMatch(source, /location\.assign\s*\(/);
  }
});
