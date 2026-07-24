import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v15 mobile authority loads after v14 and after the React entry", async () => {
  const index = await read("index.html");
  const v14 = index.indexOf("studio-v14-authority.css");
  const v15 = index.indexOf("studio-mobile-v15.css");
  const nara = index.indexOf("nara-interaction-authority.css");
  const react = index.indexOf("/src/main.jsx");
  const bridge = index.indexOf("studio-sidebar-v15.js");
  assert.ok(v14 > -1);
  assert.ok(v15 > v14);
  assert.ok(nara > v15);
  assert.ok(react > -1);
  assert.ok(bridge > react);
});

test("one visible edge controller owns sidebar open close on physical phones", async () => {
  const bridge = await read("src/studio-sidebar-v15.js");
  const css = await read("src/studio-mobile-v15.css");
  assert.match(bridge, /sn-sidebar-edge-v15/);
  assert.match(bridge, /original\.dataset\.v15OriginalToggle = "true"/);
  assert.match(bridge, /dataset\.sidebarAuthority = "single-v15"/);
  assert.match(bridge, /v15InitialSidebarResolved/);
  assert.match(bridge, /original\.click\(\)/);
  assert.match(css, /\[data-v15-original-toggle="true"\][\s\S]*display: none !important/);
  assert.match(css, /\.sn-sidebar-edge-v15[\s\S]*left: calc\(var\(--sn-phone-rail\) - 20px\)/);
  assert.match(css, /data-v15-sidebar-open="true"[\s\S]*left: calc\(var\(--sn-phone-panel\) - 20px\)/);
});

test("collapsed sidebar keeps icons and removes duplicate navigation surfaces", async () => {
  const bridge = await read("src/studio-sidebar-v15.js");
  const css = await read("src/studio-mobile-v15.css");
  assert.match(css, /\.sn-side\.collapsed > nav > button[\s\S]*width: 44px !important/);
  assert.match(css, /\.sn-side\.collapsed > nav > button span[\s\S]*display: none !important/);
  assert.match(bridge, /\.sn-mobile-nav, \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.match(bridge, /textLabel\(button\) !== "Nara AI"/);
  assert.match(bridge, /button\.dataset\.naraWorkspaceRoute = "true"/);
});

test("preview and Nara controls are centered touch targets above the sidebar scrim", async () => {
  const bridge = await read("src/studio-sidebar-v15.js");
  const css = await read("src/studio-mobile-v15.css");
  assert.match(css, /\.sn-view-site,[\s\S]*\.sn-top-actions \.sn-nara-button,[\s\S]*width: 42px !important/);
  assert.match(css, /\.sn-view-site svg,[\s\S]*\.sn-top-actions \.sn-nara-button svg[\s\S]*margin: auto !important/);
  assert.match(css, /\.sn-sidebar-scrim-v15[\s\S]*z-index: 22500 !important/);
  assert.match(css, /\.nara-floating-button[\s\S]*z-index: 2147483600 !important/);
  assert.match(css, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(bridge, /pointerdown/);
  assert.match(bridge, /\.nara-floating-button, \.sn-top-actions \.sn-nara-button/);
});

test("Nara remains full viewport and its capabilities are not removed", async () => {
  const css = await read("src/studio-mobile-v15.css");
  const assistant = await read("src/NaraAssistant.jsx");
  const workspace = await read("src/NaraWorkspace.jsx");
  assert.match(css, /\.nara-assistant-layer[\s\S]*inset: 0 !important/);
  assert.match(css, /\.nara-assistant-shell[\s\S]*inset: 0 !important/);
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara"]) assert.ok(assistant.includes(marker), marker);
  for (const marker of ["Projects", "Memory", "Images", "Plugins", "Memori jangka panjang", "Buat gambar"]) assert.ok(workspace.includes(marker), marker);
});
