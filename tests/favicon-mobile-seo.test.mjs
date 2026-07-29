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
const studioEntry = read("src/Studio.jsx");
const interfaceCss = read("src/studio-interface-authority-v147.css");
const shellController = read("src/studio-shell-controller-v147.js");
const seo = read("server/seo-handler.mjs");

test("main n favicon and PWA v147 install with guarded one-time recovery", () => {
  assert.match(index, /rel="icon" href="\/favicon\.svg"/);
  assert.match(index, /rel="manifest" href="\/site\.webmanifest"/);
  assert.match(index, /apple-mobile-web-app-title/);
  assert.match(index, /pwa-runtime\.js/);
  assert.match(favicon, /viewBox="0 0 512 512"/);
  assert.match(favicon, /Ikon huruf n untuk Ngeblogging/);
  assert.doesNotMatch(favicon, /<circle/);
  assert.equal(manifest.name, "Ngeblogging");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons[0].src, "/favicon.svg");
  assert.match(manifest.icons[0].purpose, /maskable/);
  assert.match(serviceWorker, /ngeblogging-app-v147-studio-interface-20260729/);
  assert.match(serviceWorker, /ngeblogging-app-v145-studio-mobile-cache-20260729/);
  assert.match(serviceWorker, /async function networkFirst\(/);
  assert.match(serviceWorker, /function isAuthSurface\(/);
  assert.match(serviceWorker, /refreshStaleWindow/);
  assert.match(serviceWorker, /client\.navigate\(url\.href\)/);
  assert.match(pwa, /ngeblogging-pwa-v147-20260729/);
  assert.match(pwa, /ngeblogging-pwa-controller-v147/);
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

test("Studio v147 keeps one React authority, n logo, responsive sidebar, and profile menu", () => {
  assert.match(index, /ngeblogging-studio-runtime-authority" content="react-v144"/);
  assert.match(studioEntry, /studio-shell-controller-v147\.js/);
  assert.match(studioEntry, /studio-interface-authority-v147\.css/);
  assert.match(interfaceCss, /--sn-v147-sidebar-open:268px/);
  assert.match(interfaceCss, /--sn-v147-sidebar-closed:80px/);
  assert.match(interfaceCss, /width:min\(82vw,360px\)!important/);
  assert.match(interfaceCss, /sn-sidebar-edge-toggle-v147/);
  assert.match(interfaceCss, /sn-profile-menu-v147/);
  assert.doesNotMatch(interfaceCss, /content:"n\."/);
  assert.match(shellController, /sn-sidebar-edge-toggle-v147/);
  assert.match(shellController, /sn-profile-menu-v147/);
  assert.match(shellController, />Profil</);
  assert.match(shellController, />Pengaturan</);
  assert.match(shellController, />Keluar</);
});
