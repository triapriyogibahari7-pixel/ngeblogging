import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studio = read("src/Studio.jsx");
const runtime = read("src/studio-theme-layout-v264.js");
const css = read("src/studio-theme-layout-v264.css");
const widgets = read("src/widget-system.js");
const themeSystem = read("src/theme-system.js");

test("v264 Theme Studio layout authority loads after v263", () => {
  const v263 = studio.indexOf('import "./studio-shell-v263-hotfix.css";');
  const runtime264 = studio.indexOf('import "./studio-theme-layout-v264.js";');
  const css264 = studio.indexOf('import "./studio-theme-layout-v264.css";');
  assert.ok(v263 >= 0);
  assert.ok(runtime264 > v263);
  assert.ok(css264 > runtime264);
});

test("widget system exposes exactly the detailed 26-slot layout contract", () => {
  const layoutBlock = widgets.match(/export const LAYOUT_AREAS = \[([\s\S]*?)\n\];/);
  assert.ok(layoutBlock, "LAYOUT_AREAS missing");
  const ids = [...layoutBlock[1].matchAll(/\{ id: "([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, 26);
  for (const id of [
    "header-primary-left", "header-primary-right", "before-content",
    "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
    "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4",
    "after-content", "footer-copyright-left", "footer-copyright-right",
  ]) assert.ok(ids.includes(id), `missing layout area ${id}`);
  assert.match(widgets, /id: "custom-html"/);
  assert.match(widgets, /VALID_AREAS/);
  assert.match(themeSystem, /normalizeWidgetState/);
});

test("v264 denah keeps four left widgets, centered Post Page, and four right widgets", () => {
  for (const id of [
    "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
    "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4",
  ]) assert.ok(runtime.includes(`[\"${id}\"`) || runtime.includes(`"${id}"`), `runtime missing ${id}`);
  assert.match(runtime, /tn-layout-post-v264/);
  assert.match(runtime, /POST \/ PAGE/);
  assert.match(css, /\.tn-layout-content-v264[\s\S]*grid-template-columns:minmax\(100px,.72fr\) minmax\(220px,2fr\) minmax\(100px,.72fr\)/);
  assert.match(css, /\.tn-layout-post-v264[\s\S]*place-items:center!important/);
});

test("clicking a layout slot can assign a real widget to its exact area", () => {
  assert.match(runtime, /pendingAssignment = \{ widgetId: action\.dataset\.widget, area \}/);
  assert.match(runtime, /setReactSelect\(select, area\)/);
  assert.match(runtime, /select\.dispatchEvent\(new Event\("change", \{ bubbles: true \}\)\)/);
  assert.match(runtime, /addAreaOptions/);
  assert.match(runtime, /data-layout-area-v264/);
  assert.match(runtime, /Semua 26 widget/);
  assert.match(runtime, /HTML \/ JavaScript/);
  assert.match(runtime, /Edit HTML \/ CSS \/ JavaScript/);
});

test("detailed denah remains readable on small screens without changing content order", () => {
  assert.match(css, /@media \(max-width:600px\)/);
  assert.match(css, /\.tn-layout-content-v264\{grid-template-columns:minmax\(66px,.7fr\) minmax\(120px,1.7fr\) minmax\(66px,.7fr\)!important/);
  assert.match(css, /\.tn-layout-popover-v264\{width:min\(320px,calc\(100vw - 16px\)\)!important/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});
