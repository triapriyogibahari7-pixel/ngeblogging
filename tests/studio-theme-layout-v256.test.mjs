import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const chain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-sidebar-right4-v256.mjs");
const widgets = read("src/widget-system.js");
const runtime = read("src/theme-layout-runtime-v170.js");
const layoutCss = read("src/theme-layout-v170.css");
const finalCss = read("src/studio-theme-layout-v256.css");
const authority = read("src/studio-native-authority-v250.js");
const theme = read("src/ThemeStudio.jsx");
const catalog = read("src/theme-catalog.js");
const activator = read("scripts/activate-studio-final-v256.mjs");
const vite = read("vite.config.js");

test("v256 extends the proven v207 left4 model instead of replacing Theme core", () => {
  assert.match(chain, /patch-sidebar-left4-v207\.mjs[\s\S]*patch-sidebar-right4-v256\.mjs/);
  assert.match(patch, /await import\("\.\/patch-sidebar-left4-v207\.mjs"\)/);
  assert.match(patch, /studio-theme-layout-right4-v256-20260804/);
  assert.match(widgets, /sidebar-left-4-v207/);
  assert.match(widgets, /sidebar-right-4-v256/);
});

test("four left and four right slots are real persisted widget areas", () => {
  for (let index = 1; index <= 4; index += 1) {
    assert.ok(widgets.includes(`id: "sidebar-left-${index}"`), `missing left widget slot ${index}`);
    assert.ok(widgets.includes(`id: "sidebar-right-${index}"`), `missing right widget slot ${index}`);
  }
  assert.match(runtime, /LEFT_AREAS = \["sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4"\]/);
  assert.match(runtime, /RIGHT_AREAS = \["sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"\]/);
  assert.match(runtime, /Empat area widget kiri postingan/);
  assert.match(runtime, /Empat area widget kanan postingan/);
  assert.match(runtime, /ng-main-content-v170/);
});

test("desktop denah pairs all four left slots with Post Page center and four right slots", () => {
  assert.match(layoutCss, /\.tn-layout-slot-v170\.sidebar-left-4\{grid-area:sidebar-left-4\}/);
  assert.match(layoutCss, /\.tn-layout-slot-v170\.sidebar-right-4\{grid-area:sidebar-right-4\}/);
  assert.match(layoutCss, /"sidebar-left-4 content-main content-main content-main content-main sidebar-right-4"/);
  assert.match(finalCss, /"sidebar-left-1 content-main content-main content-main content-main sidebar-right-1"/);
  assert.match(finalCss, /"sidebar-left-4 content-main content-main content-main content-main sidebar-right-4"/);
  assert.match(finalCss, /\.tn-layout-slot-v170\.content-main/);
});

test("small-device denah stays clear instead of collapsing into a tiny desktop map", () => {
  assert.match(finalCss, /@media\(max-width:760px\)/);
  assert.match(finalCss, /grid-template-columns:minmax\(72px,\.8fr\) minmax\(118px,1\.55fr\) minmax\(72px,\.8fr\)/);
  assert.match(finalCss, /"sidebar-left-1 content-main sidebar-right-1"/);
  assert.match(finalCss, /"sidebar-left-4 content-main sidebar-right-4"/);
  assert.match(finalCss, /@media\(max-width:390px\)/);
  assert.match(finalCss, /writing-mode:horizontal-tb/);
});

test("all layout slots remain clickable through the existing real Widget Studio", () => {
  assert.match(theme, /LAYOUT_AREAS/);
  assert.match(theme, /WIDGET TERPILIH/);
  assert.match(authority, /LAYOUT_AREAS\.map/);
  assert.match(authority, /data-layout-area/);
  assert.match(authority, /select\.innerHTML = LAYOUT_AREAS\.map/);
  assert.match(widgets, /id: "custom-html"/);
});

test("code editor uses real dynamic line numbers and centered responsive preview", () => {
  assert.match(authority, /String\(textarea\.value \|\| ""\)\.split\("\\n"\)\.length/);
  assert.match(authority, /Array\.from\(\{ length: count \}, \(_, index\) => index \+ 1\)\.join\("\\n"\)/);
  assert.match(finalCss, /\.tn-code-preview-pane\{order:1!important/);
  assert.match(finalCss, /\.tn-code-pane\{order:2!important/);
  assert.match(finalCss, /\.tn-frame-shell\{[\s\S]*margin-left:auto!important[\s\S]*margin-right:auto!important/);
});

test("100-theme architecture and all 26 widgets remain preserved", () => {
  const families = [...catalog.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...catalog.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  const widgetIds = [...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.equal(widgetIds, 26);
});

test("bundle activation keeps v255 interaction after v253 and v256 layout last", () => {
  for (const marker of [
    "studio-shell-interaction-v255.js",
    "studio-shell-interaction-v255.css",
    "studio-theme-layout-v256.css",
    "V256_FINAL_STUDIO_AUTHORITY_ORDER_INVALID",
  ]) assert.ok(activator.includes(marker), `missing final activation marker ${marker}`);
  assert.match(vite, /activateStudioNativeV250\(\)[\s\S]*activateStudioFinalV256\(\)/);
  assert.match(vite, /ngeblogging-native-studio-v256/);
});