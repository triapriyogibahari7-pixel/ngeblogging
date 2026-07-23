import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/studio-responsive-fix.css", import.meta.url), "utf8");
const polish = readFileSync(new URL("../src/studio-mobile-polish.css", import.meta.url), "utf8");
const controller = readFileSync(new URL("../src/studio-mobile-navigation.js", import.meta.url), "utf8");
const studio = readFileSync(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");

test("Studio loads the final responsive layers after module styles", () => {
  assert.match(index, /studio-responsive-fix\.css/);
  assert.match(index, /studio-mobile-polish\.css/);
  assert.match(index, /width=device-width,initial-scale=1,viewport-fit=cover/);
  assert.doesNotMatch(index, /maximum-scale=1/);
});

test("small screens preserve the left sidebar as an expanded panel or icon rail", () => {
  assert.match(css, /@media\(max-width:1100px\)/);
  assert.match(css, /\.sn-side\{[\s\S]*width:220px!important/);
  assert.match(css, /\.sn-side\.collapsed\{[\s\S]*width:70px!important/);
  assert.match(css, /\.sn-side\.collapsed\{[\s\S]*transform:none!important/);
  assert.match(css, /\.sn-side\.collapsed\+\.sn-main\{[\s\S]*margin-left:70px!important/);
  assert.match(css, /\.sn-side\.collapsed>nav button[\s\S]*justify-content:center/);
  assert.doesNotMatch(css, /translateX\(calc\(-100%/);
});

test("bottom mobile navigation is removed and every sidebar menu remains reachable", () => {
  assert.match(css, /\.sn-mobile-nav,\.sn-mobile-sheet-layer,\.sn-sidebar-backdrop\{display:none!important\}/);
  assert.match(polish, /\.sn-mobile-nav,\.sn-mobile-sheet-layer,\.sn-sidebar-backdrop\{display:none!important\}/);
  assert.match(studio, /<LayoutDashboard\/><span>Ringkasan<\/span>/);
  assert.match(studio, /<Palette\/><span>Tema<\/span>/);
  assert.match(studio, /<Settings\/><span>Pengaturan<\/span>/);
});

test("the Studio toggle and added close control can both collapse the sidebar", () => {
  assert.match(studio, /const \[sidebar,setSidebar\] = useState\(true\)/);
  assert.match(studio, /className=\{sidebar\?"sn-side":"sn-side collapsed"\}/);
  assert.match(studio, /className="sn-icon" onClick=\{\(\)=>setSidebar\(!sidebar\)\}/);
  assert.match(controller, /className = "sn-side-close"/);
  assert.match(controller, /close\.addEventListener\("click", \(\) => clickToggle\(shell\)\)/);
  assert.match(controller, /aria-label", expanded \? "Tutup sidebar Studio" : "Buka sidebar Studio"/);
  assert.match(controller, /if \(media\.matches && !side\.classList\.contains\("collapsed"\)\)/);
  assert.match(controller, /rel ikon/);
  assert.doesNotMatch(controller, /sn-sidebar-backdrop/);
  assert.doesNotMatch(controller, /sn-mobile-sidebar-lock/);
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
