import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const fastGate = read("src/StudioFastGate.jsx");
const runtime = read("src/studio-production-v210.js");
const css = read("src/studio-production-v210.css");
const themeStudio = read("src/ThemeStudio.jsx");
const widgetSystem = read("src/widget-system.js");
const patch = read("scripts/patch-theme-layout-v210.mjs");
const release = JSON.parse(read("public/release-v210.json"));

const RELEASE = "studio-production-v210-20260802";

test("v210 is the final Studio authority after v209", () => {
  assert.match(entry, /studio-production-v209\.js/);
  assert.match(entry, /studio-production-v210\.js/);
  assert.ok(entry.indexOf("studio-production-v209.js") < entry.indexOf("studio-production-v210.js"));
  assert.match(runtime, new RegExp(RELEASE));
});

test("existing authenticated accounts resume from current active-site snapshots", () => {
  assert.match(fastGate, /studio-fast-entry-v210-20260802/);
  for (const marker of ["snapshot-v195", "snapshot-v192", "snapshot-v191", "snapshot-v190"]) {
    assert.ok(fastGate.includes(marker), `fast gate missing ${marker}`);
  }
  assert.match(fastGate, /ACTIVE_SITE_STORAGE_KEY/);
  assert.doesNotMatch(fastGate, /signOut\s*\(|localStorage\.clear\s*\(/);
});

test("Nara small and medium are non-modal and attachment choices are visible", () => {
  assert.match(runtime, /aria-modal/);
  assert.match(runtime, /backdrop\.hidden = !full/);
  assert.match(runtime, /camera-photo-file/);
  assert.match(css, /data-v210-mode="nonmodal"/);
  assert.match(css, /nara-assistant-shell\[data-v210-size="small"\][\s\S]*62dvh/);
  assert.match(css, /nara-assistant-shell\[data-v210-size="medium"\][\s\S]*78dvh/);
  assert.match(css, /nara-attachment-menu\[data-v210-attachment="camera-photo-file"\][\s\S]*position:absolute/);
  for (const label of ["Kamera", "Foto", "File teks"]) assert.ok(read("src/NaraAssistant.jsx").includes(label));
});

test("Theme build owns four sidebar slots on both sides and remembers clicked area", () => {
  for (const area of ["sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4", "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"]) {
    assert.ok(widgetSystem.includes(area), `widget system missing ${area}`);
  }
  assert.match(widgetSystem, /WIDGET_LAYOUT_V210/);
  assert.match(themeStudio, /widgetAreaV210/);
  assert.match(themeStudio, /initialArea=\{widgetAreaV210\}/);
  assert.match(themeStudio, /onOpenWidgets\(area\.id\)/);
  assert.match(css, /\.sidebar-left-4/);
  assert.match(css, /\.sidebar-right-4/);
  assert.match(patch, /theme-layout-v210-20260802/);
});

test("custom HTML and JavaScript widget remains sandboxed but editable", () => {
  assert.equal(WIDGET_COUNT, 26);
  assert.ok(BUILT_IN_WIDGETS.some((widget) => widget.id === "custom-html"));
  assert.match(themeStudio, /tn-widget-code-v210/);
  assert.match(themeStudio, /active\.settings\?\.html/);
  assert.match(themeStudio, /active\.settings\?\.javascript/);
  assert.match(widgetSystem, /iframe class="ng-widget-custom-frame"/);
  assert.match(widgetSystem, /sandbox="allow-scripts allow-forms"/);
});

test("all one hundred theme definitions stay available and materially distinct", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => `${theme.layout}|${theme.font}|${theme.colors?.primary}|${theme.colors?.accent}|${theme.code?.html?.slice(0,160)}|${theme.code?.css?.slice(0,160)}`)).size, 100);
});

test("advanced code editor is visible and split 50:50 on desktop while stacked on mobile", () => {
  assert.match(runtime, /split-50-50/);
  assert.match(runtime, /stacked/);
  assert.match(css, /tn-modal-layer>[\s\S]*tn-modal/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css, /ui-monospace/);
});

test("Domain long URLs and publication action cannot collapse into vertical letters", () => {
  assert.match(runtime, /jadikan draf\|terbitkan/);
  assert.match(css, /data-v210-domain-action="horizontal"/);
  assert.match(css, /white-space:nowrap/);
  assert.match(css, /sv124-free-domain>div h2[\s\S]*overflow-wrap:anywhere/);
});

test("v210 release is factual and does not claim unsupported mass capacity", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.preserved.themeCount, 100);
  assert.equal(release.preserved.widgetCount, 26);
  assert.equal(release.validation.massCapacityClaimed, false);
  assert.equal(release.repairs.themeLayoutFourLeftFourRight, true);
  assert.equal(release.repairs.customHtmlJavascriptWidgetEditable, true);
});
