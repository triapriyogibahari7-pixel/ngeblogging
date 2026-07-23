import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const legacy = readFileSync(new URL("../src/studio-responsive-fix.css", import.meta.url), "utf8");
const polish = readFileSync(new URL("../src/studio-mobile-polish.css", import.meta.url), "utf8");
const production = readFileSync(new URL("../src/studio-production-audit.css", import.meta.url), "utf8");
const deviceMode = readFileSync(new URL("../src/studio-device-mode.css", import.meta.url), "utf8");
const controller = readFileSync(new URL("../src/studio-mobile-navigation.js", import.meta.url), "utf8");
const appShell = readFileSync(new URL("../src/app-shell-bridge.js", import.meta.url), "utf8");
const studio = readFileSync(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");


test("Studio loads base, production, and real-device responsive layers in order", () => {
  const responsivePosition = index.indexOf("studio-responsive-fix.css");
  const polishPosition = index.indexOf("studio-mobile-polish.css");
  const productionPosition = index.indexOf("studio-production-audit.css");
  const devicePosition = index.indexOf("studio-device-mode.css");
  assert.ok(responsivePosition > -1);
  assert.ok(polishPosition > responsivePosition);
  assert.ok(productionPosition > polishPosition);
  assert.ok(devicePosition > productionPosition);
  assert.ok(index.indexOf("app-shell-bridge.js") < index.indexOf("studio-mobile-navigation.js"));
  assert.match(index, /width=device-width,initial-scale=1,viewport-fit=cover/);
  assert.doesNotMatch(index, /maximum-scale=1/);
});


test("phones use a full-width workspace and off-canvas sidebar", () => {
  assert.match(production, /@media\(max-width:700px\)/);
  assert.match(production, /--sn-phone-panel:min\(88vw,320px\)/);
  assert.match(production, /\.sn-side\.collapsed\{[\s\S]*transform:translateX\(calc\(-100% - 10px\)\)!important/);
  assert.match(deviceMode, /html\[data-device-mode="mobile"\] \.sn-side\.collapsed/);
  assert.match(deviceMode, /transform:translateX\(calc\(-100% - 10px\)\)!important/);
  assert.match(deviceMode, /html\[data-device-mode="mobile"\] \.sn-main/);
  assert.match(deviceMode, /margin-left:0!important/);
  assert.match(deviceMode, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
  assert.match(deviceMode, /\.sn-content-tools\{display:grid!important/);
  assert.match(deviceMode, /\.sn-doc-row\{display:grid!important/);
  assert.match(appShell, /mobileUserAgent\(\)/);
  assert.match(appShell, /physicalShortSide\(\)/);
  assert.match(appShell, /width <= 760/);
});


test("tablets keep an icon rail and overlay the expanded panel", () => {
  assert.match(production, /@media\(min-width:701px\) and \(max-width:1024px\)/);
  assert.match(production, /:root\{--sn-rail:64px\}/);
  assert.match(production, /\.sn-side\.collapsed\{[\s\S]*width:var\(--sn-rail\)!important/);
  assert.match(production, /\.sn-main,\.sn-side\.collapsed\+\.sn-main,\.sn-side:not\(\.collapsed\)\+\.sn-main\{[\s\S]*margin-left:var\(--sn-rail\)!important/);
  assert.match(production, /\.sn-side:not\(\.collapsed\)\+\.sn-main:before/);
  assert.match(production, /background:#10233e35/);
});


test("desktop and large displays retain precise panel and rail geometry", () => {
  assert.match(production, /--sn-rail:72px;/);
  assert.match(production, /--sn-panel:240px;/);
  assert.match(production, /@media\(min-width:1025px\)/);
  assert.match(production, /\.sn-main\{margin-left:var\(--sn-panel\)!important/);
  assert.match(production, /\.sn-side\.collapsed\+\.sn-main\{margin-left:var\(--sn-rail\)!important/);
  assert.match(production, /@media\(min-width:1500px\)/);
  assert.match(production, /max-width:1560px!important/);
});


test("only the React header button controls sidebar state", () => {
  assert.match(studio, /const \[sidebar,setSidebar\] = useState\(true\)/);
  assert.match(studio, /className=\{sidebar\?"sn-side":"sn-side collapsed"\}/);
  assert.match(studio, /className="sn-icon" onClick=\{\(\)=>setSidebar\(!sidebar\)\}/);
  assert.match(controller, /querySelectorAll\(":scope > \.sn-side-close"\)\.forEach\(\(node\) => node\.remove\(\)\)/);
  assert.doesNotMatch(controller, /side\.append\(close\)/);
  assert.doesNotMatch(controller, /createElement\("button"\)/);
  assert.match(controller, /aria-label", expanded \? "Tutup menu Studio" : "Buka menu Studio"/);
  assert.match(controller, /const COMPACT_QUERY = "\(max-width: 1024px\)"/);
  assert.match(controller, /const PHONE_QUERY = "\(max-width: 760px\)"/);
  assert.match(controller, /dataset\.deviceMode === "mobile"/);
  assert.match(controller, /event\.key !== "Escape"/);
  assert.match(controller, /document\.addEventListener\("pointerdown"/);
});


test("phone navigation and complete sidebar menus coexist without duplicate sidebar toggles", () => {
  assert.match(production, /@media\(min-width:1025px\)\{[\s\S]*\.sn-mobile-nav,\.sn-mobile-sheet-layer\{display:none!important\}/);
  assert.match(deviceMode, /html\[data-device-mode="mobile"\] \.sn-mobile-nav/);
  assert.match(deviceMode, /display:grid!important/);
  assert.match(polish, /\.sn-mobile-nav,\.sn-mobile-sheet-layer,\.sn-sidebar-backdrop\{display:none!important\}/);
  assert.match(studio, /<LayoutDashboard\/><span>Ringkasan<\/span>/);
  assert.match(studio, /<Palette\/><span>Tema<\/span>/);
  assert.match(studio, /<Settings\/><span>Pengaturan<\/span>/);
  assert.match(studio, /className="sn-mobile-nav"/);
});


test("settings and empty-container rules remain safe", () => {
  assert.doesNotMatch(legacy, /body:has\(\.sn-settings-grid\) \.sn-side/);
  assert.match(legacy, /\.sn-settings-grid\{grid-template-columns:1fr!important;width:100%\}/);
  assert.match(legacy, /aside:empty/);
  assert.match(legacy, /div:empty\[data-sidebar\]/);
  assert.doesNotMatch(legacy, /section:empty/);
});
