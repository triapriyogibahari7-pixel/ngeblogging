import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const favicon = read("public/favicon.svg");
const manifest = JSON.parse(read("public/site.webmanifest"));
const serviceWorker = read("public/sw.js");
const pwa = read("src/pwa-runtime.js");
const faviconBridge = read("src/site-favicon-bridge.js");
const shellCss = read("src/studio-shell-v29.css");
const shellRuntime = read("src/studio-shell-v29.js");
const secure = read("src/StudioSecure.jsx");
const studio = read("src/StudioNext.jsx");
const seo = read("server/seo-handler.mjs");

const LEGACY_UI = [
  "app-shell-bridge.js",
  "studio-runtime-layout-guard.js",
  "studio-mobile-navigation.js",
  "studio-production-guard.js",
  "nara-availability-bridge.js",
  "studio-v10-authority.css",
  "studio-v11-mobile-repair.css",
  "studio-mobile-v15.css",
  "studio-mobile-v16.css",
  "studio-mobile-v17.css",
  "studio-mobile-v18.css",
  "studio-mobile-v19.css",
  "studio-mobile-v20.css",
  "nara-launcher-v20.js",
];

test("main favicon and PWA install with a guarded one-time v77 recovery", () => {
  assert.match(index, /rel="icon" href="\/favicon\.svg"/);
  assert.match(index, /rel="manifest" href="\/site\.webmanifest"/);
  assert.match(index, /apple-mobile-web-app-title/);
  assert.match(index, /pwa-runtime\.js/);
  assert.match(favicon, /viewBox="0 0 512 512"/);
  assert.equal(manifest.name, "Ngeblogging");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons[0].src, "/favicon.svg");
  assert.match(manifest.icons[0].purpose, /maskable/);
  assert.match(serviceWorker, /ngeblogging-app-v77-20260727/);
  assert.match(serviceWorker, /async function networkFirst\(/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/src\/"\)/);
  assert.match(serviceWorker, /includeUncontrolled: true/);
  assert.match(serviceWorker, /client\.navigate\(url\.href\)/);
  assert.match(pwa, /ngeblogging-pwa-v77-20260727/);
  assert.match(pwa, /beforeinstallprompt/);
  assert.match(pwa, /navigator\.serviceWorker\.register\("\/sw\.js"/);
  assert.match(pwa, /navigator\.serviceWorker\.addEventListener\("controllerchange"/);
  assert.match(pwa, /sessionStorage\.setItem\(CONTROLLER_GUARD, RECOVERY_VALUE\)/);
  assert.match(pwa, /window\.location\.replace\(url\.href\)/);
  assert.doesNotMatch(pwa, /window\.location\.reload/);
});

test("site owners can upload a normalized per-site favicon", () => {
  assert.match(index, /site-favicon-bridge\.js/);
  assert.match(faviconBridge, /MAX_SOURCE_BYTES = 5 \* 1024 \* 1024/);
  assert.match(faviconBridge, /for \(const size of \[192, 512\]\)/);
  assert.match(faviconBridge, /uploadMedia\(\{ file: variant\.file, siteId: context\.site\.id, userId: context\.user\.id \}\)/);
  assert.match(faviconBridge, /branding:[\s\S]*favicon:[\s\S]*icon192Url:[\s\S]*icon512Url:/);
  assert.match(faviconBridge, /\.from\("sites"\)[\s\S]*\.update\(\{ settings \}\)/);
  assert.match(faviconBridge, /deleteMedia\(asset\)/);
});

test("Cloudflare edge emits tenant favicon manifest and structured SEO", () => {
  for (const marker of [
    "blueprint,settings,published_at",
    "function faviconSet(site, base)",
    "site_domains?select=site_id&hostname=",
    'sizes:"192x192"',
    'sizes:"512x512"',
    "removeStaticBrandingLinks",
    'rel="apple-touch-icon"',
    "twitter:title",
    "sitemap-posts.xml",
  ]) assert.ok(seo.includes(marker), marker);
});

test("Studio v29 has one Cloudflare-style mobile drawer and no bottom menu", () => {
  assert.match(index, /studio-shell-v29\.css/);
  assert.match(index, /studio-shell-v29\.js/);
  for (const legacy of LEGACY_UI) assert.doesNotMatch(index, new RegExp(`<script[^>]+${legacy.replaceAll(".", "\\.")}|<link[^>]+${legacy.replaceAll(".", "\\.")}`));
  assert.equal((studio.match(/className="sn-icon"/g) || []).length, 1);
  assert.doesNotMatch(studio, /sn-mobile-nav|sn-mobile-sheet-layer|sn-side-bottom/);
  assert.match(secure, /studio-source-navigation-v29-20260725/);
  for (const marker of ["sn-mobile-v29-header", "sn-mobile-v29-close", "sn-mobile-v29-launcher", "sn-mobile-v29-scrim"]) {
    assert.ok(shellRuntime.includes(marker), marker);
  }
  assert.match(shellCss, /--sn-v29-panel: min\(84vw, 360px\)/);
  assert.match(shellCss, /\.sn-side\.collapsed[\s\S]*translate3d\(calc\(-100% - 18px\), 0, 0\)/);
  assert.match(shellCss, /\.sn-mobile-v29-scrim[\s\S]*backdrop-filter: none !important/);
  assert.match(shellCss, /\.nara-assistant-layer\[data-nara-shell-v29="true"\][\s\S]*z-index: 2147483600 !important/);
});
