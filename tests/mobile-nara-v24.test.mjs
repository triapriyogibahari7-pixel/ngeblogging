import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const css = read("src/studio-mobile-nara-v24.css");
const runtime = read("src/nara-mobile-window-v24.js");
const commandCenter = read("src/nara-command-center-bridge.js");
const assistant = read("src/NaraAssistant.jsx");
const integrations = read("src/lib/nara-data.js");
const serviceWorker = read("public/sw.js");

test("v24 is an additive mobile Nara repair loaded after approved v23", () => {
  const v23 = index.indexOf("studio-responsive-v23.css");
  const v24 = index.indexOf("studio-mobile-nara-v24.css");
  const command = index.indexOf("nara-command-center-bridge.js");
  const windowRuntime = index.indexOf("nara-mobile-window-v24.js");
  assert.ok(v23 > -1);
  assert.ok(v24 > v23);
  assert.ok(command > -1);
  assert.ok(windowRuntime > command);
  assert.doesNotMatch(css, /landing|hero-public|public-site|homepage/i);
  assert.match(css, /deliberately scoped to compact mobile Studio and Nara only/i);
});

test("mobile Nara opens compact and has an explicit fullscreen restore control beside close", () => {
  assert.match(css, /data-nara-window-mode="compact"/);
  assert.match(css, /height: min\(76dvh, 680px\) !important/);
  assert.match(css, /border-radius: var\(--nara-v24-radius\) !important/);
  assert.match(css, /data-nara-window-mode="expanded"/);
  assert.match(css, /width: 100vw !important/);
  assert.match(css, /height: 100dvh !important/);
  assert.match(css, /grid-template-columns: 42px minmax\(0, 1fr\) 36px 36px 36px !important/);
  assert.match(runtime, /close\.insertAdjacentElement\("beforebegin", toggle\)/);
  assert.match(runtime, /Kembali ke kotak kecil/);
  assert.match(runtime, /Lebarkan layar penuh/);
  assert.match(runtime, /setWindowMode\(layer, "compact"\)/);
});

test("mobile keeps one visible sidebar rail above its scrim and no bottom navigation", () => {
  assert.match(css, /\.sn-shell > \.sn-side[\s\S]*display: flex !important/);
  assert.match(css, /\.sn-shell > \.sn-side[\s\S]*z-index: 30000 !important/);
  assert.match(css, /\.sn-sidebar-scrim-v23[\s\S]*z-index: 29900 !important/);
  assert.match(css, /\.sn-icon\.sn-sidebar-edge-owner-v23[\s\S]*z-index: 30100 !important/);
  assert.match(css, /\.sn-mobile-nav,[\s\S]*\.sn-side-bottom[\s\S]*display: none !important/);
  assert.match(css, /\.sn-side\.collapsed > nav > button[\s\S]*place-items: center !important/);
});

test("plugins stay inside Nara with permission-first connection status", () => {
  for (const marker of [
    "INTEGRATION_CATALOG",
    "listUserIntegrations",
    "requestIntegration",
    "disableIntegration",
    "ACTIVE_SITE_STORAGE_KEY",
    "nara-plugin-trigger-v24",
    "nara-plugin-panel-v24",
  ]) assert.ok(runtime.includes(marker), marker);
  assert.match(commandCenter, /openInlinePlugins/);
  assert.match(commandCenter, /trigger\.click\(\)/);
  for (const provider of ["github", "supabase", "neon", "cloudflare"]) assert.ok(integrations.includes(`id:"${provider}"`), provider);
  assert.match(css, /GPT-style permission-first plugin drawer/);
});

test("all existing Nara capabilities remain and the PWA cache rotates", () => {
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara", "Jelaskan gambar"]) {
    assert.ok(assistant.includes(marker), marker);
  }
  for (const marker of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector"]) {
    assert.ok(commandCenter.includes(marker), marker);
  }
  assert.match(serviceWorker, /ngeblogging-app-v24-20260725/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: "no-store" \}\)/);
});
