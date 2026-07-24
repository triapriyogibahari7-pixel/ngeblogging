import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const mobileCss = async () => `${await read("src/studio-mobile-v15.css")}\n${await read("src/studio-mobile-v16.css")}\n${await read("src/studio-mobile-v17.css")}`;

test("v17 mobile authority loads after every historical Studio and Nara layer", async () => {
  const index = await read("index.html");
  const v14 = index.indexOf("studio-v14-authority.css");
  const v15 = index.indexOf("studio-mobile-v15.css");
  const nara = index.indexOf("nara-interaction-authority.css");
  const v16 = index.indexOf("studio-mobile-v16.css");
  const v17 = index.indexOf("studio-mobile-v17.css");
  const react = index.indexOf("/src/main.jsx");
  const bridge = index.indexOf("studio-sidebar-v15.js");
  assert.ok(v14 > -1);
  assert.ok(v15 > v14);
  assert.ok(nara > v15);
  assert.ok(v16 > nara);
  assert.ok(v17 > v16);
  assert.ok(react > -1);
  assert.ok(bridge > react);
});

test("one native React toggle is the only visible sidebar controller", async () => {
  const bridge = await read("src/studio-sidebar-v15.js");
  const css = await mobileCss();
  assert.match(bridge, /querySelectorAll\(":scope > \.sn-sidebar-edge-v15"\)\.forEach\(\(node\) => node\.remove\(\)\)/);
  assert.match(bridge, /original\.dataset\.sidebarAuthority = "single-v17"/);
  assert.match(bridge, /original\.classList\.add\("sn-sidebar-edge-owner-v17"\)/);
  assert.match(bridge, /original\.removeAttribute\("data-v15-original-toggle"\)/);
  assert.match(bridge, /v17InitialSidebarResolved/);
  assert.match(css, /html \.sn-sidebar-edge-v15[\s\S]*display: none !important/);
  assert.match(css, /\.sn-icon\.sn-sidebar-edge-owner-v17[\s\S]*left: calc\(var\(--sn-phone-rail, 58px\) - 20px\)/);
  assert.match(css, /data-v15-sidebar-open="true"[\s\S]*left: calc\(var\(--sn-phone-panel/);
});

test("runtime is idempotent and cannot create the prior mutation feedback loop", async () => {
  const bridge = await read("src/studio-sidebar-v15.js");
  assert.doesNotMatch(bridge, /edge\.innerHTML/);
  assert.doesNotMatch(bridge, /panelIcon\(/);
  assert.match(bridge, /MutationObserver\(\(mutations\)/);
  assert.match(bridge, /mutation\.addedNodes\.length \|\| mutation\.removedNodes\.length/);
  assert.match(bridge, /cancelAnimationFrame\(frame\)/);
  assert.doesNotMatch(bridge, /addEventListener\("pointerdown"/);
  assert.doesNotMatch(bridge, /document\.addEventListener\("click"/);
});

test("collapsed sidebar keeps every icon, removes bottom navigation, and exposes Tata Letak", async () => {
  const bridge = await read("src/studio-sidebar-v15.js");
  const css = await mobileCss();
  assert.match(css, /\.sn-side\.collapsed > nav > button[\s\S]*width: 44px !important/);
  assert.match(css, /\.sn-side\.collapsed > nav > button span[\s\S]*display: none !important/);
  assert.match(bridge, /\.sn-mobile-nav, \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.match(bridge, /textLabel\(button\) !== "Nara AI"/);
  assert.match(bridge, /button\.dataset\.naraWorkspaceRoute = "true"/);
  assert.match(bridge, /data-layout-route-v17/);
  assert.match(bridge, /Tata Letak/);
  assert.match(bridge, /sesuaikan/i);
});

test("preview and both Nara launchers are centered and remain above the sidebar scrim", async () => {
  const css = await mobileCss();
  assert.match(css, /\.sn-view-site,[\s\S]*\.sn-top-actions \.sn-nara-button,[\s\S]*width: 42px !important/);
  assert.match(css, /\.sn-view-site svg,[\s\S]*\.sn-top-actions \.sn-nara-button svg[\s\S]*margin: auto !important/);
  assert.match(css, /\.sn-sidebar-scrim-v15[\s\S]*z-index: 22500 !important/);
  assert.match(css, /\.nara-floating-button,[\s\S]*\.nara-assistant-layer[\s\S]*z-index: 2147483600 !important/);
  assert.match(css, /\.nara-floating-button \*[\s\S]*pointer-events: auto !important/);
  assert.match(css, /rotate: 0deg !important/);
});

test("mobile lists and editor are full-width instead of a squeezed desktop canvas", async () => {
  const css = await read("src/studio-mobile-v17.css");
  assert.match(css, /\.sn-page-title[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(css, /\.sn-content-tools[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(css, /data-desktop-site-phone="true"[\s\S]*\.ce-app[\s\S]*--sn-physical-layout-width/);
  assert.match(css, /\.ce-workspace[\s\S]*display: block !important/);
  assert.match(css, /\.ce-paper[\s\S]*min-height: 56vh !important/);
  assert.match(css, /\.ce-sidebar[\s\S]*position: static !important/);
});

test("Nara remains full viewport and its complete capabilities are preserved", async () => {
  const css = await mobileCss();
  const assistant = await read("src/NaraAssistant.jsx");
  const workspace = await read("src/NaraWorkspace.jsx");
  const commandCenter = await read("src/nara-command-center-bridge.js");
  assert.match(css, /\.nara-assistant-layer[\s\S]*inset: 0 !important/);
  assert.match(css, /\.nara-assistant-shell[\s\S]*inset: 0 !important/);
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara"]) assert.ok(assistant.includes(marker), marker);
  for (const marker of ["Projects", "Memory", "Images", "Plugins", "Memori jangka panjang", "Buat gambar"]) assert.ok(workspace.includes(marker), marker);
  for (const marker of ["Baca QR", "BarcodeDetector", "naraWorkspaceRoute"]) assert.ok(commandCenter.includes(marker), marker);
});

test("service worker invalidates stale v16 assets", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v14-20260724-v17/);
  assert.match(sw, /networkFirst\(request/);
});
