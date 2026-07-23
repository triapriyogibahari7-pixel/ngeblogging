import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const legacy = readFileSync(new URL("../src/studio-responsive-fix.css", import.meta.url), "utf8");
const polish = readFileSync(new URL("../src/studio-mobile-polish.css", import.meta.url), "utf8");
const production = readFileSync(new URL("../src/studio-production-audit.css", import.meta.url), "utf8");
const controller = readFileSync(new URL("../src/studio-mobile-navigation.js", import.meta.url), "utf8");
const studio = readFileSync(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");


test("Studio loads the final production responsive layer last", () => {
  const responsivePosition = index.indexOf("studio-responsive-fix.css");
  const polishPosition = index.indexOf("studio-mobile-polish.css");
  const productionPosition = index.indexOf("studio-production-audit.css");
  assert.ok(responsivePosition > -1);
  assert.ok(polishPosition > responsivePosition);
  assert.ok(productionPosition > polishPosition);
  assert.match(index, /width=device-width,initial-scale=1,viewport-fit=cover/);
  assert.doesNotMatch(index, /maximum-scale=1/);
});


test("phone and tablet use an icon rail without crushing the content", () => {
  assert.match(production, /@media\(max-width:900px\)/);
  assert.match(production, /--sn-rail:60px;--sn-panel:min\(278px,calc\(100vw - 58px\)\)/);
  assert.match(production, /\.sn-side\.collapsed\{[\s\S]*width:var\(--sn-rail\)!important/);
  assert.match(production, /\.sn-main,.sn-side\.collapsed\+\.sn-main\{[\s\S]*margin-left:var\(--sn-rail\)!important/);
  assert.match(production, /\.sn-side:not\(\.collapsed\)\+\.sn-main:before/);
  assert.match(production, /\.sn-content-tools\{display:grid!important;grid-template-columns:1fr!important/);
  assert.match(production, /\.sn-doc-row\{display:grid!important;grid-template-columns:minmax\(0,1fr\) auto 36px!important/);
  assert.match(production, /\.bv-plans,.bv-methods>div,.bv-security\{grid-template-columns:minmax\(0,1fr\)!important/);
});


test("desktop and large displays retain precise panel and rail geometry", () => {
  assert.match(production, /@media\(min-width:901px\)/);
  assert.match(production, /--sn-rail:70px;--sn-panel:220px/);
  assert.match(production, /\.sn-main\{margin-left:var\(--sn-panel\)!important/);
  assert.match(production, /\.sn-side\.collapsed\+\.sn-main\{margin-left:var\(--sn-rail\)!important/);
  assert.match(production, /@media\(min-width:1500px\)/);
  assert.match(production, /max-width:1500px!important/);
});


test("only the React header button controls sidebar state", () => {
  assert.match(studio, /const \[sidebar,setSidebar\] = useState\(true\)/);
  assert.match(studio, /className=\{sidebar\?"sn-side":"sn-side collapsed"\}/);
  assert.match(studio, /className="sn-icon" onClick=\{\(\)=>setSidebar\(!sidebar\)\}/);
  assert.match(controller, /querySelectorAll\(":scope > \.sn-side-close"\)\.forEach\(\(node\) => node\.remove\(\)\)/);
  assert.doesNotMatch(controller, /side\.append\(close\)/);
  assert.doesNotMatch(controller, /createElement\("button"\)/);
  assert.match(controller, /aria-label", expanded \? "Tutup sidebar Studio" : "Buka sidebar Studio"/);
  assert.match(controller, /if \(compactMedia\.matches && !side\.classList\.contains\("collapsed"\)\)/);
});


test("bottom navigation is visually removed and every menu remains in the sidebar", () => {
  assert.match(production, /\.sn-side-close,.sn-mobile-nav,.sn-mobile-sheet-layer,.sn-sidebar-backdrop\{display:none!important\}/);
  assert.match(polish, /\.sn-mobile-nav,.sn-mobile-sheet-layer,.sn-sidebar-backdrop\{display:none!important\}/);
  assert.match(studio, /<LayoutDashboard\/><span>Ringkasan<\/span>/);
  assert.match(studio, /<Palette\/><span>Tema<\/span>/);
  assert.match(studio, /<Settings\/><span>Pengaturan<\/span>/);
});


test("settings and empty-container rules remain safe", () => {
  assert.doesNotMatch(legacy, /body:has\(\.sn-settings-grid\) \.sn-side/);
  assert.match(legacy, /\.sn-settings-grid\{grid-template-columns:1fr!important;width:100%\}/);
  assert.match(legacy, /aside:empty/);
  assert.match(legacy, /div:empty\[data-sidebar\]/);
  assert.doesNotMatch(legacy, /section:empty/);
});
