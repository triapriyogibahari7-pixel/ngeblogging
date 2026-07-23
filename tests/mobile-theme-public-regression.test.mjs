import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const critical = readFileSync(new URL("../src/studio-mobile-critical.css", import.meta.url), "utf8");
const guard = readFileSync(new URL("../src/studio-runtime-layout-guard.js", import.meta.url), "utf8");
const themeStudio = readFileSync(new URL("../src/ThemeStudio.jsx", import.meta.url), "utf8");
const deviceCss = readFileSync(new URL("../src/theme-device-modes.css", import.meta.url), "utf8");
const themeSystem = readFileSync(new URL("../src/theme-system.js", import.meta.url), "utf8");
const publicSite = readFileSync(new URL("../src/PublicSiteNext.jsx", import.meta.url), "utf8");
const serviceWorker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const worker = readFileSync(new URL("../cloudflare/worker.mjs", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");


test("mobile Studio uses only the left sidebar and one edge toggle", () => {
  const deviceAuthority = index.indexOf("studio-device-mode.css");
  const criticalCss = index.indexOf("studio-mobile-critical.css");
  const navigationScript = index.indexOf("studio-mobile-navigation.js");
  const guardScript = index.indexOf("studio-runtime-layout-guard.js");
  assert.ok(criticalCss > deviceAuthority);
  assert.ok(guardScript > navigationScript);
  assert.match(critical, /\.sn-shell>\.sn-mobile-nav,\.sn-shell>\.sn-mobile-sheet-layer\{display:none!important\}/);
  assert.match(critical, /\.sn-side\.collapsed\+\.sn-main \.sn-icon\{left:12px!important\}/);
  assert.match(critical, /\.sn-side:not\(\.collapsed\)\+\.sn-main \.sn-icon\{left:calc\(var\(--sn-phone-panel\) - 22px\)!important\}/);
  assert.match(critical, /z-index:5001!important/);
  assert.match(guard, /removeLegacyControls\(shell\)/);
  assert.match(guard, /querySelectorAll\(":scope > \.sn-mobile-nav, :scope > \.sn-mobile-sheet-layer"\)/);
  assert.match(guard, /dataset\.sidebarAuthority = "single"/);
  assert.match(guard, /studio-sidebar-only-v5-20260724/);
  assert.doesNotMatch(guard, /important\(nav, "display", "grid"\)/);
});


test("media, domain, and theme views have dedicated real-phone layouts", () => {
  assert.match(critical, /\.sn-media-tools\{display:grid!important/);
  assert.match(critical, /\.sn-media-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(critical, /\.sn-domain-card,/);
  assert.match(critical, /\.tn-hero\{display:grid!important;grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(critical, /\.tn-frame-shell\.mobile iframe/);
  assert.match(critical, /\.tn-frame-shell\.desktop iframe\{width:1440px!important/);
});


test("theme preview exposes native Mobile Tablet Laptop and Komputer modes", () => {
  assert.match(index, /theme-device-modes\.css/);
  assert.doesNotMatch(index, /theme-device-mode-bridge\.js/);
  assert.match(themeStudio, /\{ id: "mobile", label: "Mobile", icon: Smartphone \}/);
  assert.match(themeStudio, /\{ id: "tablet", label: "Tablet", icon: Tablet \}/);
  assert.match(themeStudio, /\{ id: "laptop", label: "Laptop", icon: Laptop \}/);
  assert.match(themeStudio, /\{ id: "desktop", label: "Komputer", icon: Monitor \}/);
  assert.match(themeStudio, /useState\(initialPreviewDevice\)/);
  assert.match(themeStudio, /<b>4<\/b><span>Mode perangkat<\/span>/);
  assert.match(deviceCss, /\.tn-frame-shell\.laptop iframe/);
  assert.match(deviceCss, /\.tn-frame-shell\.desktop iframe/);
});


test("the catalog contains 100 unique HTML themes instead of color-only duplicates", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.code.html)).size, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => `${theme.code.html}\n${theme.code.css}`)).size, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.layout)).size, 20);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.composition)).size, 5);
  for (const theme of BUILT_IN_THEMES) {
    assert.match(theme.code.html, /class="ng-theme/);
    assert.match(theme.code.html, /class="ng-header/);
    assert.match(theme.code.html, /class="ng-hero/);
    assert.match(theme.code.html, /class="ng-cards"/);
    assert.ok(theme.code.html.length > 1400, `${theme.id} HTML terlalu tipis`);
    assert.ok(theme.code.css.length > 4000, `${theme.id} CSS terlalu tipis`);
  }
});


test("public theme widgets are inserted inside the theme and populated from tenant data", () => {
  assert.match(themeSystem, /injectBeforeClosingTag\(sourceHtml, "main", contentWidgets\)/);
  assert.doesNotMatch(themeSystem, /\$\{sidebarWidgets \? `<aside[^`]+` : ""\}\$\{html\}/);
  assert.match(themeSystem, /grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,240px\),1fr\)\)/);
  assert.match(themeSystem, /\.ng-header nav\.open/);
  assert.match(themeSystem, /viewport-fit=cover/);
  assert.match(publicSite, /populatePostList\('\.ng-widget-recent-posts ol',data\.posts\)/);
  assert.match(publicSite, /renderCards\(input\?\.value\|\|''\)/);
  assert.match(publicSite, /const supported=new Set\(\['search','recent-posts','popular-posts','categories','tags'\]\)/);
  assert.doesNotMatch(publicSite, /className="ps-theme-tools"/);
});


test("Nara is restored when its existing production credentials are available", () => {
  assert.match(worker, /NARA_PRODUCTION_READY/);
  assert.match(worker, /NARA_PRODUCTION_PROBE/);
  assert.match(worker, /deliveryProbe === "passed"/);
  assert.match(wrangler, /"NARA_PRODUCTION_READY": "true"/);
  assert.match(wrangler, /"NARA_PRODUCTION_PROBE": "passed"/);
  assert.match(wrangler, /"QWEN_API_KEY"/);
  assert.match(wrangler, /"QWEN_WORKSPACE_ID"/);
});


test("the release invalidates stale CSS and JavaScript caches", () => {
  assert.match(serviceWorker, /ngeblogging-app-v5-20260724/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: "no-store" \}\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/src\/"\)/);
});
