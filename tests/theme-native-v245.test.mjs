import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const themeStudio = read("src/ThemeStudio.jsx");
const css = read("src/theme-native-v245.css");
const widgetSystem = read("src/widget-system.js");
const themeCatalog = read("src/theme-catalog.js");

const nativeSlots = [
  "header-wide",
  "left-1", "left-2", "left-3", "left-4",
  "content-main",
  "right-1", "right-2", "right-3", "right-4",
  "footer-wide",
];

test("v245 layout map is native React with four left, centered content and four right slots", () => {
  assert.match(themeStudio, /data-theme-interface="v245-native"/);
  assert.match(themeStudio, /const LAYOUT_SLOTS = \[/);
  for (const slot of nativeSlots) assert.ok(themeStudio.includes(`id: "${slot}"`), `missing native layout slot ${slot}`);
  assert.match(themeStudio, /className="tn-native-layout-map"/);
  assert.match(themeStudio, /className="tn-native-post-preview"/);
  assert.match(themeStudio, /settings:\s*\{[\s\S]*layoutSlot:\s*selectedSlot\.id/);
  assert.match(themeStudio, /onChange\(next\)/);
});

test("all 26 real widgets are selectable in each native layout target including custom HTML JavaScript", () => {
  assert.match(themeStudio, /BUILT_IN_WIDGETS\.map/);
  assert.match(themeStudio, /Pilih widget untuk/);
  assert.match(widgetSystem, /id: "custom-html", name: "HTML \/ JavaScript"/);
  const widgetIds = [...widgetSystem.matchAll(/\{ id: "[^"]+", name:/g)].length;
  assert.equal(widgetIds, 26);
  assert.match(themeStudio, /<option value="sidebar-left">Sidebar kiri<\/option>/);
  assert.match(themeStudio, /<option value="sidebar-right">Sidebar kanan<\/option>/);
  assert.match(themeStudio, /<option value="footer-wide">Footer panjang<\/option>/);
});

test("native code editor has real generated line numbers with a 10000-line gutter cap", () => {
  assert.match(themeStudio, /function CodeSurface/);
  assert.match(themeStudio, /Math\.min\(10_000, actualLines\)/);
  assert.match(themeStudio, /Array\.from\(\{ length: numberedLines \}/);
  assert.match(themeStudio, /data-max-lines="10000"/);
  assert.match(themeStudio, /onScroll=\{syncScroll\}/);
  assert.match(themeStudio, /wrap="off"/);
  assert.match(themeStudio, /HTML[\s\S]*CSS[\s\S]*JavaScript/);
});

test("desktop code and live preview are 50:50 while tablet/mobile stack preview above code", () => {
  assert.match(css, /\.tn-native-code-workspace-v245[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css, /grid-template-areas:"code preview"!important/);
  assert.match(css, /@media\(max-width:1024px\)[\s\S]*grid-template-areas:"preview" "code"!important/);
  assert.match(css, /\.tn-native-code-surface[\s\S]*grid-template-columns:58px minmax\(0,1fr\)!important/);
  assert.match(css, /\.tn-native-line-gutter[\s\S]*font:500 12px\/1\.65/);
});

test("mobile layout map remains a readable denah through internal scrolling instead of tiny compressed boxes", () => {
  assert.match(css, /\.tn-native-layout-scroll[\s\S]*overflow-x:auto!important/);
  assert.match(css, /\.tn-native-layout-map[\s\S]*min-width:700px!important/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*\.tn-native-layout-map\{min-width:580px!important/);
  assert.match(css, /@media\(max-width:430px\)[\s\S]*\.tn-native-layout-map\{min-width:560px!important/);
  assert.match(css, /grid-template-areas:[\s\S]*"header header header"[\s\S]*"left content right"[\s\S]*"footer footer footer"/);
});

test("widget picker is a compact non-fullscreen popover without blur takeover", () => {
  assert.match(css, /\.tn-native-layout-popover[\s\S]*width:min\(420px,calc\(100vw - 22px\)\)!important/);
  assert.match(css, /max-height:min\(68dvh,660px\)!important/);
  assert.match(css, /backdrop-filter:none!important/);
  assert.doesNotMatch(css, /\.tn-native-layout-popover[\s\S]{0,350}width:100vw!important/);
});

test("100-theme architecture remains intact while Theme Studio renders every filtered real theme", () => {
  const families = [...themeCatalog.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themeCatalog.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.equal(families * compositions, 100);
  assert.match(themeStudio, /BUILT_IN_THEMES\.filter/);
  assert.match(themeStudio, /filteredThemes\.map/);
  assert.match(themeStudio, /THEME_COUNT/);
});
