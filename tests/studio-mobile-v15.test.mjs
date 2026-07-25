import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v23 is the final layout and Nara runtime authority", async () => {
  const index = await read("index.html");
  const nara = index.indexOf("nara-interaction-authority.css");
  const v23 = index.indexOf("studio-responsive-v23.css");
  const runtime = index.indexOf("studio-runtime-v23.js");
  assert.ok(nara > -1);
  assert.ok(v23 > nara);
  assert.ok(runtime > index.indexOf("/src/main.jsx"));
  for (const old of ["studio-v14-authority.css", "studio-responsive-v21.css", "studio-responsive-v22.css", "studio-v22-final.css"]) {
    assert.match(index, new RegExp(`${old.replaceAll(".", "\\.")}[^>]+media="not all"`));
  }
  assert.doesNotMatch(index, /<script[^>]+studio-sidebar-v21\.js/);
  assert.doesNotMatch(index, /<script[^>]+studio-runtime-v22\.js/);
  assert.doesNotMatch(index, /<link[^>]+studio-mobile-v(?:15|16|17|18|19|20)\.css/);
  assert.doesNotMatch(index, /<script[^>]+nara-launcher-v(?:19|20)\.js/);
});

test("desktop-site phone uses a real desktop layout selected by viewport ratio", async () => {
  const pwa = await read("src/pwa-runtime.js");
  const runtime = await read("src/studio-runtime-v23.js");
  const css = await read("src/studio-responsive-v23.css");
  assert.match(pwa, /ngeblogging-pwa-v23-20260725/);
  assert.match(pwa, /viewportToScreenRatio >= 1\.18/);
  assert.match(pwa, /const compactViewport = layoutWidth <= 760 && !desktopLayoutRequested/);
  assert.match(pwa, /root\.dataset\.desktopSitePhone = String\(profile\.desktopLayoutRequested\)/);
  assert.match(runtime, /root\.dataset\.layoutMode/);
  assert.match(css, /html\[data-desktop-layout-requested="true"\] \.sn-main/);
  assert.match(css, /html\[data-desktop-layout-requested="true"\] \.ce-workspace/);
  assert.doesNotMatch(css, /zoom: var\(--sn-browser-scale/);
});

test("collapsed rail icons are centered and the edge toggle stays on the rail", async () => {
  const css = await read("src/studio-responsive-v23.css");
  assert.match(css, /\.sn-side\.collapsed > nav > button[\s\S]*display: grid !important[\s\S]*place-items: center !important/);
  assert.match(css, /\.sn-side\.collapsed > nav > button svg[\s\S]*margin: auto !important/);
  assert.match(css, /\.sn-icon\.sn-sidebar-edge-owner-v23[\s\S]*top: 76px !important/);
  assert.match(css, /\.sn-side > nav[\s\S]*overflow-y: auto !important/);
});

test("desktop headings actions and content stay inside the viewport", async () => {
  const css = await read("src/studio-responsive-v23.css");
  assert.match(css, /data-desktop-layout-requested="true"\] \.sn-welcome h1,[\s\S]*font-size: clamp\(32px, 3\.2vw, 48px\) !important/);
  assert.match(css, /data-desktop-layout-requested="true"\] \.sn-top[\s\S]*overflow: visible !important/);
  assert.match(css, /data-desktop-layout-requested="true"\] \.sn-main,[\s\S]*width: calc\(100% - var\(--sn-v23-desktop-panel\)\) !important/);
  assert.match(css, /data-desktop-layout-requested="true"\] \.sn-side\.collapsed \+ \.sn-main[\s\S]*margin-left: var\(--sn-v23-desktop-rail\) !important/);
});

test("editor stretches its white writing surface and keeps metadata in the correct layout", async () => {
  const css = await read("src/studio-responsive-v23.css");
  assert.match(css, /\.ce-paper-shell[\s\S]*display: flex !important[\s\S]*flex-direction: column !important/);
  assert.match(css, /\.ce-paper[\s\S]*flex: 1 1 auto !important/);
  assert.match(css, /data-desktop-layout-requested="true"\] \.ce-workspace[\s\S]*minmax\(320px, 360px\)/);
  assert.match(css, /html:not\(\[data-desktop-layout-requested="true"\]\) \.ce-sidebar[\s\S]*position: static !important/);
  assert.match(css, /\.ce-ribbon[\s\S]*overflow-x: auto !important/);
});

test("Nara uses the direct React launcher without a proxy and fills phones", async () => {
  const index = await read("index.html");
  const assistant = await read("src/NaraAssistant.jsx");
  const css = await read("src/studio-responsive-v23.css");
  assert.doesNotMatch(index, /<script[^>]+nara-launcher-v20\.js/);
  assert.match(assistant, /className="nara-floating-button" onClick=\{\(\) => setOpen\(true\)\}/);
  assert.match(css, /\.nara-floating-proxy-v20,[\s\S]*display: none !important/);
  assert.match(css, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(css, /data-physical-phone="true"\] \.nara-assistant-layer[\s\S]*min-height: 100dvh !important/);
});

test("all Nara capabilities remain in source", async () => {
  const assistant = await read("src/NaraAssistant.jsx");
  const workspace = await read("src/NaraWorkspace.jsx");
  const commandCenter = await read("src/nara-command-center-bridge.js");
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara"]) assert.ok(assistant.includes(marker), marker);
  for (const marker of ["Projects", "Memory", "Images", "Plugins", "Memori jangka panjang", "Buat gambar"]) assert.ok(workspace.includes(marker), marker);
  for (const marker of ["Baca QR", "BarcodeDetector", "naraWorkspaceRoute"]) assert.ok(commandCenter.includes(marker), marker);
});

test("service worker invalidates prior assets with v23", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v23-20260725/);
  assert.match(sw, /networkFirst\(request/);
});
