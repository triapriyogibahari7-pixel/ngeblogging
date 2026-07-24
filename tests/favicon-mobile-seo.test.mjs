import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const favicon = readFileSync(new URL("../public/favicon.svg", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../public/site.webmanifest", import.meta.url), "utf8"));
const serviceWorker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const appShell = readFileSync(new URL("../src/app-shell-bridge.js", import.meta.url), "utf8");
const bridge = readFileSync(new URL("../src/site-favicon-bridge.js", import.meta.url), "utf8");
const authority = readFileSync(new URL("../src/studio-v14-authority.css", import.meta.url), "utf8");
const naraAuthority = readFileSync(new URL("../src/nara-interaction-authority.css", import.meta.url), "utf8");
const secure = readFileSync(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");
const seo = readFileSync(new URL("../server/seo-handler.mjs", import.meta.url), "utf8");


test("main Ngeblogging favicon and PWA shell are installable and update safely", () => {
  assert.match(index, /rel="icon" href="\/favicon\.svg"/);
  assert.match(index, /rel="manifest" href="\/site\.webmanifest"/);
  assert.match(index, /app-shell-bridge\.js/);
  assert.match(index, /apple-mobile-web-app-title/);
  assert.match(favicon, /viewBox="0 0 512 512"/);
  assert.equal(manifest.name, "Ngeblogging");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons[0].src, "/favicon.svg");
  assert.match(manifest.icons[0].purpose, /maskable/);
  assert.match(serviceWorker, /ngeblogging-app-v14-20260724/);
  assert.match(serviceWorker, /async function networkFirst\(/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/src\/"\)/);
  assert.match(appShell, /beforeinstallprompt/);
  assert.match(appShell, /navigator\.serviceWorker\.register\("\/sw\.js"/);
  assert.match(appShell, /mobileUserAgent\(\)/);
  assert.match(appShell, /width <= 760/);
  assert.match(appShell, /return "mobile"/);
  assert.match(appShell, /return "tablet"/);
  assert.match(appShell, /return "laptop"/);
  assert.match(appShell, /return "desktop"/);
});


test("site owners can upload a normalized per-site favicon", () => {
  assert.match(index, /site-favicon-bridge\.js/);
  assert.match(bridge, /MAX_SOURCE_BYTES = 5 \* 1024 \* 1024/);
  assert.match(bridge, /for \(const size of \[192, 512\]\)/);
  assert.match(bridge, /uploadMedia\(\{ file: variant\.file, siteId: context\.site\.id, userId: context\.user\.id \}\)/);
  assert.match(bridge, /branding:[\s\S]*favicon:[\s\S]*icon192Url:[\s\S]*icon512Url:/);
  assert.match(bridge, /\.from\("sites"\)[\s\S]*\.update\(\{ settings \}\)/);
  assert.match(bridge, /deleteMedia\(asset\)/);
  assert.match(bridge, /otomatis dipotong persegi/);
});


test("Cloudflare edge emits tenant favicon, manifest, and structured SEO", () => {
  assert.match(seo, /blueprint,settings,published_at/);
  assert.match(seo, /function faviconSet\(site, base\)/);
  assert.match(seo, /site_domains\?select=site_id&hostname=/);
  assert.match(seo, /icons\.custom \? \[/);
  assert.match(seo, /sizes:"192x192"/);
  assert.match(seo, /sizes:"512x512"/);
  assert.match(seo, /removeStaticBrandingLinks/);
  assert.match(seo, /rel="apple-touch-icon"/);
  assert.match(seo, /schemaType = content \?.*WebSite/);
  assert.match(seo, /twitter:title/);
  assert.match(seo, /sitemap-posts\.xml/);
});


test("Studio uses one accessible edge toggle, icon-only collapsed rail, and no bottom navigation", () => {
  assert.match(index, /studio-v14-authority\.css/);
  assert.match(index, /nara-interaction-authority\.css/);
  assert.ok(index.indexOf("nara-interaction-authority.css") > index.indexOf("studio-v14-authority.css"));
  for (const legacy of ["studio-mobile-navigation.js", "studio-runtime-layout-guard.js", "studio-production-guard.js", "studio-v10-authority.css", "studio-v11-mobile-repair.css"]) {
    assert.doesNotMatch(index, new RegExp(legacy.replaceAll(".", "\\.")));
  }
  assert.match(authority, /--sn-rail-width: 72px/);
  assert.match(authority, /--sn-panel-width: 228px/);
  assert.match(authority, /--sn-phone-rail: 58px/);
  assert.match(authority, /\.sn-mobile-nav,[\s\S]*\.sn-side-bottom,[\s\S]*display: none !important/);
  assert.match(authority, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-rail-width\) !important/);
  assert.match(authority, /\.sn-side\.collapsed > nav > button[\s\S]*justify-content: center/);
  assert.match(authority, /\.sn-icon[\s\S]*position: fixed !important/);
  assert.match(secure, /studio-source-navigation-v14-20260724/);
  assert.match(secure, /dataset\.sidebarAuthority = "single"/);
  assert.match(secure, /aria-controls/);
  assert.match(secure, /aria-expanded/);
  assert.match(secure, /Buka menu Studio/);
  assert.match(secure, /Tutup menu Studio/);
  assert.match(secure, /\.sn-mobile-nav, :scope > \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.match(naraAuthority, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
});
