import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v48 authority loads after operations and does not target Nara", async () => {
  const html = await read("index.html");
  const css = await read("src/studio-reflow-v48.css");
  const runtime = await read("src/studio-reflow-v48.js");

  assert.ok(html.indexOf("studio-reflow-v48.css") > html.indexOf("studio-operations-v41.css"));
  assert.ok(html.indexOf("studio-reflow-v48.js") > html.indexOf("studio-operations-v41.js"));
  assert.match(runtime, /studio-reflow-v48-20260726/);
  assert.doesNotMatch(css, /\.nara-|nara-floating|nara-assistant/i);
});

test("site manager and operational pages reflow instead of clipping", async () => {
  const css = await read("src/studio-reflow-v48.css");
  for (const marker of [
    ".sn-modal-layer",
    "position: fixed !important",
    ".sn-create-site > div",
    "repeat(3, minmax(0, 1fr))",
    ".op41-metrics",
    ".op41-chart-grid",
    ".op41-member-grid",
    ".op41-readiness",
    ".sn-upload-zone",
    "overflow-x: auto !important",
  ]) assert.ok(css.includes(marker), marker);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
});

test("Theme Studio mobile preview has no malformed oval or transformed surface", async () => {
  const css = await read("src/studio-reflow-v48.css");
  assert.match(css, /\.tn-active-stage::before[\s\S]*content: none !important/);
  assert.match(css, /\.tn-frame-shell iframe[\s\S]*transform: none !important/);
  assert.match(css, /\.tn-frame-shell\.mobile iframe[\s\S]*width: min\(390px, 100%\) !important/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.tn-theme-grid[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
});

test("sidebar Tata Letak route is removed whenever legacy scripts inject it", async () => {
  const runtime = await read("src/studio-reflow-v48.js");
  assert.match(runtime, /label === "tata letak"/);
  assert.match(runtime, /data-layout-route-v29/);
  assert.match(runtime, /MutationObserver/);
});

test("PWA cache rotates to v48 and retains the deployed v43 marker", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v48-20260726/);
  assert.match(sw, /ngeblogging-app-v43-20260726/);
  assert.match(sw, /networkFirst/);
});
