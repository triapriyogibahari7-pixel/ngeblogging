import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const patch = read("scripts/patch-sidebar-right4-v257.mjs");
const left4 = read("scripts/patch-sidebar-left4-v207.mjs");
const finalCss = read("src/studio-theme-layout-v257.css");
const finalRuntime = read("src/studio-theme-layout-v257.js");
const authority = read("src/studio-production-v235.js");
const theme = read("src/ThemeStudio.jsx");
const catalog = read("src/theme-catalog.js");
const widgets = read("src/widget-system.js");
const activator = read("scripts/activate-studio-final-v257.mjs");
const vite = read("vite.config.js");


test("v257 extends the proven v207 left4 Theme engine instead of replacing it", () => {
  assert.match(left4, /sidebar-left-4-v207/);
  assert.match(patch, /await import\("\.\/patch-sidebar-left4-v207\.mjs"\)/);
  assert.match(patch, /sidebar-right-4-v257/);
  assert.match(patch, /id: \"sidebar-right-4\"/);
  assert.match(patch, /RIGHT_AREAS = \[\"sidebar-right-1\", \"sidebar-right-2\", \"sidebar-right-3\", \"sidebar-right-4\"\]/);
});


test("desktop Theme map is four-left plus centered content plus four-right", () => {
  for (let index = 1; index <= 4; index += 1) {
    assert.ok(finalCss.includes(`sidebar-left-${index}`), `missing left slot ${index}`);
    assert.ok(finalCss.includes(`sidebar-right-${index}`), `missing right slot ${index}`);
  }
  assert.match(finalCss, /"sidebar-left-1 content-main content-main content-main content-main sidebar-right-1"/);
  assert.match(finalCss, /"sidebar-left-4 content-main content-main content-main content-main sidebar-right-4"/);
  assert.match(finalCss, /\.tn-layout-slot-v170\.content-main/);
  assert.match(finalCss, /margin-inline: auto !important/);
});


test("small-device Theme map remains a readable three-column map", () => {
  assert.match(finalCss, /@media \(max-width: 760px\)/);
  assert.match(finalCss, /grid-template-columns: minmax\(68px, \.82fr\) minmax\(116px, 1\.5fr\) minmax\(68px, \.82fr\)/);
  assert.match(finalCss, /"sidebar-left-1 content-main sidebar-right-1"/);
  assert.match(finalCss, /"sidebar-left-4 content-main sidebar-right-4"/);
  assert.match(finalCss, /writing-mode: horizontal-tb !important/);
  assert.match(finalRuntime, /layoutRight4V257/);
});


test("slot click stays local and opens the existing Widget Studio rather than a fullscreen replacement", () => {
  assert.match(authority, /const LAYOUT_POPOVER = "v235-layout-popover"/);
  assert.match(authority, /showLayoutPopover/);
  assert.match(authority, /Buka semua 26 widget/);
  assert.match(authority, /HTML \/ JavaScript/);
  assert.match(finalCss, /\.v235-layout-popover[\s\S]*width: min\(320px, calc\(100vw - 20px\)\)/);
  assert.match(finalCss, /max-height: min\(430px, calc\(100dvh - 20px\)\)/);
  assert.match(theme, /LAYOUT_AREAS/);
  assert.match(theme, /WIDGET TERPILIH/);
});


test("Theme code editor keeps real dynamic line numbers and responsive preview", () => {
  assert.match(authority, /String\(value \|\| ""\)\.split\("\\n"\)\.length/);
  assert.match(authority, /Array\.from\(\{ length: count \}, \(_, index\) => String\(index \+ 1\)\)\.join\("\\n"\)/);
  assert.match(finalCss, /html\[data-studio-device-mode="large"\] \.tn-code-workspace/);
  assert.match(finalCss, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(finalCss, /\.tn-code-preview-pane \{[\s\S]*order: 1 !important/);
  assert.match(finalCss, /\.tn-code-pane \{[\s\S]*order: 2 !important/);
});


test("100-theme architecture and 26 existing widgets remain intact", () => {
  const families = [...catalog.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...catalog.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  const widgetIds = [...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.equal(widgetIds, 26);
  assert.match(widgets, /id: "custom-html"/);
});


test("build order preserves v256 auth/cache and then applies Theme v257", () => {
  assert.match(activator, /await import\("\.\/patch-sidebar-right4-v257\.mjs"\)/);
  assert.match(activator, /studio-shell-interaction-v255\.js/);
  assert.match(activator, /studio-theme-layout-v257\.css/);
  assert.match(activator, /V257_FINAL_STUDIO_AUTHORITY_ORDER_INVALID/);
  assert.match(vite, /activateStudioNativeV250\(\)[\s\S]*finalizeStudioV255Order\(\)[\s\S]*activateStudioFinalV257\(\)/);
  assert.match(vite, /rotateServiceWorkerV256\(\)/);
  assert.match(vite, /ngeblogging-native-studio-v257/);
});
