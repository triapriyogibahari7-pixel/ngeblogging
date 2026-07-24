import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const authorityCss = async () => `${await read("src/studio-mobile-v15.css")}\n${await read("src/studio-mobile-v16.css")}\n${await read("src/studio-mobile-v17.css")}\n${await read("src/studio-mobile-v18.css")}\n${await read("src/studio-mobile-v19.css")}\n${await read("src/studio-mobile-v20.css")}`;

test("v20 is the final layout and Nara runtime authority", async () => {
  const index = await read("index.html");
  const v19 = index.indexOf("studio-mobile-v19.css");
  const v20 = index.indexOf("studio-mobile-v20.css");
  const sidebar = index.indexOf("studio-sidebar-v15.js");
  const launcher = index.indexOf("nara-launcher-v20.js");
  assert.ok(v19 > -1);
  assert.ok(v20 > v19);
  assert.ok(sidebar > index.indexOf("/src/main.jsx"));
  assert.ok(launcher > sidebar);
  assert.doesNotMatch(index, /nara-launcher-v19\.js/);
});

test("desktop-site phone scales only root, not the body", async () => {
  const pwa = await read("src/pwa-runtime.js");
  const css = await read("src/studio-mobile-v20.css");
  assert.match(pwa, /ngeblogging-pwa-v20-20260724/);
  assert.match(pwa, /--sn-physical-layout-width/);
  assert.match(css, /data-desktop-site-phone="true"\][\s\S]*body[\s\S]*zoom: 1 !important/);
  assert.match(css, /data-desktop-site-phone="true"\] #root[\s\S]*zoom: var\(--sn-browser-scale,1\) !important/);
  assert.doesNotMatch(css, /min-width: 980px !important/);
});

test("collapsed rail icons are centered and the edge toggle does not cover the header", async () => {
  const css = await authorityCss();
  assert.match(css, /\.sn-side\.collapsed > nav[\s\S]*align-items: center !important/);
  assert.match(css, /\.sn-side\.collapsed > nav > button[\s\S]*display: grid !important[\s\S]*place-items: center !important/);
  assert.match(css, /\.sn-side\.collapsed > nav > button svg[\s\S]*position: static !important[\s\S]*clip-path: none !important/);
  assert.match(css, /\.sn-icon\.sn-sidebar-edge-owner-v19[\s\S]*top: 72px !important/);
  assert.match(css, /\.sn-side > nav::-webkit-scrollbar[\s\S]*display: none !important/);
});

test("compact desktop headings and actions cannot overflow the physical canvas", async () => {
  const css = await read("src/studio-mobile-v20.css");
  assert.match(css, /\.sn-welcome h1,[\s\S]*font-size: 30px !important/);
  assert.match(css, /overflow-wrap: anywhere !important/);
  assert.match(css, /\.sn-welcome > div:last-child[\s\S]*repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /\.sn-main[\s\S]*width: calc\(100% - var\(--sn-phone-rail\)\) !important/);
});

test("editor removes the 980px blank page and keeps metadata below the canvas", async () => {
  const css = await read("src/studio-mobile-v20.css");
  assert.match(css, /\.ce-workspace[\s\S]*display:block !important/);
  assert.match(css, /\.ce-paper[\s\S]*min-height:max\(480px/);
  assert.doesNotMatch(css, /\.ce-paper[\s\S]*min-height: 980px !important/);
  assert.match(css, /\.ce-sidebar[\s\S]*position:static !important/);
  assert.match(css, /\.ce-ribbon[\s\S]*overflow-x:auto !important/);
});

test("site manager and every fixed modal use the physical compact viewport", async () => {
  const css = await read("src/studio-mobile-v20.css");
  assert.match(css, /\.sn-modal-layer,[\s\S]*\.ce-source-layer[\s\S]*height:var\(--sn-physical-layout-height/);
  assert.match(css, /\.sn-site-manager,[\s\S]*max-height:calc\(var\(--sn-physical-layout-height/);
  assert.match(css, /\.sn-site-manager > header > button[\s\S]*width:40px !important/);
  assert.match(css, /\.sn-sites-list article[\s\S]*grid-template-columns:42px minmax\(0,1fr\)/);
});

test("Nara v20 retries native controls and has a workspace fallback", async () => {
  const launcher = await read("src/nara-launcher-v20.js");
  const css = await read("src/studio-mobile-v20.css");
  assert.match(launcher, /HTMLElement\.prototype\.click\.call\(element\)/);
  assert.match(launcher, /headerLauncher|sn-nara-button/);
  assert.match(launcher, /\.ce-nara/);
  assert.match(launcher, /data-nara-workspace-route/);
  assert.match(launcher, /\.nw-page button/);
  assert.match(launcher, /attempt < 7/);
  assert.match(css, /\.nara-floating-proxy-v20[\s\S]*z-index: 2147483646 !important/);
  assert.match(css, /\.nara-assistant-layer[\s\S]*height:var\(--sn-physical-layout-height/);
});

test("all Nara capabilities remain in source", async () => {
  const assistant = await read("src/NaraAssistant.jsx");
  const workspace = await read("src/NaraWorkspace.jsx");
  const commandCenter = await read("src/nara-command-center-bridge.js");
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara"]) assert.ok(assistant.includes(marker), marker);
  for (const marker of ["Projects", "Memory", "Images", "Plugins", "Memori jangka panjang", "Buat gambar"]) assert.ok(workspace.includes(marker), marker);
  for (const marker of ["Baca QR", "BarcodeDetector", "naraWorkspaceRoute"]) assert.ok(commandCenter.includes(marker), marker);
});

test("service worker invalidates v19 assets", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v14-20260724-v20/);
  assert.match(sw, /networkFirst\(request/);
});
