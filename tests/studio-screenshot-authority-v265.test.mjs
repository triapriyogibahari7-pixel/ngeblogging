import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studio = read("src/Studio.jsx");
const source = read("src/StudioNext.jsx");
const runtime = read("src/studio-screenshot-authority-v265.js");
const css = read("src/studio-screenshot-authority-v265.css");
const nara = read("src/NaraAssistant.jsx");
const swPatch = read("scripts/patch-service-worker-v265.mjs");
const swChain = read("scripts/patch-service-worker-v179.mjs");

test("v265 loads after v264 as the last screenshot authority", () => {
  const v264css = studio.indexOf('import "./studio-theme-layout-v264.css";');
  const v265js = studio.indexOf('import "./studio-screenshot-authority-v265.js";');
  const v265css = studio.indexOf('import "./studio-screenshot-authority-v265.css";');
  assert.ok(v264css >= 0);
  assert.ok(v265js > v264css);
  assert.ok(v265css > v265js);
});

test("the internal sidebar n proxies to the React-owned toggle instead of duplicating state", () => {
  assert.match(source, /className="sn-icon sn-sidebar-toggle" onClick=\{toggleSidebar\}/);
  assert.match(source, /className="sn-logo-mark"/);
  assert.match(runtime, /mark\.addEventListener\("click"/);
  assert.match(runtime, /document\.querySelector\("\.sn-top \.sn-sidebar-toggle"\)\?\.click\(\)/);
  assert.match(runtime, /mark\.addEventListener\("keydown"/);
  assert.match(css, /\.sn-top>\.sn-sidebar-toggle,.sn-sidebar-toggle\{display:none!important\}/);
  assert.match(css, /#ngeblogging-studio-sidebar\.collapsed>nav button/);
});

test("small layout keeps one n when closed and a bounded full-height drawer when open", () => {
  assert.match(css, /#ngeblogging-studio-sidebar:not\(\.mobile-open\)\{display:none!important\}/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open[\s\S]*width:min\(76vw,310px\)!important/);
  assert.match(css, /body\.sn-mobile-sidebar-open \.sn-top>\.sn-sidebar-toggle/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*backdrop-filter:none!important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open \*\{pointer-events:auto!important\}/);
});

test("desktop-site phone mode is explicitly treated as large and pinned to the left edge", () => {
  assert.match(runtime, /studioDesktopSitePhone === "true"/);
  assert.match(runtime, /v232ModeLock === "desktop-site-large"/);
  assert.match(css, /html\[data-studio-desktop-site-phone="true"\] #ngeblogging-studio-sidebar/);
  assert.match(css, /left:0!important;transform:none!important/);
});

test("profile menu has distinct Profile Settings Add Site View Site Install and Logout actions", () => {
  for (const marker of [
    "Profil & avatar", "Pengaturan situs", "+ Tambahkan situs", "Lihat situs",
    "Dapatkan aplikasi", "Keluar",
  ]) assert.ok(runtime.includes(marker), `missing profile menu marker ${marker}`);
  assert.match(runtime, /openAccountView\("profile"\)/);
  assert.match(runtime, /openAccountView\("settings"\)/);
  assert.match(runtime, /openSiteManager\(\)/);
  assert.match(runtime, /openPublicSite\(\)/);
  assert.match(css, /\.sn-profile-menu-v150[\s\S]*max-height:min\(72dvh,560px\)!important/);
});

test("Nara launcher is fixed and small medium remain non-modal with camera photo file menu visible", () => {
  assert.match(runtime, /const modal = size === "full"/);
  assert.match(runtime, /layer\.setAttribute\("aria-modal", String\(modal\)\)/);
  assert.match(runtime, /backdrop\.hidden = !modal/);
  assert.match(css, /\.nara-floating-button[\s\S]*position:fixed!important/);
  assert.match(css, /data-nara-modal-v265="false"/);
  assert.match(css, /data-nara-modal-v265="true"/);
  assert.match(css, /\.nara-attachment-menu[\s\S]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
  for (const marker of ["Kamera", "Foto", "File teks"]) assert.ok(nara.includes(marker));
});

test("editor Domain and add-site dialog cannot overflow the mobile viewport", () => {
  assert.match(css, /\.ce-actions\{grid-area:actions!important;display:grid!important;grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css, /\.ce-tabs,.ce-ribbon[\s\S]*overflow-x:auto!important/);
  assert.match(css, /\.sv124-free-domain>aside,.sv124-domain-register form\{display:grid!important;grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css, /\.sn-site-manager[\s\S]*width:min\(760px,calc\(100vw - 24px\)\)!important/);
});

test("service-worker cache namespace rotates after the legacy migration chain without forcing a second navigation", () => {
  const restore = swChain.indexOf("await restoreCurrentServiceWorker();");
  const patch265 = swChain.indexOf('await import("./patch-service-worker-v265.mjs");');
  assert.ok(restore >= 0);
  assert.ok(patch265 > restore);
  assert.match(swPatch, /studio-screenshot-authority-v265-20260804/);
  assert.match(swPatch, /studio-screenshot-authority-cache-v265/);
  assert.match(swPatch, /UI_PATCH_RELEASE_V263/);
  assert.match(swPatch, /UI_PATCH_RELEASE_V265/);
  assert.match(swPatch, /UI_CACHE_RELEASE_V265/);
  assert.doesNotMatch(swPatch, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("v265 does not contain destructive session or automatic logout operations", () => {
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(runtime, /sessionStorage\.clear\s*\(/);
  assert.doesNotMatch(runtime, /signOut\s*\(/);
  assert.doesNotMatch(runtime, /location\.reload\s*\(/);
});
