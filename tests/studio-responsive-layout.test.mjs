import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const authority = read("src/studio-v14-authority.css");
const responsive = read("src/studio-responsive-v21.css");
const secure = read("src/StudioSecure.jsx");
const sidebar = read("src/studio-sidebar-v21.js");
const studio = read("src/StudioNext.jsx");
const pwa = read("src/pwa-runtime.js");

test("Studio loads one final v21 responsive authority instead of competing mobile layers", () => {
  assert.match(index, /studio-v14-authority\.css/);
  assert.match(index, /studio-responsive-v21\.css/);
  assert.match(index, /studio-sidebar-v21\.js/);
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
    "studio-mobile-v15.css",
    "studio-mobile-v16.css",
    "studio-mobile-v17.css",
    "studio-mobile-v18.css",
    "studio-mobile-v19.css",
    "studio-mobile-v20.css",
  ]) assert.doesNotMatch(index, new RegExp(legacy.replaceAll(".", "\\.")));
  assert.match(index, /width=device-width,initial-scale=1,viewport-fit=cover/);
  assert.doesNotMatch(index, /maximum-scale=1/);
});

test("phones keep a visible icon rail and overlay only the expanded panel", () => {
  assert.match(responsive, /@media \(max-width: 760px\)/);
  assert.match(responsive, /--sn-v21-mobile-rail: 64px/);
  assert.match(responsive, /--sn-v21-mobile-panel: min\(86vw, 304px\)/);
  assert.match(responsive, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-v21-mobile-rail\) !important/);
  assert.match(responsive, /\.sn-main,[\s\S]*margin: 0 0 0 var\(--sn-v21-mobile-rail\) !important/);
  assert.match(responsive, /\.sn-sidebar-scrim-v21[\s\S]*background: rgba\(14,31,54,\.46\) !important/);
  assert.match(sidebar, /scrim\.hidden = !mobile \|\| side\.classList\.contains\("collapsed"\)/);
  assert.match(pwa, /const compactViewport = layoutWidth <= 760/);
  assert.match(pwa, /root\.dataset\.physicalMobile = String\(profile\.compactViewport\)/);
});

test("tablet and desktop retain precise panel and rail geometry", () => {
  assert.match(responsive, /--sn-v21-rail: 72px/);
  assert.match(responsive, /--sn-v21-panel: 228px/);
  assert.match(responsive, /@media \(min-width: 761px\)/);
  assert.match(responsive, /\.sn-main,[\s\S]*margin: 0 0 0 var\(--sn-v21-panel\) !important/);
  assert.match(responsive, /\.sn-side\.collapsed \+ \.sn-main,[\s\S]*margin-left: var\(--sn-v21-rail\) !important/);
  assert.match(pwa, /else if \(layoutWidth <= 1024\) mode = "tablet"/);
  assert.match(pwa, /else if \(layoutWidth <= 1440\) mode = "laptop"/);
  assert.match(pwa, /let mode = "desktop"/);
});

test("only the React header button controls sidebar state", () => {
  assert.match(studio, /const \[sidebar,setSidebar\] = useState\(true\)/);
  assert.match(studio, /className=\{sidebar\?"sn-side":"sn-side collapsed"\}/);
  assert.match(studio, /className="sn-icon" onClick=\{\(\)=>setSidebar\(!sidebar\)\}/);
  assert.equal((studio.match(/className="sn-icon"/g) || []).length, 1);
  assert.match(sidebar, /toggle\.dataset\.sidebarAuthority = "single-v21"/);
  assert.match(sidebar, /toggle\.setAttribute\("aria-label", side\.classList\.contains\("collapsed"\) \? "Buka menu Studio" : "Tutup menu Studio"\)/);
  assert.doesNotMatch(sidebar, /sn-sidebar-edge-v21"/);
});

test("bottom navigation is removed and the full menu remains in the sidebar", () => {
  assert.match(responsive, /\.sn-mobile-nav,[\s\S]*\.sn-side-bottom,[\s\S]*display: none !important/);
  assert.match(secure, /sn-mobile-nav, :scope > \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.doesNotMatch(studio, /sn-mobile-nav|sn-mobile-sheet-layer|sn-side-bottom/);
  assert.match(studio, /<LayoutDashboard\/><span>Ringkasan<\/span>/);
  assert.match(studio, /<Palette\/><span>Tema<\/span>/);
  assert.match(studio, /<Settings\/><span>Pengaturan<\/span>/);
  assert.match(studio, /<Globe2\/><span>Domain<\/span>/);
  assert.match(sidebar, /Tata Letak/);
});

test("settings cards posts media domain and Nara remain in normal mobile flow", () => {
  assert.match(responsive, /\.sn-view-pad,[\s\S]*\.bc-center[\s\S]*min-width: 0 !important/);
  assert.match(responsive, /\.sn-welcome,[\s\S]*\.sn-settings-grid[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(responsive, /\.sn-main,[\s\S]*width: calc\(100% - var\(--sn-v21-mobile-rail\)\) !important/);
  assert.match(responsive, /\.sn-content-tools[\s\S]*grid-template-columns: minmax\(0,1fr\) !important/);
  assert.match(responsive, /\.sn-doc-row[\s\S]*grid-template-columns: minmax\(0,1fr\) auto 36px !important/);
  assert.match(responsive, /\.sn-domain-card[\s\S]*grid-template-columns: 42px minmax\(0,1fr\) !important/);
  assert.match(responsive, /\.nara-assistant-layer[\s\S]*inset: 0 !important/);
  assert.match(responsive, /\.nara-floating-button[\s\S]*place-items: center !important/);
  assert.match(authority, /\.nara-composer input\[type="file"\][\s\S]*display: none !important/);
});

test("desktop-site mode on a physical phone keeps the real desktop viewport", () => {
  assert.match(pwa, /const desktopLayoutRequested = physicalScreenMobile && layoutWidth > 760/);
  assert.match(pwa, /root\.dataset\.desktopSitePhone = "false"/);
  assert.match(pwa, /root\.style\.setProperty\("--sn-browser-scale", "1"\)/);
  assert.doesNotMatch(pwa, /layoutWidth \/ screenWidth/);
  assert.doesNotMatch(pwa, /browserScale > 1\.2/);
  assert.match(responsive, /html\[data-desktop-site-phone="true"\] #root[\s\S]*zoom: 1 !important/);
  assert.doesNotMatch(responsive, /zoom: var\(--sn-browser-scale/);
});
