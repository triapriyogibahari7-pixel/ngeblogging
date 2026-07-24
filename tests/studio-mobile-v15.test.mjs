import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const mobileCss = async () => `${await read("src/studio-mobile-v15.css")}\n${await read("src/studio-mobile-v16.css")}\n${await read("src/studio-mobile-v17.css")}\n${await read("src/studio-mobile-v18.css")}`;

test("v18 authority and launcher load last", async () => {
  const index = await read("index.html");
  const v17 = index.indexOf("studio-mobile-v17.css");
  const v18 = index.indexOf("studio-mobile-v18.css");
  const react = index.indexOf("/src/main.jsx");
  const sidebar = index.indexOf("studio-sidebar-v15.js");
  const launcher = index.indexOf("nara-launcher-v18.js");
  assert.ok(v17 > -1);
  assert.ok(v18 > v17);
  assert.ok(react > -1);
  assert.ok(sidebar > react);
  assert.ok(launcher > sidebar);
});

test("desktop-site mode is classified as desktop, not mobile", async () => {
  const pwa = await read("src/pwa-runtime.js");
  const sidebar = await read("src/studio-sidebar-v15.js");
  const css = await read("src/studio-mobile-v18.css");
  assert.match(pwa, /const desktopSitePhone = physicalMobile && browserScale > 1\.2/);
  assert.match(pwa, /if \(!desktopSitePhone && shortSide <= 760\) mode = "mobile"/);
  assert.match(sidebar, /const mobile = !desktopSitePhone/);
  assert.match(sidebar, /dataset\.v15Mobile = String\(profile\.mobile\)/);
  assert.match(css, /data-desktop-site-phone="true"[\s\S]*min-width: 980px !important/);
  assert.match(css, /data-desktop-site-phone="true"[\s\S]*zoom: 1 !important/);
  assert.doesNotMatch(css, /data-desktop-site-phone="true"[\s\S]*--sn-browser-scale/);
});

test("one native sidebar toggle remains and Tata Letak is preserved", async () => {
  const bridge = await read("src/studio-sidebar-v15.js");
  const css = await mobileCss();
  assert.match(bridge, /querySelectorAll\(":scope > \.sn-sidebar-edge-v15"\)\.forEach/);
  assert.match(bridge, /original\.dataset\.sidebarAuthority = "single-v18"/);
  assert.match(bridge, /v18InitialSidebarResolved/);
  assert.match(css, /html \.sn-sidebar-edge-v15[\s\S]*display: none !important/);
  assert.match(bridge, /data-layout-route-v18/);
  assert.match(bridge, /Tata Letak/);
  assert.match(bridge, /button\.dataset\.naraWorkspaceRoute = "true"/);
  assert.match(bridge, /\.sn-mobile-nav, \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
});

test("body-level Nara proxy opens the original React launcher above the scrim", async () => {
  const launcher = await read("src/nara-launcher-v18.js");
  const css = await read("src/studio-mobile-v18.css");
  assert.match(launcher, /document\.body\.append\(proxy\)/);
  assert.match(launcher, /window\.requestAnimationFrame\(\(\) => original\.click\(\)\)/);
  assert.match(launcher, /closeSidebarBeforeNara/);
  assert.match(launcher, /data-nara-original-v18/);
  assert.match(css, /\.nara-floating-proxy-v18[\s\S]*z-index: 2147483646 !important/);
  assert.match(css, /\.nara-floating-proxy-v18[\s\S]*pointer-events: auto !important/);
  assert.match(css, /\.nara-floating-button\[data-nara-original-v18="true"\][\s\S]*display: none !important/);
  assert.match(css, /rotate: 0deg !important/);
});

test("Nara capabilities remain intact", async () => {
  const assistant = await read("src/NaraAssistant.jsx");
  const workspace = await read("src/NaraWorkspace.jsx");
  const commandCenter = await read("src/nara-command-center-bridge.js");
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara"]) assert.ok(assistant.includes(marker), marker);
  for (const marker of ["Projects", "Memory", "Images", "Plugins", "Memori jangka panjang", "Buat gambar"]) assert.ok(workspace.includes(marker), marker);
  for (const marker of ["Baca QR", "BarcodeDetector", "naraWorkspaceRoute"]) assert.ok(commandCenter.includes(marker), marker);
});

test("service worker invalidates v17 assets", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v14-20260724-v18/);
  assert.match(sw, /networkFirst\(request/);
});
