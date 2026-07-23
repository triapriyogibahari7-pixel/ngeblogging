import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const favicon = readFileSync(new URL("../public/favicon.svg", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../public/site.webmanifest", import.meta.url), "utf8"));
const serviceWorker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const appShell = readFileSync(new URL("../src/app-shell-bridge.js", import.meta.url), "utf8");
const bridge = readFileSync(new URL("../src/site-favicon-bridge.js", import.meta.url), "utf8");
const mobile = readFileSync(new URL("../src/studio-mobile-navigation.js", import.meta.url), "utf8");
const production = readFileSync(new URL("../src/studio-production-audit.css", import.meta.url), "utf8");
const seo = readFileSync(new URL("../server/seo-handler.mjs", import.meta.url), "utf8");


test("main Ngeblogging favicon and PWA shell are installable", () => {
  assert.match(index, /rel="icon" href="\/favicon\.svg"/);
  assert.match(index, /rel="manifest" href="\/site\.webmanifest"/);
  assert.match(index, /app-shell-bridge\.js/);
  assert.match(index, /apple-mobile-web-app-title/);
  assert.match(favicon, /viewBox="0 0 512 512"/);
  assert.equal(manifest.name, "Ngeblogging");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons[0].src, "/favicon.svg");
  assert.match(manifest.icons[0].purpose, /maskable/);
  assert.match(serviceWorker, /networkFirstNavigation/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(appShell, /beforeinstallprompt/);
  assert.match(appShell, /navigator\.serviceWorker\.register\("\/sw\.js"/);
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


test("Studio uses one accessible sidebar toggle at every viewport", () => {
  assert.match(index, /studio-production-audit\.css/);
  assert.match(index, /studio-mobile-navigation\.js/);
  assert.match(mobile, /const COMPACT_QUERY = "\(max-width: 900px\)"/);
  assert.match(mobile, /collapseSidebar\(shell\)/);
  assert.match(mobile, /aria-expanded/);
  assert.match(mobile, /event\.key !== "Escape"/);
  assert.match(mobile, /labelSidebarButtons\(side\)/);
  assert.match(mobile, /querySelectorAll\(":scope > \.sn-side-close"\)/);
  assert.doesNotMatch(mobile, /createElement\("button"\)[\s\S]*sn-side-close/);
  assert.doesNotMatch(mobile, /sn-sidebar-backdrop/);
  assert.doesNotMatch(mobile, /sn-mobile-sidebar-lock/);
  assert.match(production, /--sn-rail:70px;--sn-panel:220px/);
  assert.match(production, /@media\(max-width:900px\)/);
  assert.match(production, /margin-left:var\(--sn-rail\)!important/);
  assert.match(production, /\.sn-side-close,.sn-mobile-nav,.sn-mobile-sheet-layer,.sn-sidebar-backdrop\{display:none!important\}/);
});
