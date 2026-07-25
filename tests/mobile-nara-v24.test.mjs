import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const archivedCss = read("src/studio-mobile-nara-v24.css");
const css = read("src/studio-shell-v29.css");
const runtime = read("src/studio-shell-v29.js");
const connectors = read("src/nara-connectors-v29.js");
const commandCenter = read("src/nara-command-center-bridge.js");
const assistant = read("src/NaraAssistant.jsx");
const integrations = read("src/lib/nara-data.js");
const serviceWorker = read("public/sw.js");

test("v24 stays archived while v29 is the active mobile Nara authority", () => {
  assert.match(index, /studio-mobile-nara-v24\.css" rel="stylesheet" media="not all"/);
  assert.match(index, /studio-shell-v29\.css" rel="stylesheet"/);
  assert.doesNotMatch(index, /type="module" src="\/src\/nara-mobile-window-v24\.js"/);
  assert.match(archivedCss, /compact mobile Studio and Nara only/i);
});

test("Nara has mini compact and fullscreen controls beside close", () => {
  for (const size of ["mini", "compact", "expanded"]) assert.ok(css.includes(`data-nara-size-v29="${size}"`), size);
  assert.match(css, /data-nara-size-v29="mini"[\s\S]*height: min\(470px/);
  assert.match(css, /data-nara-size-v29="compact"[\s\S]*height: min\(640px/);
  assert.match(css, /data-nara-size-v29="expanded"[\s\S]*width: 100% !important/);
  assert.match(runtime, /close\.insertAdjacentElement\("beforebegin", expand\)/);
  assert.match(runtime, /expand\.insertAdjacentElement\("beforebegin", size\)/);
  assert.match(runtime, /Buka Nara layar penuh/);
  assert.match(runtime, /Kembali ke kotak Nara/);
});

test("mobile drawer is separate from the Nara window and bottom navigation remains absent", () => {
  assert.match(css, /\.sn-mobile-v29-launcher[\s\S]*top: 50dvh !important/);
  assert.match(css, /\.sn-mobile-v29-close[\s\S]*width: 44px !important/);
  assert.match(css, /\.sn-mobile-v29-scrim[\s\S]*z-index: 51900 !important/);
  assert.match(css, /\.sn-shell > \.sn-side[\s\S]*z-index: 52000 !important/);
  assert.match(css, /\.sn-mobile-nav,[\s\S]*\.sn-side-bottom[\s\S]*display: none !important/);
});

test("plugins stay inside Nara with permission-first connection status", () => {
  for (const marker of ["INTEGRATION_CATALOG", "listUserIntegrations", "requestIntegration", "disableIntegration", "ACTIVE_SITE_STORAGE_KEY", "nara-plugin-trigger-v29", "nara-plugin-panel-v29"]) {
    assert.ok(connectors.includes(marker), marker);
  }
  for (const provider of ["github", "supabase", "neon", "cloudflare"]) assert.ok(integrations.includes(`id:"${provider}"`), provider);
  assert.match(connectors, /Hubungkan/);
  assert.match(connectors, /Pending/);
  assert.match(connectors, /Connected/);
});

test("all existing Nara capabilities remain and the PWA cache rotates", () => {
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara", "Jelaskan gambar"]) assert.ok(assistant.includes(marker), marker);
  for (const marker of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector"]) assert.ok(commandCenter.includes(marker), marker);
  assert.match(runtime, /SpeechSynthesisUtterance/);
  assert.match(runtime, /Mode kerja Nara/);
  assert.match(serviceWorker, /ngeblogging-app-v29-20260725/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: "no-store" \}\)/);
});
