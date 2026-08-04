import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const widgets = read("src/widget-system.js");
const themes = read("src/theme-system.js");
const layoutCss = read("src/studio-theme-layout-v256.css");
const authority = read("src/studio-native-authority-v250.js");
const legacyTarget = read("src/studio-production-v235-widget-target.js");
const themeCatalog = read("src/theme-catalog.js");

test("v256 loads after the current v255 Studio interaction authority", () => {
  const v255 = entry.indexOf('import "./studio-shell-interaction-v255.css";');
  const v256 = entry.indexOf('import "./studio-theme-layout-v256.css";');
  assert.ok(v255 >= 0);
  assert.ok(v256 > v255);
});

test("four left and four right slots are first-class widget areas", () => {
  for (let index = 1; index <= 4; index += 1) {
    assert.ok(widgets.includes(`"sidebar-left-${index}"`), `missing real left slot ${index}`);
    assert.ok(widgets.includes(`"sidebar-right-${index}"`), `missing real right slot ${index}`);
    assert.ok(legacyTarget.includes(`"sidebar-left-${index}"`), `legacy target missing left slot ${index}`);
    assert.ok(legacyTarget.includes(`"sidebar-right-${index}"`), `legacy target missing right slot ${index}`);
  }
  assert.match(widgets, /SIDEBAR_LEFT_SLOTS = Object\.freeze/);
  assert.match(widgets, /SIDEBAR_RIGHT_SLOTS = Object\.freeze/);
  assert.match(widgets, /migrateLegacyArea/);
  assert.match(widgets, /value === "sidebar" \|\| value === "sidebar-right"/);
  assert.match(widgets, /value === "sidebar-left"/);
});

test("existing widget data is migrated instead of deleted", () => {
  assert.match(widgets, /LEGACY_AREAS = new Set/);
  assert.match(widgets, /value === "footer"/);
  assert.match(widgets, /value === "header"/);
  assert.doesNotMatch(widgets, /filter\([^\n]*area[^\n]*sidebar-left-1[^\n]*\)/);
});

test("theme preview renders left widgets around the actual main content and right widgets", () => {
  assert.match(themes, /function composeMainWidgetLayout/);
  assert.match(themes, /widgetsMarkup\(widgets, "sidebar-left"\)/);
  assert.match(themes, /widgetsMarkup\(widgets, "sidebar-right"\)/);
  assert.match(themes, /widgetsMarkup\(widgets, "before-content"\)/);
  assert.match(themes, /widgetsMarkup\(widgets, "after-content"\)/);
  assert.match(themes, /class="ng-main-layout \$\{sideClass\}"/);
  assert.match(themes, /class="ng-main-content"/);
  assert.match(themes, /class="ng-widget-stack left"/);
  assert.match(themes, /class="ng-widget-stack right"/);
  assert.match(themes, /ng-main-layout\.both/);
  assert.match(themes, /@media\(max-width:980px\)/);
});

test("layout map is a clear denah with Post Page in the center on large and small screens", () => {
  assert.match(layoutCss, /content:"Post \/ Page\\A Konten utama"/);
  for (const area of ["sl1","sl2","sl3","sl4","sr1","sr2","sr3","sr4","center"]) {
    assert.ok(layoutCss.includes(area), `map missing grid area ${area}`);
  }
  assert.match(layoutCss, /sidebar-left-1\{grid-area:sl1/);
  assert.match(layoutCss, /sidebar-left-4\{grid-area:sl4/);
  assert.match(layoutCss, /sidebar-right-1\{grid-area:sr1/);
  assert.match(layoutCss, /sidebar-right-4\{grid-area:sr4/);
  assert.match(layoutCss, /@media\(max-width:760px\)/);
  assert.match(layoutCss, /minmax\(72px,\.8fr\) minmax\(118px,1\.55fr\) minmax\(72px,\.8fr\)/);
});

test("all map buttons remain clickable and Widget Studio receives the expanded area list", () => {
  assert.match(authority, /data-layout-area/);
  assert.match(authority, /LAYOUT_AREAS\.map/);
  assert.match(authority, /studio\.querySelector\("\.tn-layout-studio-header button,\.tn-layout-side>button"\)\?\.click\(\)/);
  assert.match(authority, /select\.innerHTML = LAYOUT_AREAS\.map/);
  assert.match(widgets, /id: "custom-html"/);
});

test("code editor keeps real dynamic line numbers, long code and centered preview", () => {
  assert.match(authority, /split\("\\n"\)\.length/);
  assert.match(authority, /Array\.from\(\{ length: count \}/);
  assert.match(layoutCss, /\.tn-code-preview-pane\) \.tn-frame-shell/);
  assert.match(layoutCss, /\.tn-code-preview-pane\{order:1!important\}/);
  assert.match(layoutCss, /\.tn-code-pane\{order:2!important\}/);
});

test("100-theme and 26-widget architecture remains intact", () => {
  const families = [...themeCatalog.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themeCatalog.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  const widgetIds = [...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.equal(widgetIds, 26);
});