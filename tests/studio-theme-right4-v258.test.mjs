import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const chain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-sidebar-right4-v258.mjs");
const widgets = read("src/widget-system.js");
const runtime = read("src/theme-layout-runtime-v170.js");
const layoutCss = read("src/theme-layout-v170.css");
const visual = read("src/studio-visual-native-v257.js");
const visualCss = read("src/studio-visual-native-v257.css");
const catalog = read("src/theme-catalog.js");
const vite = read("vite.config.js");
const rotate = read("scripts/service-worker-v258-rotate.mjs");


test("fourth right Theme area is persisted after historical patch chain", () => {
  assert.ok(chain.indexOf('patch-sidebar-right4-v258.mjs') > chain.indexOf('patch-auth-production-v245.mjs'));
  assert.match(patch, /Do not rewrite historical v170\/v207 grid templates/);
  assert.match(widgets, /id: "sidebar-left-4", label: "Sidebar kiri 4", group: "content"/);
  assert.match(widgets, /id: "sidebar-right-4", label: "Sidebar kanan 4", group: "content"/);
  assert.match(widgets, /sidebar-right-4-v258/);
  assert.match(runtime, /RIGHT_AREAS = \["sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"\]/);
  assert.match(runtime, /Empat area widget kanan postingan/);
  assert.match(layoutCss, /\.tn-layout-slot-v170\.sidebar-right-4\{grid-area:sidebar-right-4\}/);
});


test("current v257 visual authority remains the only six-mode geometry owner", () => {
  assert.match(visual, /studio-visual-native-v257-20260804/);
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop", "laptop", "computer"]) {
    assert.ok(visual.includes(`"${mode}"`), `missing ${mode} visual support`);
  }
  assert.match(visual, /Widget kiri 4/);
  assert.match(visual, /Widget kanan 4/);
  assert.match(visual, /QUICK_WIDGETS/);
  assert.match(visual, /ensureAreaOptions/);
  assert.match(visualCss, /\.v257-layout-blueprint/);
  assert.match(visualCss, /\.nara-floating-button/);
});


test("100 themes and all 26 existing widgets remain preserved", () => {
  const families = [...catalog.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...catalog.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  const widgetIds = [...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.equal(widgetIds, 26);
  assert.match(widgets, /id: "custom-html"/);
});


test("v258 rotates stale PWA cache after v257 without touching login session", () => {
  assert.match(vite, /rotateServiceWorkerV257\(\)[\s\S]*rotateServiceWorkerV258\(\)/);
  assert.match(vite, /ngeblogging-native-studio-v258/);
  assert.match(rotate, /ACTIVE_VERSION_V257/);
  assert.match(rotate, /ngeblogging-app-v258-theme-right4-20260804/);
  assert.match(rotate, /studio-theme-right4-cache-v258/);
  assert.doesNotMatch(rotate, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});
