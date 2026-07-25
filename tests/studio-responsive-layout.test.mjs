import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const css = read("src/studio-responsive-v23.css");
const secure = read("src/StudioSecure.jsx");
const runtime = read("src/studio-runtime-v23.js");
const studio = read("src/StudioNext.jsx");

test("Studio loads one active v23 geometry while old authorities stay disabled", () => {
  const v23Position = index.indexOf("studio-responsive-v23.css");
  assert.ok(v23Position > index.indexOf("studio-v22-final.css"));
  for (const legacy of ["studio-v14-authority.css", "studio-responsive-v21.css", "studio-responsive-v22.css", "studio-v22-final.css"]) {
    assert.match(index, new RegExp(`${legacy.replaceAll(".", "\\.")}[^>]+media="not all"`));
  }
  assert.doesNotMatch(secure, /import\s+["']\.\/studio-v14-authority\.css["']/);
  assert.doesNotMatch(secure, /import\s+["']\.\/studio-responsive-v2[12]\.css["']/);
  assert.match(secure, /import\s+["']\.\/studio-responsive-v23\.css["']/);
  assert.match(index, /studio-runtime-v23\.js/);
  assert.match(index, /width=device-width,initial-scale=1,viewport-fit=cover/);
});

test("phones retain one icon rail and the edge toggle stays below the header", () => {
  assert.match(css, /--sn-v23-rail: 64px/);
  assert.match(css, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-v23-rail\) !important/);
  assert.match(css, /\.sn-side\.collapsed \+ \.sn-main,[\s\S]*margin: 0 0 0 var\(--sn-v23-rail\) !important/);
  assert.match(css, /\.sn-icon\.sn-sidebar-edge-owner-v23[\s\S]*top: 76px !important/);
  assert.match(runtime, /scrim\.hidden = !compact \|\| side\.classList\.contains\("collapsed"\)/);
});

test("Android Desktop site is detected by viewport width or viewport-to-screen ratio", () => {
  assert.match(runtime, /viewportToScreenRatio >= 1\.18/);
  assert.match(runtime, /root\.dataset\.desktopLayoutRequested = String\(profile\.desktopRequested\)/);
  assert.match(css, /html\[data-desktop-layout-requested="true"\] \.sn-main/);
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /grid-template-columns: minmax\(0, 1\.35fr\) minmax\(260px, \.65fr\) !important/);
});

test("one React sidebar toggle and no bottom navigation remain", () => {
  assert.match(studio, /const \[sidebar,setSidebar\] = useState\(true\)/);
  assert.equal((studio.match(/className="sn-icon"/g) || []).length, 1);
  assert.match(runtime, /toggle\.dataset\.sidebarAuthority = "single-v23"/);
  assert.match(secure, /sn-mobile-nav, :scope > \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.doesNotMatch(studio, /sn-mobile-nav|sn-mobile-sheet-layer|sn-side-bottom/);
  assert.match(runtime, /Tata Letak/);
});

test("Nara uses one floating launcher and fills every physical-phone viewport", () => {
  assert.match(css, /\.sn-top-actions \.sn-nara-button,[\s\S]*\.ce-nara,[\s\S]*display: none !important/);
  assert.match(runtime, /dataset\.naraLauncherAuthority = "single-v23"/);
  assert.match(runtime, /launchers\.forEach\(\(button, index\)/);
  assert.match(runtime, /button\.hidden = false/);
  assert.match(runtime, /button\.disabled = false/);
  assert.match(css, /html\[data-nara-open="true"\] \.nara-floating-button/);
  assert.match(css, /data-physical-phone="true"\] \.nara-assistant-layer/);
  assert.match(css, /height: 100dvh !important/);
});

test("editor and content remain constrained without horizontal overflow", () => {
  assert.match(css, /\.ce-titlebar,[\s\S]*\.ce-tabs,[\s\S]*\.ce-ribbon/);
  assert.match(css, /html:not\(\[data-desktop-layout-requested="true"\]\) \.ce-workspace[\s\S]*display: block !important/);
  assert.match(css, /html:not\(\[data-desktop-layout-requested="true"\]\) \.ce-paper[\s\S]*720px/);
  assert.match(css, /overflow-x: hidden !important/);
  assert.match(css, /data-desktop-layout-requested="true"\] \.ce-workspace[\s\S]*minmax\(320px, 360px\)/);
});
