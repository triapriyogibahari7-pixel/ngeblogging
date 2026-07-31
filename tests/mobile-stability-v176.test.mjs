import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const runtime = read("src/mobile-stability-v176.js");
const css = read("src/mobile-stability-v176.css");
const patch = read("scripts/run-patch-mobile-stability-v176.mjs");
const device = read("src/studio-device-mode-v140.js");
const serviceWorker = read("public/sw.js");
const pkg = JSON.parse(read("package.json"));
const release = JSON.parse(read("public/release-v176.json"));

const modes = ["application", "phone", "mobile", "compact", "tablet", "desktop"];
const viewports = [
  "320x568","360x640","375x667","390x844","412x915","430x932",
  "600x960","768x1024","820x1180","1024x768","1280x720","1366x768","1440x900","1920x1080",
];

test("drawer v176 uses React mobile-open as truth and never leaves the open drawer inert", () => {
  assert.match(runtime, /sidebar\.classList\.contains\("mobile-open"\)/);
  assert.match(runtime, /if \(open\) sidebar\.removeAttribute\("inert"\)/);
  assert.match(runtime, /main\.removeAttribute\("inert"\)/);
  assert.match(runtime, /sn-mobile-sidebar-open-v176/);
  assert.doesNotMatch(runtime, /const open = mobile &&/);
});

test("backdrop starts after the drawer and cannot blur or block its menu", () => {
  assert.match(css, /--v176-drawer-z:2147483300/);
  assert.match(css, /--v176-backdrop-z:2147483200/);
  assert.match(css, /left:var\(--v176-drawer-width\)!important/);
  assert.match(css, /backdrop-filter:none!important/);
  assert.match(css, /\.sn-side\.mobile-open \*/);
  assert.match(css, /pointer-events:auto!important/);
});

test("mobile menu starts below Buat Post and keeps footer at the bottom", () => {
  assert.match(css, /grid-template-rows:auto auto minmax\(0,1fr\) auto/);
  assert.match(css, /\.sn-side>nav\{[\s\S]*justify-content:flex-start!important/);
  assert.match(css, /\.sn-side>\.sn-new\{[\s\S]*margin:5px 10px 6px/);
  assert.match(css, /\.sn-side>\.sn-account-footer\{[\s\S]*border-top/);
});

test("logo, profile, media and Nara are bounded against Android text inflation", () => {
  assert.match(css, /-webkit-text-size-adjust:100%!important/);
  assert.match(css, /\.sn-sidebar-toggle::before\{[\s\S]*place-items:center!important/);
  assert.match(css, /\.sn-avatar\{[\s\S]*width:38px!important[\s\S]*height:38px!important/);
  assert.match(css, /\.sn-media-library>\.sn-page-title\{[\s\S]*position:static!important/);
  assert.match(css, /\.sn-upload-zone h3\{[\s\S]*font-size:21px!important/);
  assert.match(css, /\.nara-floating-button\{[\s\S]*width:54px!important[\s\S]*height:54px!important/);
  assert.match(css, /\.nara-floating-button :is\(b,small\)\{display:none!important/);
});

test("Nara small and medium are nonmodal and cannot flicker between sizes", () => {
  assert.match(runtime, /VALID_NARA_SIZES/);
  assert.match(runtime, /layer\.dataset\.naraLayerSize = size/);
  assert.match(runtime, /backdrop\.hidden = !full/);
  assert.match(css, /\.nara-assistant-layer:not\(\[data-nara-layer-size="full"\]\)/);
  assert.match(css, /transition:none!important/);
  assert.match(css, /animation:none!important/);
  assert.match(css, /data-nara-size="small"/);
  assert.match(css, /data-nara-size="medium"/);
  assert.match(css, /data-nara-layer-size="full"/);
});

test("six mode detector follows stable layout width rather than visualViewport", () => {
  for (const mode of modes) assert.ok(css.includes(`data-studio-responsive-mode="${mode}"`), `missing ${mode}`);
  assert.match(patch, /effectiveWidth: layoutWidth/);
  assert.match(patch, /studio-layout-stability-v176-20260731/);
  // The source is patched before tests/build; this assertion proves that happened.
  assert.match(device, /effectiveWidth: layoutWidth/);
  assert.match(device, /studioLayoutStabilityV176/);
});

test("all requested viewport simulations remain declared", () => {
  for (const viewport of viewports) assert.ok(release.viewports.includes(viewport), `missing ${viewport}`);
  assert.deepEqual(release.responsiveFamilies, modes);
  assert.deepEqual(release.desktopVariants, ["laptop", "computer"]);
});

test("pipeline loads v176 after v174 and rotates PWA without touching auth surfaces", () => {
  for (const script of [pkg.scripts.predev, pkg.scripts.test, pkg.scripts["test:production"]]) {
    assert.ok(script.indexOf("run-patch-mobile-interaction-v174.mjs") < script.indexOf("run-patch-mobile-stability-v176.mjs"));
  }
  assert.match(serviceWorker, /ngeblogging-app-v176-mobile-stability-20260731/);
  assert.match(serviceWorker, /mobile-stability-cache-v176/);
  assert.match(serviceWorker, /url\.pathname === "\/login"/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/auth\/"\)/);
});

test("release probe describes screenshot fixes without fake capacity claims", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, "mobile-stability-v176-20260731");
  for (const key of [
    "drawerClickable", "backdropExcludesDrawer", "menuStartsBelowCreatePost",
    "mobileLogoCentered", "profileBounded", "mediaScaleBounded",
    "naraLauncherStable", "naraSmallMediumNonmodal", "layoutWidthStable",
  ]) assert.equal(release[key], true, `${key} must be true`);
  assert.equal(release.capacityClaim, "not-claimed");
});
