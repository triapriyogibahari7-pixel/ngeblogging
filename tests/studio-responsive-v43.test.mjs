import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v43 repair authority loads after layout, domain, and quality runtimes", async () => {
  const html = await read("index.html");
  const runtime = await read("src/studio-responsive-repair-v43.js");
  const css = await read("src/studio-responsive-repair-v43.css");

  assert.ok(html.indexOf("studio-responsive-repair-v43.css") > html.indexOf("studio-layout-device-v40.css"));
  assert.ok(html.indexOf("studio-responsive-repair-v43.js") > html.indexOf("studio-domain-v41.js"));
  assert.match(runtime, /studio-responsive-repair-v43-20260726/);
  assert.doesNotMatch(css, /\.nara-|\.sn-side/);
});

test("layout builder has distinct fitted desktop, tablet, and mobile geometry", async () => {
  const css = await read("src/studio-responsive-repair-v43.css");

  assert.match(css, /data-lb40-preview="desktop"[\s\S]*grid-template-areas: "left post right"/);
  assert.match(css, /data-lb40-preview="tablet"[\s\S]*grid-template-areas: "post post" "left right"/);
  assert.match(css, /data-lb40-preview="mobile"[\s\S]*grid-template-areas: "post" "left" "right"/);
  assert.match(css, /\.lb39-canvas-host[\s\S]*overflow: hidden !important/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.sn-site-manager[\s\S]*width: 100vw !important/);
});

test("site manager, settings, analytics, members, and domains wrap without overlap", async () => {
  const css = await read("src/studio-responsive-repair-v43.css");
  const runtime = await read("src/studio-responsive-repair-v43.js");

  assert.match(css, /\.sn-site-manager[\s\S]*calc\(100vw - 24px\)/);
  assert.match(css, /\.sn-settings-grid[\s\S]*repeat\(auto-fit/);
  assert.match(css, /\.sp37-metrics[\s\S]*repeat\(auto-fit/);
  assert.match(css, /\.sp37-domain-item[\s\S]*overflow-wrap: anywhere/);
  assert.match(runtime, /Kelola & ganti situs/);
  assert.match(runtime, /Collector aktif, belum ada kunjungan yang tercatat/);
  assert.match(runtime, /state\.customDomains !== true/);
});

test("PWA cache rotates so installed apps receive v43 immediately", async () => {
  const sw = await read("public/sw.js");

  assert.match(sw, /ngeblogging-app-v43-20260726/);
  assert.match(sw, /ngeblogging-app-v40-20260726/);
  assert.match(sw, /networkFirst/);
});
