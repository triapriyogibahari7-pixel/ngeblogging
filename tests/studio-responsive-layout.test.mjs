import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const authority = readFileSync(new URL("../src/studio-v14-authority.css", import.meta.url), "utf8");
const naraAuthority = readFileSync(new URL("../src/nara-interaction-authority.css", import.meta.url), "utf8");
const secure = readFileSync(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");
const appShell = readFileSync(new URL("../src/app-shell-bridge.js", import.meta.url), "utf8");
const studio = readFileSync(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");


test("Studio loads one responsive authority with the specialized Nara authority last", () => {
  const studioPosition = index.indexOf("studio-v14-authority.css");
  const naraPosition = index.indexOf("nara-interaction-authority.css");
  assert.ok(studioPosition > -1);
  assert.ok(naraPosition > studioPosition);
  for (const legacy of [
    "studio-responsive-fix.css", "studio-mobile-polish.css", "studio-production-audit.css",
    "studio-device-mode.css", "studio-mobile-critical.css", "studio-final-mobile.css",
    "studio-v8-hardening.css", "studio-v10-authority.css", "studio-v11-mobile-repair.css",
    "studio-mobile-navigation.js", "studio-runtime-layout-guard.js", "studio-production-guard.js",
  ]) assert.equal(index.includes(legacy), false, legacy);
  assert.ok(index.indexOf("app-shell-bridge.js") < index.indexOf("/src/main.jsx"));
  assert.match(index, /width=device-width,initial-scale=1,viewport-fit=cover/);
  assert.doesNotMatch(index, /maximum-scale=1/);
});


test("phones keep a compact icon rail and an overlaying expanded sidebar", () => {
  assert.match(authority, /--sn-phone-panel: min\(78vw, 272px\)/);
  assert.match(authority, /--sn-phone-rail: 58px/);
  assert.match(authority, /@media \(max-width: 760px\)/);
  assert.match(authority, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-phone-rail\) !important/);
  assert.match(authority, /\.sn-main,[\s\S]*width: calc\(100vw - var\(--sn-phone-rail\)\) !important/);
  assert.match(authority, /\.sn-side:not\(\.collapsed\) \+ \.sn-main::before/);
  assert.match(authority, /left: calc\(var\(--sn-phone-panel\) - 20px\) !important/);
  assert.match(appShell, /mobileUserAgent\(\)/);
  assert.match(appShell, /physicalShortSide\(\)/);
  assert.match(appShell, /width <= 760/);
});


test("tablets and laptops keep usable header controls without horizontal overflow", () => {
  assert.match(authority, /@media \(max-width: 1024px\)/);
  assert.match(authority, /\.sn-cloud span,[\s\S]*\.sn-view-site span[\s\S]*display: none/);
  assert.match(authority, /\.sn-workspace b[\s\S]*max-width: 24vw/);
  assert.match(authority, /\.sn-shell[\s\S]*overflow-x: clip/);
});


test("desktop and large displays retain precise panel and rail geometry", () => {
  assert.match(authority, /--sn-rail-width: 72px/);
  assert.match(authority, /--sn-panel-width: 228px/);
  assert.match(authority, /\.sn-main,[\s\S]*margin-left: var\(--sn-panel-width\) !important/);
  assert.match(authority, /\.sn-side\.collapsed \+ \.sn-main[\s\S]*margin-left: var\(--sn-rail-width\) !important/);
});


test("only the React header button controls sidebar state", () => {
  assert.match(studio, /const \[sidebar,setSidebar\] = useState\(true\)/);
  assert.match(studio, /className=\{sidebar\?"sn-side":"sn-side collapsed"\}/);
  assert.match(studio, /className="sn-icon" onClick=\{\(\)=>setSidebar\(!sidebar\)\}/);
  assert.equal((studio.match(/className="sn-icon"/g) || []).length, 1);
  assert.match(secure, /dataset\.sidebarAuthority = "single"/);
  assert.match(secure, /aria-label", side\.classList\.contains\("collapsed"\) \? "Buka menu Studio" : "Tutup menu Studio"/);
  assert.match(secure, /closeAfterSelection/);
});


test("bottom navigation is removed and the full menu remains in the sidebar", () => {
  assert.match(authority, /\.sn-mobile-nav,[\s\S]*\.sn-side-bottom,[\s\S]*display: none !important/);
  assert.match(secure, /\.sn-mobile-nav, :scope > \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.match(studio, /<LayoutDashboard\/><span>Ringkasan<\/span>/);
  assert.match(studio, /<Palette\/><span>Tema<\/span>/);
  assert.match(studio, /<Settings\/><span>Pengaturan<\/span>/);
  assert.match(studio, /<Globe2\/><span>Domain<\/span>/);
});


test("settings cards and posts remain in normal flow on a real phone", () => {
  assert.match(authority, /\.sn-settings-grid,[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(authority, /\.sn-content-tools[\s\S]*flex-direction: column/);
  assert.match(authority, /\.sn-doc-row[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto 34px !important/);
  assert.match(authority, /\.sn-domain-card[\s\S]*grid-template-columns: 42px minmax\(0, 1fr\) !important/);
  assert.match(authority, /\.nara-composer-tools[\s\S]*grid-template-columns:/);
  assert.match(naraAuthority, /\.nara-native-file-input/);
});
