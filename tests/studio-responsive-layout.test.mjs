import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const v21 = read("src/studio-responsive-v21.css");
const v22 = read("src/studio-responsive-v22.css");
const finalCss = read("src/studio-v22-final.css");
const secure = read("src/StudioSecure.jsx");
const sidebar = read("src/studio-sidebar-v21.js");
const runtime = read("src/studio-runtime-v22.js");
const studio = read("src/StudioNext.jsx");

test("Studio loads v22 and the final geometry after v21 without activating v14", () => {
  const v21Position = index.indexOf("studio-responsive-v21.css");
  const v22Position = index.indexOf("studio-responsive-v22.css");
  const finalPosition = index.indexOf("studio-v22-final.css");
  assert.ok(v21Position > -1);
  assert.ok(v22Position > v21Position);
  assert.ok(finalPosition > v22Position);
  assert.doesNotMatch(index, /<link[^>]+href=["']\/src\/studio-v14-authority\.css["']/);
  assert.doesNotMatch(secure, /import\s+["']\.\/studio-v14-authority\.css["']/);
  assert.match(index, /studio-runtime-v22\.js/);
  assert.match(index, /width=device-width,initial-scale=1,viewport-fit=cover/);
});

test("phones retain one icon rail and the edge toggle stays below the header", () => {
  assert.match(v22, /--sn-v22-rail: 62px/);
  assert.match(v22, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-v22-rail\) !important/);
  assert.match(v22, /\.sn-main,[\s\S]*margin: 0 0 0 var\(--sn-v22-rail\) !important/);
  assert.match(finalCss, /top: 76px !important/);
  assert.match(sidebar, /scrim\.hidden = !mobile \|\| side\.classList\.contains\("collapsed"\)/);
});

test("Android Desktop site is detected by viewport width or viewport-to-screen ratio", () => {
  assert.match(runtime, /viewportToScreenRatio >= 1\.18/);
  assert.match(runtime, /root\.dataset\.desktopLayoutRequested = String\(profile\.desktopSitePhone\)/);
  assert.match(finalCss, /html\[data-desktop-layout-requested="true"\] \.sn-main/);
  assert.match(finalCss, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important/);
  assert.match(finalCss, /grid-template-columns: minmax\(0, 1\.35fr\) minmax\(260px, \.65fr\) !important/);
});

test("one React sidebar toggle and no bottom navigation remain", () => {
  assert.match(studio, /const \[sidebar,setSidebar\] = useState\(true\)/);
  assert.equal((studio.match(/className="sn-icon"/g) || []).length, 1);
  assert.match(sidebar, /toggle\.dataset\.sidebarAuthority = "single-v21"/);
  assert.match(secure, /sn-mobile-nav, :scope > \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.doesNotMatch(studio, /sn-mobile-nav|sn-mobile-sheet-layer|sn-side-bottom/);
  assert.match(sidebar, /Tata Letak/);
});

test("Nara uses one floating launcher and fills every physical-phone viewport", () => {
  assert.match(v22, /\.sn-top-actions \.sn-nara-button,[\s\S]*\.ce-nara,[\s\S]*display: none !important/);
  assert.match(runtime, /data\.naraLauncherAuthority|dataset\.naraLauncherAuthority/);
  assert.match(runtime, /launchers\.forEach\(\(button, index\)/);
  assert.match(finalCss, /html\[data-nara-open="true"\] \.nara-floating-button/);
  assert.match(finalCss, /data-physical-screen-mobile="true"\] \.nara-assistant-layer/);
  assert.match(finalCss, /height: 100dvh !important/);
});

test("editor and content remain constrained without horizontal overflow", () => {
  assert.match(v22, /\.ce-titlebar,[\s\S]*\.ce-tabs,[\s\S]*\.ce-ribbon/);
  assert.match(v22, /\.ce-workspace[\s\S]*display: block !important/);
  assert.match(v21, /\.ce-paper[\s\S]*min-height:max\(480px/);
  assert.match(finalCss, /data-desktop-layout-requested="true"\] \.ce-workspace[\s\S]*350px/);
});
