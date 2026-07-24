import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const mobileCss = async () => `${await read("src/studio-mobile-v15.css")}\n${await read("src/studio-mobile-v16.css")}\n${await read("src/studio-mobile-v17.css")}\n${await read("src/studio-mobile-v18.css")}\n${await read("src/studio-mobile-v19.css")}`;

test("v19 adaptive desktop authority and resilient launcher load last", async () => {
  const index = await read("index.html");
  const v18 = index.indexOf("studio-mobile-v18.css");
  const v19 = index.indexOf("studio-mobile-v19.css");
  const react = index.indexOf("/src/main.jsx");
  const sidebar = index.indexOf("studio-sidebar-v15.js");
  const launcher = index.indexOf("nara-launcher-v19.js");
  assert.ok(v18 > -1);
  assert.ok(v19 > v18);
  assert.ok(react > -1);
  assert.ok(sidebar > react);
  assert.ok(launcher > sidebar);
  assert.doesNotMatch(index, /nara-launcher-v18\.js/);
});

test("desktop-site phones are counter-scaled to a readable physical-width canvas", async () => {
  const pwa = await read("src/pwa-runtime.js");
  const sidebar = await read("src/studio-sidebar-v15.js");
  const css = await read("src/studio-mobile-v19.css");
  assert.match(pwa, /adaptiveDesktopPhone: desktopSitePhone/);
  assert.match(pwa, /dataset\.desktopCompactPhone = String\(profile\.adaptiveDesktopPhone\)/);
  assert.match(pwa, /--sn-physical-layout-width/);
  assert.match(sidebar, /const compactDesktop = physicalMobile && desktopSitePhone/);
  assert.match(css, /data-desktop-site-phone="true"[\s\S]*body[\s\S]*width: var\(--sn-physical-layout-width/);
  assert.match(css, /zoom: var\(--sn-browser-scale, 1\) !important/);
  assert.doesNotMatch(css, /min-width: 980px !important/);
});

test("one native sidebar toggle remains with readable overlay and Tata Letak", async () => {
  const bridge = await read("src/studio-sidebar-v15.js");
  const css = await mobileCss();
  assert.match(bridge, /querySelectorAll\(":scope > \.sn-sidebar-edge-v15"\)\.forEach/);
  assert.match(bridge, /original\.dataset\.sidebarAuthority = "single-v19"/);
  assert.match(bridge, /v19InitialSidebarResolved/);
  assert.match(bridge, /profile\.mobile \|\| profile\.compactDesktop/);
  assert.match(css, /html \.sn-sidebar-edge-v15[\s\S]*display: none !important/);
  assert.match(css, /data-desktop-site-phone="true"[\s\S]*--sn-phone-panel/);
  assert.match(css, /\.sn-sidebar-scrim-v15[\s\S]*--sn-physical-layout-width/);
  assert.match(bridge, /data-layout-route-v19/);
  assert.match(bridge, /Tata Letak/);
  assert.match(bridge, /button\.dataset\.naraWorkspaceRoute = "true"/);
  assert.match(bridge, /\.sn-mobile-nav, \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
});

test("Nara body launcher retries header, editor, and original React controls", async () => {
  const launcher = await read("src/nara-launcher-v19.js");
  const css = await read("src/studio-mobile-v19.css");
  assert.match(launcher, /document\.body\.append\(proxy\)/);
  assert.match(launcher, /headerLauncher\(\) \|\| editorLauncher\(\) \|\| originalLauncher\(\)/);
  assert.match(launcher, /window\.setTimeout\(\(\) => clickBestLauncher/);
  assert.match(launcher, /closeSidebarBeforeNara/);
  assert.match(launcher, /single-v19/);
  assert.match(launcher, /data\.naraOriginalV19|dataset\.naraOriginalV19/);
  assert.match(css, /\.nara-floating-proxy-v19[\s\S]*z-index: 2147483646 !important/);
  assert.match(css, /\.nara-floating-proxy-v19[\s\S]*pointer-events: auto !important/);
  assert.match(css, /data-desktop-site-phone="true"[\s\S]*\.nara-assistant-layer[\s\S]*--sn-physical-layout-width/);
  assert.match(css, /\.nara-assistant-shell[\s\S]*width: 100% !important/);
});

test("compact desktop editor removes the 980px blank paper and keeps all settings", async () => {
  const css = await read("src/studio-mobile-v19.css");
  assert.match(css, /\.ce-workspace[\s\S]*display: block !important/);
  assert.match(css, /\.ce-paper[\s\S]*min-height: max\(480px/);
  assert.doesNotMatch(css, /\.ce-paper[\s\S]*min-height: 980px !important/);
  assert.match(css, /\.ce-sidebar[\s\S]*position: static !important/);
  assert.match(css, /\.ce-ribbon[\s\S]*overflow-x: auto !important/);
});

test("Nara capabilities remain intact", async () => {
  const assistant = await read("src/NaraAssistant.jsx");
  const workspace = await read("src/NaraWorkspace.jsx");
  const commandCenter = await read("src/nara-command-center-bridge.js");
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara"]) assert.ok(assistant.includes(marker), marker);
  for (const marker of ["Projects", "Memory", "Images", "Plugins", "Memori jangka panjang", "Buat gambar"]) assert.ok(workspace.includes(marker), marker);
  for (const marker of ["Baca QR", "BarcodeDetector", "naraWorkspaceRoute"]) assert.ok(commandCenter.includes(marker), marker);
});

test("service worker invalidates v18 assets", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v14-20260724-v19/);
  assert.match(sw, /networkFirst\(request/);
});
