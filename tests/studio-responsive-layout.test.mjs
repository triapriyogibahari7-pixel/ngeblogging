import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const authority = read("src/studio-v14-authority.css");
const secure = read("src/StudioSecure.jsx");
const studio = read("src/StudioNext.jsx");
const pwa = read("src/pwa-runtime.js");

test("Studio loads one responsive authority instead of competing legacy layers", () => {
  assert.match(index, /studio-v14-authority\.css/);
  for (const legacy of [
    "studio-responsive-fix.css",
    "studio-mobile-polish.css",
    "studio-production-audit.css",
    "studio-device-mode.css",
    "studio-mobile-critical.css",
    "studio-final-mobile.css",
    "studio-v8-hardening.css",
    "studio-v10-authority.css",
    "studio-v11-mobile-repair.css",
    "studio-runtime-layout-guard.js",
    "studio-mobile-navigation.js",
    "studio-production-guard.js",
  ]) assert.doesNotMatch(index, new RegExp(legacy.replaceAll(".", "\\.")));
  assert.match(index, /width=device-width,initial-scale=1,viewport-fit=cover/);
  assert.doesNotMatch(index, /maximum-scale=1/);
});

test("phones keep a visible icon rail and overlay only the expanded panel", () => {
  assert.match(authority, /@media \(max-width: 760px\)/);
  assert.match(authority, /--sn-phone-rail: 58px/);
  assert.match(authority, /--sn-phone-panel: min\(78vw, 272px\)/);
  assert.match(authority, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-phone-rail\) !important/);
  assert.match(authority, /\.sn-main,[\s\S]*margin-left: var\(--sn-phone-rail\) !important/);
  assert.match(authority, /\.sn-side:not\(\.collapsed\) \+ \.sn-main::before/);
  assert.match(authority, /pointer-events: none/);
  assert.match(pwa, /if \(width <= 760\) return "mobile"/);
});

test("tablet and desktop retain precise panel and rail geometry", () => {
  assert.match(authority, /--sn-rail-width: 72px/);
  assert.match(authority, /--sn-panel-width: 228px/);
  assert.match(authority, /\.sn-main,[\s\S]*margin-left: var\(--sn-panel-width\) !important/);
  assert.match(authority, /\.sn-side\.collapsed \+ \.sn-main[\s\S]*margin-left: var\(--sn-rail-width\) !important/);
  assert.match(authority, /@media \(max-width: 1024px\)/);
  assert.match(pwa, /if \(width <= 1024\) return "tablet"/);
  assert.match(pwa, /if \(width <= 1440\) return "laptop"/);
  assert.match(pwa, /return "desktop"/);
});

test("only the React header button controls sidebar state", () => {
  assert.match(studio, /const \[sidebar,setSidebar\] = useState\(true\)/);
  assert.match(studio, /className=\{sidebar\?"sn-side":"sn-side collapsed"\}/);
  assert.match(studio, /className="sn-icon" onClick=\{\(\)=>setSidebar\(!sidebar\)\}/);
  assert.equal((studio.match(/className="sn-icon"/g) || []).length, 1);
  assert.match(secure, /dataset\.sidebarAuthority = "single"/);
  assert.match(secure, /aria-label", side\.classList\.contains\("collapsed"\) \? "Buka menu Studio" : "Tutup menu Studio"/);
  assert.doesNotMatch(secure, /createElement\("button"\)/);
});

test("bottom navigation is removed and the full menu remains in the sidebar", () => {
  assert.match(authority, /\.sn-mobile-nav,[\s\S]*\.sn-side-bottom,[\s\S]*display: none !important/);
  assert.match(secure, /sn-mobile-nav, :scope > \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.doesNotMatch(studio, /sn-mobile-nav|sn-mobile-sheet-layer|sn-side-bottom/);
  assert.match(studio, /<LayoutDashboard\/><span>Ringkasan<\/span>/);
  assert.match(studio, /<Palette\/><span>Tema<\/span>/);
  assert.match(studio, /<Settings\/><span>Pengaturan<\/span>/);
  assert.match(studio, /<Globe2\/><span>Domain<\/span>/);
});

test("settings cards posts media domain and Nara remain in normal mobile flow", () => {
  assert.match(authority, /\.sn-view-pad,[\s\S]*\.sn-settings-grid,[\s\S]*min-width: 0/);
  assert.match(authority, /\.sn-welcome,[\s\S]*\.sn-settings-grid,[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(authority, /\.sn-content-tools[\s\S]*flex-direction: column/);
  assert.match(authority, /\.sn-doc-row[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto 34px !important/);
  assert.match(authority, /\.sn-domain-card[\s\S]*grid-template-columns: 42px minmax\(0, 1fr\) !important/);
  assert.match(authority, /\.nara-assistant-layer,[\s\S]*width: 100vw !important/);
  assert.match(authority, /\.nara-composer textarea[\s\S]*min-height: 88px !important/);
});
