import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const critical = readFileSync(new URL("../src/studio-mobile-critical.css", import.meta.url), "utf8");
const guard = readFileSync(new URL("../src/studio-runtime-layout-guard.js", import.meta.url), "utf8");
const themeSystem = readFileSync(new URL("../src/theme-system.js", import.meta.url), "utf8");
const publicSite = readFileSync(new URL("../src/PublicSiteNext.jsx", import.meta.url), "utf8");
const serviceWorker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

test("mobile Studio navigation is forced to the physical bottom with one sidebar toggle", () => {
  const deviceCss = index.indexOf("studio-device-mode.css");
  const criticalCss = index.indexOf("studio-mobile-critical.css");
  const navigationScript = index.indexOf("studio-mobile-navigation.js");
  const guardScript = index.indexOf("studio-runtime-layout-guard.js");
  assert.ok(criticalCss > deviceCss);
  assert.ok(guardScript > navigationScript);
  assert.match(critical, /\.sn-mobile-nav\{[^}]*position:fixed!important/);
  assert.match(critical, /top:auto!important/);
  assert.match(critical, /bottom:0!important/);
  assert.match(critical, /z-index:4000!important/);
  assert.match(guard, /important\(nav, "top", "auto"\)/);
  assert.match(guard, /important\(nav, "bottom", "0"\)/);
  assert.match(guard, /querySelectorAll\(":scope > \.sn-side-close"\)\.forEach\(\(node\) => node\.remove\(\)\)/);
});

test("media, domain, and theme views have dedicated real-phone layouts", () => {
  assert.match(critical, /\.sn-media-tools\{display:grid!important/);
  assert.match(critical, /\.sn-media-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(critical, /\.sn-domain-card,/);
  assert.match(critical, /\.tn-hero\{display:grid!important;grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(critical, /\.tn-frame-shell\.mobile iframe/);
  assert.match(critical, /\.tn-frame-shell\.desktop iframe\{width:1440px!important/);
});

test("public theme widgets are inserted inside the theme and populated from tenant data", () => {
  assert.match(themeSystem, /injectBeforeClosingTag\(sourceHtml, "main", contentWidgets\)/);
  assert.doesNotMatch(themeSystem, /\$\{sidebarWidgets \? `<aside[^`]+` : ""\}\$\{html\}/);
  assert.match(themeSystem, /grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,240px\),1fr\)\)/);
  assert.match(themeSystem, /viewport-fit=cover/);
  assert.match(publicSite, /populatePostList\('\.ng-widget-recent-posts ol',data\.posts\)/);
  assert.match(publicSite, /renderCards\(input\?\.value\|\|''\)/);
  assert.match(publicSite, /const supported=new Set\(\['search','recent-posts','popular-posts','categories','tags'\]\)/);
  assert.doesNotMatch(publicSite, /className="ps-theme-tools"/);
});

test("the release invalidates stale CSS and JavaScript caches", () => {
  assert.match(serviceWorker, /ngeblogging-app-v4-20260724/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: "no-store" \}\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/src\/"\)/);
});
