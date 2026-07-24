import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v16 authority is the last stylesheet and runtime authority", async () => {
  const index = await read("index.html");
  const v15 = index.indexOf("studio-mobile-v15.css");
  const nara = index.indexOf("nara-interaction-authority.css");
  const v16 = index.indexOf("studio-v16-authority.css");
  const commandCenter = index.indexOf("nara-command-center-bridge.js");
  const runtime = index.indexOf("studio-v16-runtime.js");
  assert.ok(v15 > -1);
  assert.ok(nara > v15);
  assert.ok(v16 > nara);
  assert.ok(runtime > commandCenter);
});

test("v16 exposes exactly one visible sidebar edge and keeps the collapsed icon rail", async () => {
  const runtime = await read("src/studio-v16-runtime.js");
  const css = await read("src/studio-v16-authority.css");
  assert.match(runtime, /sn-sidebar-edge-v16/);
  assert.match(runtime, /dataset\.sidebarAuthority = "single-v16"/);
  assert.match(runtime, /v16InitialSidebarResolved/);
  assert.match(css, /\.sn-sidebar-edge-v15,[\s\S]*display: none !important/);
  assert.match(css, /\.sn-side\.collapsed > nav > button[\s\S]*width: 44px !important/);
  assert.match(css, /\.sn-side\.collapsed > nav > button span[\s\S]*display: none !important/);
});

test("v16 preserves Nara launchers and all existing Nara capabilities", async () => {
  const runtime = await read("src/studio-v16-runtime.js");
  const css = await read("src/studio-v16-authority.css");
  const assistant = await read("src/NaraAssistant.jsx");
  const workspace = await read("src/NaraWorkspace.jsx");
  assert.match(runtime, /\.nara-floating-button, \.sn-top-actions \.sn-nara-button/);
  assert.match(runtime, /fallbackNaraOpen/);
  assert.match(css, /\.nara-floating-button[\s\S]*z-index: 2147483600 !important/);
  assert.match(css, /\.nara-assistant-layer[\s\S]*z-index: 2147483640 !important/);
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara"]) assert.ok(assistant.includes(marker), marker);
  for (const marker of ["Projects", "Memory", "Images", "Plugins", "Memori jangka panjang", "Buat gambar"]) assert.ok(workspace.includes(marker), marker);
});

test("Tata letak is a functional persistent Studio route", async () => {
  const runtime = await read("src/studio-v16-runtime.js");
  const css = await read("src/studio-v16-authority.css");
  for (const marker of ["Tata letak", "Lebar ruang kerja", "Kepadatan", "Susunan header", "Warna aksen Studio", "Simpan tata letak"]) assert.ok(runtime.includes(marker), marker);
  assert.match(runtime, /localStorage\.setItem\(PREFS_KEY/);
  assert.match(runtime, /data-layout-v16-route/);
  assert.match(css, /\.sn-layout-v16-layer/);
  assert.match(css, /data-sn-layout-width="compact"/);
});

test("mobile header and floating Nara geometry remain centered and non-overlapping", async () => {
  const css = await read("src/studio-v16-authority.css");
  assert.match(css, /\.sn-top[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto !important/);
  assert.match(css, /\.sn-view-site,[\s\S]*\.sn-top-actions \.sn-nara-button,[\s\S]*width: 42px !important/);
  assert.match(css, /\.sn-view-site svg,[\s\S]*\.sn-top-actions \.sn-nara-button svg[\s\S]*margin: auto !important/);
  assert.match(css, /\.nara-floating-button,[\s\S]*\.nara-floating-button \*[\s\S]*transform: none !important/);
  assert.match(css, /\.nara-assistant-layer,[\s\S]*\.nara-assistant-shell[\s\S]*width: 100dvw !important/);
});
