import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, WIDGET_COUNT, widgetPreviewMarkup } from "../src/widget-system.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v39 replaces the clipped v36 layout authority", async () => {
  const html = await read("index.html");
  assert.match(html, /studio-layout-builder-v36\.css[^>]+media="not all"/);
  assert.match(html, /application\/x-disabled[^>]+studio-layout-builder-v36\.js/);
  assert.ok(html.indexOf("studio-layout-builder-v39.css") > html.indexOf("studio-production-audit-v37.css"));
  assert.ok(html.indexOf("studio-layout-builder-v39.js") > html.indexOf("production-contract-v38.js"));
  assert.ok(html.indexOf("studio-quality-v39.js") > html.indexOf("studio-layout-builder-v39.js"));
});

test("layout v39 exposes the requested complete box map without mobile clipping", async () => {
  const runtime = await read("src/studio-layout-builder-v39.js");
  const css = await read("src/studio-layout-builder-v39.css");
  for (const marker of [
    "Header kiri · kotak 2",
    "Header kanan · kotak 2",
    "Sidebar kiri · kotak 2",
    "Sidebar kanan · kotak 2",
    "Footer kiri · kotak 2",
    "Footer kanan · kotak 2",
    "Kotak footer panjang",
    "footer-wide",
  ]) assert.ok(runtime.includes(marker), marker);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.lb39-content-row[\s\S]*grid-template-columns: minmax\(68px, \.47fr\) minmax\(118px, 1\.55fr\) minmax\(68px, \.47fr\)/);
  assert.doesNotMatch(css, /\.lb39-content-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("widget system contains 25 built-ins plus isolated HTML JavaScript", () => {
  assert.equal(WIDGET_COUNT, 26);
  assert.equal(BUILT_IN_WIDGETS.length, 26);
  assert.ok(BUILT_IN_WIDGETS.some((widget) => widget.id === "custom-html"));
  assert.ok(LAYOUT_AREAS.some((area) => area.id === "footer-wide"));
  const markup = widgetPreviewMarkup("custom-html", "Kode", "footer-wide", { html:"<b>Uji</b>", javascript:"document.body.dataset.ready='true'" });
  assert.match(markup, /sandbox="allow-scripts allow-forms"/);
  assert.doesNotMatch(markup, /allow-same-origin/);
  assert.match(markup, /srcdoc=/);
});

test("v39 keeps settings analytics members domains and site switching responsive", async () => {
  const runtime = await read("src/studio-quality-v39.js");
  const css = await read("src/studio-quality-v39.css");
  assert.match(runtime, /Beralih situs/);
  assert.match(runtime, /Tambah situs/);
  assert.match(runtime, /analytics-rpc/);
  assert.match(runtime, /members-hydration/);
  assert.match(runtime, /customDomainBindings/);
  assert.match(css, /\.sn-settings-grid/);
  assert.match(css, /\.sp37-analytics/);
  assert.match(css, /\.sp37-members-panel/);
  assert.match(css, /\.sp37-domain-panel/);
  assert.doesNotMatch(css, /\.sn-side|\.nara-/);
});

test("PWA cache rotates after the visual repair", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v39-20260726/);
  assert.match(sw, /ngeblogging-app-v37-20260725/);
  assert.match(sw, /request\.mode === "navigate"/);
});
