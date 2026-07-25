import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const authorityCss = async () => `${await read("src/studio-mobile-v15.css")}\n${await read("src/studio-mobile-v16.css")}\n${await read("src/studio-mobile-v17.css")}\n${await read("src/studio-mobile-v18.css")}\n${await read("src/studio-mobile-v19.css")}\n${await read("src/studio-mobile-v20.css")}\n${await read("src/studio-mobile-v21.css")}\n${await read("src/nara-global-v21.css")}`;

test("v21 is the final layout and Nara runtime authority", async () => {
  const index = await read("index.html");
  const v20 = index.indexOf("studio-mobile-v20.css");
  const v21 = index.indexOf("studio-mobile-v21.css");
  const naraCss = index.indexOf("nara-global-v21.css");
  const sidebar = index.indexOf("studio-sidebar-v15.js");
  const globalNara = index.indexOf("NaraGlobalV21.jsx");
  assert.ok(v20 > -1);
  assert.ok(v21 > v20);
  assert.ok(naraCss > v21);
  assert.ok(sidebar > index.indexOf("/src/main.jsx"));
  assert.ok(globalNara > sidebar);
  assert.doesNotMatch(index, /nara-launcher-v20\.js/);
});

test("physical phones use one sidebar controller in mobile and desktop-site modes", async () => {
  const runtime = await read("src/studio-sidebar-v15.js");
  const css = await read("src/studio-mobile-v21.css");
  assert.match(runtime, /studio-sidebar-v21-20260725/);
  assert.match(runtime, /root\.dataset\.studioCompactPhone/);
  assert.match(runtime, /toggle\.dataset\.sidebarAuthority = "single-v21"/);
  assert.match(runtime, /shell\.dataset\.v21SidebarOpen/);
  assert.match(runtime, /v21InitialSidebarResolved/);
  assert.match(css, /data-studio-compact-phone="true"/);
  assert.match(css, /\.sn-side\.collapsed[\s\S]*width: var\(--sn-v21-rail\) !important/);
  assert.match(css, /\.sn-icon\[data-sidebar-authority="single-v21"\][\s\S]*top: 72px !important/);
});

test("collapsed rail keeps every icon centered while labels return when opened", async () => {
  const css = await authorityCss();
  assert.match(css, /\.sn-side\.collapsed > nav[\s\S]*align-items: center !important/);
  assert.match(css, /\.sn-side\.collapsed > nav > button[\s\S]*display: grid !important[\s\S]*place-items: center !important/);
  assert.match(css, /\.sn-side\.collapsed > nav > button span[\s\S]*display: none !important/);
  assert.match(css, /\.sn-side > nav > button svg[\s\S]*clip-path: none !important/);
  assert.match(css, /\.sn-side > nav::-webkit-scrollbar[\s\S]*display: none !important/);
});

test("sidebar scrim cannot cover the sidebar and no bottom navigation returns", async () => {
  const runtime = await read("src/studio-sidebar-v15.js");
  const css = await read("src/studio-mobile-v21.css");
  assert.match(css, /\.sn-side[\s\S]*z-index: 30020 !important/);
  assert.match(css, /\.sn-sidebar-scrim-v15[\s\S]*z-index: 30010 !important/);
  assert.match(runtime, /\.sn-mobile-nav, \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.match(css, /\.sn-mobile-nav,[\s\S]*display: none !important/);
});

test("header preview Nara and avatar use equal centered geometry", async () => {
  const css = await read("src/studio-mobile-v21.css");
  assert.match(css, /\.sn-top-actions[\s\S]*grid-auto-columns: 42px !important/);
  assert.match(css, /\.sn-view-site,[\s\S]*\.sn-top-actions \.sn-nara-button,[\s\S]*\.sn-avatar[\s\S]*place-items: center !important/);
  assert.match(css, /\.sn-view-site svg,[\s\S]*\.sn-top-actions \.sn-nara-button svg[\s\S]*margin:auto !important/);
  assert.match(css, /rotate:0deg !important/);
});

test("one global React Nara replaces every proxy and opens from native controls", async () => {
  const globalNara = await read("src/NaraGlobalV21.jsx");
  const css = await read("src/nara-global-v21.css");
  assert.match(globalNara, /createRoot\(host\)\.render\(<GlobalNara \/>\)/);
  assert.match(globalNara, /ngeblogging:nara-open/);
  assert.match(globalNara, /\.sn-top-actions \.sn-nara-button, \.ce-nara/);
  assert.match(globalNara, /document\.body\.append\(host\)/);
  assert.match(globalNara, /nara-floating-proxy-v18/);
  assert.doesNotMatch(globalNara, /createElement\("button"\)/);
  assert.match(css, /#root \.nara-floating-button[\s\S]*display: none !important/);
  assert.match(css, /\.nara-global-v21 \.nara-floating-button[\s\S]*z-index: 2147483646 !important/);
  assert.match(css, /\.nara-global-v21 \.nara-assistant-layer[\s\S]*z-index: 2147483647 !important/);
});

test("global Nara remains usable in Android desktop-site scaling", async () => {
  const pwa = await read("src/pwa-runtime.js");
  const css = await read("src/nara-global-v21.css");
  assert.match(pwa, /--sn-physical-layout-width/);
  assert.match(pwa, /--sn-browser-scale/);
  assert.match(css, /data-desktop-site-phone="true"[\s\S]*\.nara-assistant-layer[\s\S]*width: var\(--sn-physical-layout-width/);
  assert.match(css, /height: var\(--sn-physical-layout-height/);
  assert.match(css, /zoom: var\(--sn-browser-scale,1\) !important/);
});

test("Tata Letak opens the real Theme customizer", async () => {
  const runtime = await read("src/studio-sidebar-v15.js");
  assert.match(runtime, /data-layout-route-v21/);
  assert.match(runtime, /Tata Letak/);
  assert.match(runtime, /currentTheme\.click\(\)/);
  assert.match(runtime, /sesuaikan/i);
});

test("all Nara capabilities remain in source", async () => {
  const assistant = await read("src/NaraAssistant.jsx");
  const workspace = await read("src/NaraWorkspace.jsx");
  const commandCenter = await read("src/nara-command-center-bridge.js");
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara"]) assert.ok(assistant.includes(marker), marker);
  for (const marker of ["Projects", "Memory", "Images", "Plugins", "Memori jangka panjang", "Buat gambar"]) assert.ok(workspace.includes(marker), marker);
  for (const marker of ["Baca QR", "BarcodeDetector", "naraWorkspaceRoute"]) assert.ok(commandCenter.includes(marker), marker);
});

test("service worker invalidates every broken v20 asset", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v14-20260724-v21/);
  assert.match(sw, /networkFirst\(request/);
});
