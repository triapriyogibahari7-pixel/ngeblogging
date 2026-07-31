import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const studio = read("src/StudioNext.jsx");
const runtime = read("src/studio-screenshot-stability-v177.js");
const css = read("src/studio-screenshot-stability-v177.css");
const nara = read("src/NaraAssistant.jsx");
const platform = read("src/studio-platform-v160.js");
const patch = read("scripts/run-patch-screenshot-stability-v177.mjs");
const packageJson = JSON.parse(read("package.json"));
const serviceWorker = read("public/sw.js");
const worker = read("cloudflare/worker-v69.mjs");
const publisher = read("scripts/write-netlify-redirects.mjs");
const release = JSON.parse(read("public/release-v177.json"));

const families = ["application", "phone", "mobile", "compact", "tablet", "desktop"];
const viewports = [
  "320x568", "360x640", "375x667", "390x844", "412x915", "430x932",
  "600x960", "768x1024", "820x1180", "1024x768", "1280x720",
  "1366x768", "1440x900", "1920x1080",
];

test("v177 loads after v176 as the final screenshot authority", () => {
  const oldIndex = entry.indexOf('import "./studio-mobile-stability-v176.js"');
  const nextIndex = entry.indexOf('import "./studio-screenshot-stability-v177.js"');
  assert.ok(oldIndex >= 0);
  assert.ok(nextIndex > oldIndex);
  assert.match(runtime, /studio-screenshot-stability-v177-20260731/);
  assert.ok(packageJson.scripts["test:production"].includes("run-patch-screenshot-stability-v177.mjs"));
});

test("drawer has one interaction authority and backdrop excludes its clickable area", () => {
  assert.match(platform, /main\.removeAttribute\("inert"\)/);
  assert.doesNotMatch(platform, /main\.toggleAttribute\("inert",\s*mobileOpen\)/);
  assert.match(platform, /drawerInteractionV177/);
  assert.match(runtime, /blocked-only-by-outside-backdrop/);
  assert.match(css, /left:var\(--sm177-drawer-width\)!important/);
  assert.match(css, /width:calc\(100vw - var\(--sm177-drawer-width\)\)!important/);
  assert.match(css, /z-index:3190!important/);
  assert.match(css, /z-index:3200!important/);
  assert.match(css, /\.sn-side\.mobile-open \*/);
  assert.match(css, /pointer-events:auto!important/);
});

test("mobile menu begins below create post and footer remains reachable", () => {
  assert.match(css, /justify-content:flex-start!important/);
  assert.match(css, /overflow-y:auto!important/);
  assert.match(css, /\.sn-account-footer/);
  assert.match(css, /safe-area-inset-bottom/);
  for (const label of ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"]) {
    assert.ok(studio.includes(`>${label}<`), `menu missing ${label}`);
  }
});

test("mobile logo, topbar, avatar, profile and Media cannot inflate outside viewport", () => {
  assert.match(studio, /sn-mobile-menu-mark[\s\S]*<strong>n<\/strong>/);
  assert.match(css, /\.sn-mobile-menu-mark::before/);
  assert.match(css, /content:none!important/);
  assert.match(css, /\.sn-mobile-menu-mark strong[\s\S]*font-size:28px!important/);
  assert.match(css, /\.sn-top>\.sn-workspace[\s\S]*display:none!important/);
  assert.match(css, /\.sn-top>\.sn-cloud[\s\S]*display:none!important/);
  assert.match(css, /\.sn-avatar[\s\S]*width:44px!important[\s\S]*height:44px!important/);
  assert.match(css, /\.sn-profile-menu-v150[\s\S]*width:min\(300px,calc\(100vw - 20px\)\)!important/);
  assert.match(css, /\.sn-media-library[\s\S]*zoom:1!important/);
  assert.match(css, /\.sn-upload-zone h3[\s\S]*font-size:21px!important/);
});

test("Nara opens native small, keeps website clickable, and always exposes close", () => {
  assert.match(nara, /changeSize\("small"\); setOpen\(true\)/);
  assert.match(nara, /aria-modal=\{size === "full"\}/);
  assert.match(nara, /data-nara-interaction-native=\{size === "full" \? "modal" : "nonmodal"\}/);
  assert.match(nara, /hidden=\{size !== "full"\}/);
  assert.match(nara, /className="nara-close-v177"/);
  assert.match(css, /data-nara-interaction-v177="nonmodal"/);
  assert.match(css, /\.nara-floating-button[\s\S]*width:54px!important[\s\S]*height:54px!important/);
  assert.match(css, /\.nara-floating-button>b[\s\S]*display:none!important/);
  assert.match(css, /width:min\(340px,calc\(100vw - 20px\)\)!important/);
  assert.match(css, /height:min\(430px,calc\(100dvh - 104px\)\)!important/);
  assert.match(css, /grid-template-areas:"orb brand voice reset close" "sizes sizes sizes sizes sizes"/);
  assert.match(css, /\[data-nara-close-v177\][\s\S]*visibility:visible!important/);
});

test("all six families and requested viewport simulations remain explicit", () => {
  assert.deepEqual(release.responsiveFamilies, families);
  assert.deepEqual(release.desktopVariants, ["laptop", "computer"]);
  for (const viewport of viewports) assert.ok(release.viewports.includes(viewport), `missing ${viewport}`);
  assert.equal(release.drawerClickable, true);
  assert.equal(release.drawerBackdropOutsideOnly, true);
  assert.equal(release.mobileLogoGlyphVisible, true);
  assert.equal(release.naraNativeSmallFirst, true);
  assert.equal(release.naraSmallMediumNonmodal, true);
  assert.equal(release.naraCloseAlwaysVisible, true);
});

test("PWA cache rotates to v177 without forcing auth pages", () => {
  assert.match(serviceWorker, /ngeblogging-app-v177-screenshot-stability-20260731/);
  assert.match(serviceWorker, /screenshot-stability-cache-v177/);
  assert.match(serviceWorker, /url\.pathname === "\/login"/);
  assert.match(serviceWorker, /url\.pathname === "\/signup"/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/auth\/"\)/);
  assert.match(serviceWorker, /mobile-stability-v176/);
});

test("Cloudflare and Netlify expose the same v177 release probe", () => {
  assert.match(worker, /SCREENSHOT_STABILITY_RELEASE/);
  assert.match(worker, /"\/release-v177\.json"/);
  assert.match(worker, /x-ngeblogging-screenshot-stability/);
  assert.match(publisher, /SCREENSHOT_STABILITY_RELEASE/);
  assert.match(publisher, /\/release-v177\.json/);
  assert.match(publisher, /X-Ngeblogging-Screenshot-Stability/);
});

test("patch is idempotent and preserves prior v176 authority", () => {
  assert.match(patch, /if \(!source\.includes\('data-nara-native-interaction="v177"'\)\)/);
  assert.match(patch, /if \(source\.includes\('const VERSION = "ngeblogging-app-v177-screenshot-stability-20260731";'\)\) return/);
  assert.match(patch, /MOBILE_STABILITY_COMPAT_VERSION/);
  assert.match(patch, /PATCH_DRAWER_INERT_V177_INCOMPLETE/);
});
