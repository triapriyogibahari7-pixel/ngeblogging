import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v21 is the final layout and Nara runtime authority", async () => {
  const index = await read("index.html");
  const v14 = index.indexOf("studio-v14-authority.css");
  const nara = index.indexOf("nara-interaction-authority.css");
  const v21 = index.indexOf("studio-responsive-v21.css");
  const sidebar = index.indexOf("studio-sidebar-v21.js");
  assert.ok(v14 > -1);
  assert.ok(nara > v14);
  assert.ok(v21 > nara);
  assert.ok(sidebar > index.indexOf("/src/main.jsx"));
  assert.doesNotMatch(index, /studio-mobile-v(?:15|16|17|18|19|20)\.css/);
  assert.doesNotMatch(index, /nara-launcher-v(?:19|20)\.js/);
});

test("desktop-site phone uses the browser viewport as a real desktop or tablet", async () => {
  const pwa = await read("src/pwa-runtime.js");
  const css = await read("src/studio-responsive-v21.css");
  assert.match(pwa, /ngeblogging-pwa-v21-20260725/);
  assert.match(pwa, /const compactViewport = layoutWidth <= 760/);
  assert.match(pwa, /const desktopLayoutRequested = physicalScreenMobile && layoutWidth > 760/);
  assert.match(pwa, /root\.dataset\.desktopSitePhone = "false"/);
  assert.match(pwa, /root\.style\.setProperty\("--sn-browser-scale", "1"\)/);
  assert.match(css, /@media \(min-width: 761px\)/);
  assert.match(css, /html\[data-desktop-site-phone="true"\] #root[\s\S]*zoom: 1 !important/);
  assert.doesNotMatch(css, /min-width: 980px !important/);
  assert.doesNotMatch(css, /zoom: var\(--sn-browser-scale/);
});

test("collapsed rail icons are centered and the edge toggle does not cover the header", async () => {
  const css = await read("src/studio-responsive-v21.css");
  assert.match(css, /\.sn-side\.collapsed > nav > button[\s\S]*display: grid !important[\s\S]*place-items: center !important/);
  assert.match(css, /\.sn-side\.collapsed > nav > button svg[\s\S]*position: static !important[\s\S]*rotate: 0deg !important/);
  assert.match(css, /\.sn-icon\.sn-sidebar-edge-owner-v21[\s\S]*top: max\(12px, env\(safe-area-inset-top\)\) !important/);
  assert.match(css, /\.sn-side > nav::-webkit-scrollbar[\s\S]*display: none !important/);
});

test("desktop headings and actions stay inside the viewport", async () => {
  const css = await read("src/studio-responsive-v21.css");
  assert.match(css, /\.sn-welcome h1,[\s\S]*font-size: clamp\(32px, 3\.2vw, 46px\) !important/);
  assert.match(css, /\.sn-top[\s\S]*width: 100% !important/);
  assert.match(css, /\.sn-main,[\s\S]*width: calc\(100% - var\(--sn-v21-panel\)\) !important/);
  assert.match(css, /\.sn-side\.collapsed \+ \.sn-main[\s\S]*margin-left: var\(--sn-v21-rail\) !important/);
});

test("editor removes the 980px blank page and keeps metadata below the canvas", async () => {
  const css = await read("src/studio-responsive-v21.css");
  assert.match(css, /\.ce-workspace[\s\S]*display: block !important/);
  assert.match(css, /\.ce-paper[\s\S]*min-height: max\(480px, calc\(100dvh - 220px\)\) !important/);
  assert.doesNotMatch(css, /min-height: 980px !important/);
  assert.match(css, /\.ce-sidebar[\s\S]*position: static !important/);
  assert.match(css, /\.ce-ribbon[\s\S]*overflow-x: auto !important/);
});

test("Nara uses the direct React launcher without a proxy", async () => {
  const index = await read("index.html");
  const assistant = await read("src/NaraAssistant.jsx");
  const css = await read("src/studio-responsive-v21.css");
  assert.doesNotMatch(index, /nara-launcher-v20\.js/);
  assert.match(assistant, /className="nara-floating-button" onClick=\{\(\) => setOpen\(true\)\}/);
  assert.match(css, /\.nara-floating-proxy-v20,[\s\S]*display: none !important/);
  assert.match(css, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(css, /\.nara-assistant-layer[\s\S]*min-height: 100dvh !important/);
});

test("all Nara capabilities remain in source", async () => {
  const assistant = await read("src/NaraAssistant.jsx");
  const workspace = await read("src/NaraWorkspace.jsx");
  const commandCenter = await read("src/nara-command-center-bridge.js");
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara"]) assert.ok(assistant.includes(marker), marker);
  for (const marker of ["Projects", "Memory", "Images", "Plugins", "Memori jangka panjang", "Buat gambar"]) assert.ok(workspace.includes(marker), marker);
  for (const marker of ["Baca QR", "BarcodeDetector", "naraWorkspaceRoute"]) assert.ok(commandCenter.includes(marker), marker);
});

test("service worker invalidates v20 assets", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v14-20260724-v21/);
  assert.match(sw, /networkFirst\(request/);
});
