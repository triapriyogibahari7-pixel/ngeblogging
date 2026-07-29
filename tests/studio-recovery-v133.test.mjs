import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("v133 is the only active Studio recovery authority", () => {
  const html = read("index.html");
  assert.match(html, /locked-react-v133/);
  assert.match(html, /studio-recovery-v133\.js\?v=133/);
  assert.doesNotMatch(html, /studio-geometry-recovery-v126\.css/);
  assert.doesNotMatch(html, /studio-device-authority-v130\.css/);
  assert.doesNotMatch(html, /studio-recovery-v131\.css/);
  assert.doesNotMatch(html, /studio-interaction-recovery-v132\.css/);
  assert.doesNotMatch(html, /nara-panel-controls-v130\.js/);
  assert.doesNotMatch(html, /studio-interaction-recovery-v132\.js/);
});

test("v133 restores full-width routes and a drawer-style true-mobile sidebar", () => {
  const css = read("src/studio-recovery-v133.css");
  assert.match(css, /#ngeblogging-operational-surface-v125/);
  assert.match(css, /\.sv124-shell\.mobile-open \.sv124-side/);
  assert.match(css, /margin-left:0!important/);
  assert.match(css, /\.sv124-mobile-toggle\{display:grid!important/);
  assert.doesNotMatch(css, /--v132-rail/);
  assert.doesNotMatch(css, /width:calc\(100% - var\(--v132-rail\)\)/);
});

test("v133 opens Nara compact and keeps medium/full controls", () => {
  const css = read("src/studio-recovery-v133.css");
  const runtime = read("src/studio-recovery-v133.js");
  assert.match(css, /data-nara-size="compact"/);
  assert.match(css, /data-nara-size="medium"/);
  assert.match(css, /data-nara-size="full"/);
  assert.match(runtime, /applyNaraSize\(shell, "compact"\)/);
  assert.match(runtime, /\["compact", "medium", "full"\]/);
  assert.match(runtime, /Buka sidebar/);
});

test("service worker rotates stale clients to v133", () => {
  const worker = read("public/sw.js");
  assert.match(worker, /ngeblogging-app-v133-20260729/);
  assert.match(worker, /single-studio-recovery-v133-20260729/);
  assert.match(worker, /pwa-v133/);
});
