import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v16 mobile authority loads after every historical Studio and Nara layer", async () => {
  const index = await read("index.html");
  const v14 = index.indexOf("studio-v14-authority.css");
  const v15 = index.indexOf("studio-mobile-v15.css");
  const nara = index.indexOf("nara-interaction-authority.css");
  const v16 = index.indexOf("studio-mobile-v16.css");
  const react = index.indexOf("/src/main.jsx");
  const bridge = index.indexOf("studio-sidebar-v15.js");
  assert.ok(v14 > -1);
  assert.ok(v15 > v14);
  assert.ok(nara > v15);
  assert.ok(v16 > nara);
  assert.ok(react > -1);
  assert.ok(bridge > react);
});

test("one visible edge controller owns sidebar open close on physical phones", async () => {
  const bridge = await read("src/studio-sidebar-v15.js");
  const css = `${await read("src/studio-mobile-v15.css")}\n${await read("src/studio-mobile-v16.css")}`;
  assert.match(bridge, /sn-sidebar-edge-v15/);
  assert.match(bridge, /original\.dataset\.v15OriginalToggle = "true"/);
  assert.match(bridge, /dataset\.sidebarAuthority = "single-v15"/);
  assert.match(bridge, /v15InitialSidebarResolved/);
  assert.match(bridge, /duplicateEdges\.slice\(1\)/);
  assert.match(bridge, /current\?\.click\(\)/);
  assert.match(css, /\[data-v15-original-toggle="true"\][\s\S]*display: none !important/);
  assert.match(css, /\.sn-sidebar-edge-v15[\s\S]*left: calc\(var\(--sn-phone-rail\) - 20px\)/);
  assert.match(css, /data-v15-sidebar-open="true"[\s\S]*left: calc\(var\(--sn-phone-panel\) - 20px\)/);
});

test("collapsed sidebar keeps every icon, removes bottom navigation, and exposes Tata Letak", async () => {
  const bridge = await read("src/studio-sidebar-v15.js");
  const css = `${await read("src/studio-mobile-v15.css")}\n${await read("src/studio-mobile-v16.css")}`;
  assert.match(css, /\.sn-side\.collapsed > nav > button[\s\S]*width: 44px !important/);
  assert.match(css, /\.sn-side\.collapsed > nav > button span[\s\S]*display: none !important/);
  assert.match(bridge, /\.sn-mobile-nav, \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.match(bridge, /textLabel\(button\) !== "Nara AI"/);
  assert.match(bridge, /button\.dataset\.naraWorkspaceRoute = "true"/);
  assert.match(bridge, /data-layout-route-v16/);
  assert.match(bridge, /Tata Letak/);
  assert.match(bridge, /Sesuaikan/i);
});

test("mobile bridge does not synthesize Nara pointer events or double-close the sidebar", async () => {
  const bridge = await read("src/studio-sidebar-v15.js");
  assert.doesNotMatch(bridge, /addEventListener\("pointerdown"/);
  assert.doesNotMatch(bridge, /document\.addEventListener\("click"/);
  assert.match(bridge, /\.sn-top-actions \.sn-nara-button, \.nara-floating-button/);
  assert.match(bridge, /button\.disabled = false/);
});

test("preview and Nara controls are centered above the sidebar scrim", async () => {
  const css = `${await read("src/studio-mobile-v15.css")}\n${await read("src/studio-mobile-v16.css")}`;
  assert.match(css, /\.sn-view-site,[\s\S]*\.sn-top-actions \.sn-nara-button,[\s\S]*width: 42px !important/);
  assert.match(css, /\.sn-view-site svg,[\s\S]*\.sn-top-actions \.sn-nara-button svg[\s\S]*margin: auto !important/);
  assert.match(css, /\.sn-sidebar-scrim-v15[\s\S]*z-index: 22500 !important/);
  assert.match(css, /\.nara-floating-button[\s\S]*z-index: 2147483600 !important/);
  assert.match(css, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(css, /rotate: 0deg !important/);
});

test("desktop-site mode on a physical phone restores its calculated width and scale", async () => {
  const css = await read("src/studio-mobile-v16.css");
  assert.match(css, /data-desktop-site-phone="true"[\s\S]*--sn-physical-layout-width/);
  assert.match(css, /zoom: var\(--sn-browser-scale, 1\) !important/);
  assert.match(css, /width: calc\(100% - var\(--sn-phone-rail\)\) !important/);
});

test("Nara remains full viewport and its complete capabilities are preserved", async () => {
  const css = `${await read("src/studio-mobile-v15.css")}\n${await read("src/studio-mobile-v16.css")}`;
  const assistant = await read("src/NaraAssistant.jsx");
  const workspace = await read("src/NaraWorkspace.jsx");
  const commandCenter = await read("src/nara-command-center-bridge.js");
  assert.match(css, /\.nara-assistant-layer[\s\S]*inset: 0 !important/);
  assert.match(css, /\.nara-assistant-shell[\s\S]*inset: 0 !important/);
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara"]) assert.ok(assistant.includes(marker), marker);
  for (const marker of ["Projects", "Memory", "Images", "Plugins", "Memori jangka panjang", "Buat gambar"]) assert.ok(workspace.includes(marker), marker);
  for (const marker of ["Baca QR", "BarcodeDetector", "naraWorkspaceRoute"]) assert.ok(commandCenter.includes(marker), marker);
});

test("service worker invalidates stale v14 mobile assets without breaking deployment marker", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v14-20260724-v16/);
  assert.match(sw, /networkFirst\(request/);
});
