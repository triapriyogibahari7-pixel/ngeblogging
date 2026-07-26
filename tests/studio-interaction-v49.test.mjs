import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const interaction = read("src/studio-interaction-v49.js");
const flow = read("src/studio-flow-v49.css");
const worker = read("public/sw.js");

test("Nara starts closed and only a trusted user action may open the floating assistant", () => {
  const mainIndex = index.indexOf('/src/main.jsx');
  const authorityIndex = index.indexOf('/src/studio-interaction-v49.js');
  const shellIndex = index.indexOf('/src/studio-shell-v30.js');
  assert.ok(mainIndex >= 0 && authorityIndex > mainIndex && shellIndex > authorityIndex);
  assert.match(interaction, /event\.isTrusted/);
  assert.match(interaction, /event\.stopImmediatePropagation\(\)/);
  assert.match(interaction, /launcher\.dataset\.autoOpenedV30 = "true"/);
  assert.match(interaction, /closeUnexpectedNara/);
  assert.match(interaction, /naraManualOpenV49/);
});

test("legacy domain bridge is disabled and removed so only the production domain surface renders", () => {
  assert.match(index, /application\/x-disabled" src="\/src\/domain-management-bridge\.js"/);
  assert.match(index, /domain-management-bridge\.css" rel="stylesheet" media="not all"/);
  assert.match(interaction, /\.dm-root, \.dm-panel/);
  assert.match(flow, /\.dm-root/);
  assert.match(flow, /display: none !important/);
});

test("analytics and domain headers are reset from the global landing header rule", () => {
  assert.match(flow, /\.op41-card > header/);
  assert.match(flow, /\.op41-domain > header/);
  assert.match(flow, /position: static !important/);
  assert.match(flow, /grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 330px\), 1fr\)\)/);
  assert.match(flow, /container-type: inline-size/);
  assert.match(flow, /@container \(max-width: 720px\)/);
});

test("v49 is the final stylesheet and PWA cache generation", () => {
  assert.ok(index.indexOf('/src/studio-flow-v49.css') > index.indexOf('/src/studio-reflow-v48.css'));
  assert.match(worker, /ngeblogging-app-v49-20260726/);
  assert.match(worker, /ngeblogging-app-v48-20260726/);
});
