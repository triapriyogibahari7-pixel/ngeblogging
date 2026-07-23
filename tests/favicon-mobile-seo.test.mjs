import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const favicon = readFileSync(new URL("../public/favicon.svg", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../public/site.webmanifest", import.meta.url), "utf8"));
const bridge = readFileSync(new URL("../src/site-favicon-bridge.js", import.meta.url), "utf8");
const mobile = readFileSync(new URL("../src/studio-mobile-navigation.js", import.meta.url), "utf8");
const polish = readFileSync(new URL("../src/studio-mobile-polish.css", import.meta.url), "utf8");
const responsive = readFileSync(new URL("../src/studio-responsive-fix.css", import.meta.url), "utf8");
const seo = readFileSync(new URL("../server/seo-handler.mjs", import.meta.url), "utf8");


test("main Ngeblogging favicon is permanent and installable", () => {
  assert.match(index, /rel="icon" href="\/favicon\.svg"/);
  assert.match(index, /rel="manifest" href="\/site\.webmanifest"/);
  assert.match(index, /apple-mobile-web-app-title/);
  assert.match(favicon, /viewBox="0 0 512 512"/);
  assert.equal(manifest.name, "Ngeblogging");
  assert.equal(manifest.icons[0].src, "/favicon.svg");
  assert.match(manifest.icons[0].purpose, /maskable/);
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
  assert.match(seo, /icons\.custom \? \[/);
  assert.match(seo, /sizes:"192x192"/);
  assert.match(seo, /sizes:"512x512"/);
  assert.match(seo, /removeStaticBrandingLinks/);
  assert.match(seo, /rel="apple-touch-icon"/);
  assert.match(seo, /schemaType = content \?.*WebSite/);
  assert.match(seo, /twitter:title/);
  assert.match(seo, /sitemap-posts\.xml/);
});


test("mobile Studio keeps an accessible collapsible icon rail", () => {
  assert.match(index, /studio-mobile-polish\.css/);
  assert.match(index, /studio-mobile-navigation\.js/);
  assert.match(mobile, /if \(media\.matches && !side\.classList\.contains\("collapsed"\)\)/);
  assert.match(mobile, /collapseRail\(shell\)/);
  assert.match(mobile, /sn-side-close/);
  assert.match(mobile, /aria-expanded/);
  assert.match(mobile, /event\.key !== "Escape"/);
  assert.match(mobile, /labelSidebarButtons\(side\)/);
  assert.doesNotMatch(mobile, /sn-sidebar-backdrop/);
  assert.doesNotMatch(mobile, /sn-mobile-sidebar-lock/);
  assert.match(responsive, /\.sn-side\.collapsed\{[\s\S]*width:70px!important/);
  assert.match(responsive, /\.sn-mobile-nav,\.sn-mobile-sheet-layer,\.sn-sidebar-backdrop\{display:none!important\}/);
  assert.match(polish, /font-size:13px!important/);
  assert.match(polish, /@media\(max-width:430px\)/);
});
