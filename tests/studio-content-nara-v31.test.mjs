import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const css = read("src/studio-content-nara-v31.css");
const controls = read("src/studio-content-nara-v31-controls.css");
const sidebarBackup = read("backups/studio-sidebar-v30-locked-20260725.md");
const largeBackup = read("backups/studio-large-layout-v30-locked-20260725.md");
const sw = read("public/sw.js");

test("v31 loads after approved v30 shell and keeps old authorities disabled", () => {
  const v30 = index.indexOf("studio-shell-v30.css");
  const v31 = index.indexOf("studio-content-nara-v31.css");
  const controlsIndex = index.indexOf("studio-content-nara-v31-controls.css");
  assert.ok(v30 > -1);
  assert.ok(v31 > v30);
  assert.ok(controlsIndex > v31);
  for (const version of ["v24", "v25", "v28", "v29"]) {
    assert.match(index, new RegExp(`data-disabled-authority="${version}"`));
  }
});

test("v31 does not modify the locked sidebar authority", () => {
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(rules, /\.sn-side\b/);
  assert.doesNotMatch(rules, /\.sn-mobile-v30-/);
  assert.match(sidebarBackup, /8066773230249c2f97a6dfcbf1f792113d830616/);
  assert.match(sidebarBackup, /54aa0c66c297b477cb716ba254fc616b1e438d01/);
  assert.match(sidebarBackup, /Desktop open width remains 220px/);
  assert.match(sidebarBackup, /Desktop collapsed width remains 70px/);
});

test("approved large-screen layout has an immutable recovery manifest", () => {
  assert.match(largeBackup, /7decc55d2bcc80f055c036c4106a3d6a0518aec4/);
  assert.match(largeBackup, /15988dfbc961d99a33239cccfe7a997fc0ca8220/);
  assert.match(largeBackup, /must not change/);
  assert.match(largeBackup, /public landing page/);
});

test("Nara opens as a compact visible-page widget, not a white fullscreen layer", () => {
  assert.match(css, /pointer-events: none !important/);
  assert.match(css, /background: transparent !important/);
  assert.match(css, /\.nara-assistant-backdrop[\s\S]*display: none !important/);
  assert.match(css, /--nara-v31-phone-width: min\(332px/);
  assert.match(css, /--nara-v31-phone-height: min\(500px/);
  assert.match(css, /data-nara-size-v30="mini"[\s\S]*min\(320px/);
  assert.match(css, /grid-template-rows: auto auto minmax\(0, 1fr\) auto auto/);
});

test("Nara internal content remains readable and controls fit one row", () => {
  assert.match(css, /grid-template-columns: 42px minmax\(0, 1fr\) repeat\(4, 32px\)/);
  assert.match(css, /\.nara-message-content[\s\S]*font-size: 13px !important/);
  assert.match(css, /\.nara-assistant-messages[\s\S]*overflow-y: auto !important/);
  assert.match(css, /\.nara-quick-prompts[\s\S]*overflow-x: auto !important/);
  assert.match(controls, /eight composer controls/i);
  assert.match(controls, /repeat\(4, 32px\)[\s\S]*minmax\(46px, \.55fr\)[\s\S]*minmax\(54px, \.65fr\)[\s\S]*minmax\(64px, 1fr\)[\s\S]*34px/);
  assert.match(controls, /repeat\(4, 28px\)[\s\S]*42px[\s\S]*46px[\s\S]*minmax\(50px, 1fr\)[\s\S]*30px/);
});

test("every main Studio menu gets a compact-screen non-overlap layout", () => {
  for (const marker of [
    ".sn-page-title",
    ".sn-welcome",
    ".sn-metrics",
    ".sn-home-grid",
    ".sn-content-card",
    ".sn-doc-row",
    ".sn-info-grid",
    ".sn-settings-grid",
    ".sn-members",
    ".sn-domain-card",
    ".sn-launch",
    ".nw-page",
    ".nw-project-layout",
    ".nw-plugin-grid",
    ".tn-customizer",
    ".tn-code-workspace",
    ".tn-widget-grid",
  ]) assert.ok(css.includes(marker), marker);
  assert.match(css, /grid-template-areas: "title trash" "status time"/);
  assert.match(css, /\.sn-page-title[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.sn-metrics[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
});

test("PWA cache rotates so stale overlapping CSS is removed", () => {
  assert.match(sw, /ngeblogging-app-v31-20260725/);
  assert.match(sw, /ngeblogging-app-v30-20260725/);
  assert.match(sw, /fetch\(request, \{ cache: "no-store" \}\)/);
});
