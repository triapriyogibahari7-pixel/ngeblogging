import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const legacy = readFileSync(new URL("../src/studio-responsive-fix.css", import.meta.url), "utf8");
const polish = readFileSync(new URL("../src/studio-mobile-polish.css", import.meta.url), "utf8");
const production = readFileSync(new URL("../src/studio-production-audit.css", import.meta.url), "utf8");
const deviceMode = readFileSync(new URL("../src/studio-device-mode.css", import.meta.url), "utf8");
const critical = readFileSync(new URL("../src/studio-mobile-critical.css", import.meta.url), "utf8");
const finalMobile = readFileSync(new URL("../src/studio-final-mobile.css", import.meta.url), "utf8");
const controller = readFileSync(new URL("../src/studio-mobile-navigation.js", import.meta.url), "utf8");
const guard = readFileSync(new URL("../src/studio-runtime-layout-guard.js", import.meta.url), "utf8");
const appShell = readFileSync(new URL("../src/app-shell-bridge.js", import.meta.url), "utf8");
const studio = readFileSync(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");


test("Studio loads every responsive layer with the final mobile authority last", () => {
  const responsivePosition = index.indexOf("studio-responsive-fix.css");
  const polishPosition = index.indexOf("studio-mobile-polish.css");
  const productionPosition = index.indexOf("studio-production-audit.css");
  const devicePosition = index.indexOf("studio-device-mode.css");
  const criticalPosition = index.indexOf("studio-mobile-critical.css");
  const finalPosition = index.indexOf("studio-final-mobile.css");
  assert.ok(responsivePosition > -1);
  assert.ok(polishPosition > responsivePosition);
  assert.ok(productionPosition > polishPosition);
  assert.ok(devicePosition > productionPosition);
  assert.ok(criticalPosition > devicePosition);
  assert.ok(finalPosition > criticalPosition);
  assert.ok(index.indexOf("app-shell-bridge.js") < index.indexOf("studio-runtime-layout-guard.js"));
  assert.ok(index.indexOf("studio-runtime-layout-guard.js") < index.indexOf("/src/main.jsx"));
  assert.match(index, /width=device-width,initial-scale=1,viewport-fit=cover/);
  assert.doesNotMatch(index, /maximum-scale=1/);
});


test("phones use a full-width workspace and off-canvas sidebar", () => {
  assert.match(production, /@media\(max-width:700px\)/);
  assert.match(deviceMode, /html\[data-device-mode="mobile"\] \.sn-side\.collapsed/);
  assert.match(finalMobile, /--sn-phone-panel: min\(82vw, 340px\)/);
  assert.match(finalMobile, /\.sn-side\.collapsed[\s\S]*translateX\(calc\(-100% - 18px\)\)/);
  assert.match(finalMobile, /\.sn-main,[\s\S]*margin-left: 0 !important/);
  assert.match(critical, /html\[data-device-mode="mobile"\] \.sn-media-tools\{display:grid!important/);
  assert.match(critical, /\.sn-home-grid>section>button/);
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
});


test("desktop and large displays retain precise panel and rail geometry", () => {
  assert.match(production, /--sn-rail:72px;/);
  assert.match(production, /--sn-panel:240px;/);
  assert.match(production, /@media\(min-width:1025px\)/);
  assert.match(production, /\.sn-main\{margin-left:var\(--sn-panel\)!important/);
  assert.match(production, /\.sn-side\.collapsed\+\.sn-main\{margin-left:var\(--sn-rail\)!important/);
  assert.match(production, /@media\(min-width:1500px\)/);
});


test("only the React header button controls sidebar state", () => {
  assert.match(studio, /const \[sidebar,setSidebar\] = useState\(true\)/);
  assert.match(studio, /className=\{sidebar\?"sn-side":"sn-side collapsed"\}/);
  assert.match(studio, /className="sn-icon" onClick=\{\(\)=>setSidebar\(!sidebar\)\}/);
  assert.match(controller, /querySelectorAll\(":scope > \.sn-side-close"\)\.forEach\(\(node\) => node\.remove\(\)\)/);
  assert.doesNotMatch(controller, /side\.append\(close\)/);
  assert.doesNotMatch(controller, /createElement\("button"\)/);
  assert.match(controller, /aria-label", expanded \? "Tutup menu Studio" : "Buka menu Studio"/);
  assert.match(controller, /event\.key !== "Escape"/);
  assert.match(controller, /document\.addEventListener\("pointerdown"/);
  assert.match(finalMobile, /\.sn-side\.collapsed \+ \.sn-main \.sn-icon[\s\S]*left: 12px !important/);
  assert.match(finalMobile, /\.sn-side:not\(\.collapsed\) \+ \.sn-main \.sn-icon[\s\S]*left: calc\(var\(--sn-phone-panel\) - 2px\) !important/);
});


test("bottom navigation is removed and the full menu remains in the sidebar", () => {
  assert.match(critical, /\.sn-shell>\.sn-mobile-nav,\.sn-shell>\.sn-mobile-sheet-layer\{display:none!important\}/);
  assert.match(finalMobile, /\.sn-mobile-nav,[\s\S]*display: none !important/);
  assert.match(guard, /querySelectorAll\(":scope > \.sn-mobile-nav, :scope > \.sn-mobile-sheet-layer"\)\.forEach\(\(node\) => node\.remove\(\)\)/);
  assert.doesNotMatch(guard, /important\(nav, "display", "grid"\)/);
  assert.match(studio, /<LayoutDashboard\/><span>Ringkasan<\/span>/);
  assert.match(studio, /<Palette\/><span>Tema<\/span>/);
  assert.match(studio, /<Settings\/><span>Pengaturan<\/span>/);
  assert.match(studio, /<Globe2\/><span>Domain<\/span>/);
});


test("settings cards stay in normal flow on a real phone", () => {
  assert.doesNotMatch(legacy, /body:has\(\.sn-settings-grid\) \.sn-side/);
  assert.match(legacy, /\.sn-settings-grid\{grid-template-columns:1fr!important;width:100%\}/);
  assert.match(finalMobile, /\.sn-view-pad:has\(\.sn-settings-grid\)/);
  assert.match(finalMobile, /#ngeblogging-site-favicon-settings/);
  assert.match(finalMobile, /\.sn-backup-host/);
  assert.match(finalMobile, /position: static !important/);
  assert.match(finalMobile, /\.sn-settings-grid input,[\s\S]*font-size: 16px !important/);
  assert.match(legacy, /aside:empty/);
  assert.match(legacy, /div:empty\[data-sidebar\]/);
  assert.doesNotMatch(legacy, /section:empty/);
  assert.match(polish, /\.sn-mobile-nav,\.sn-mobile-sheet-layer,\.sn-sidebar-backdrop\{display:none!important\}/);
});
