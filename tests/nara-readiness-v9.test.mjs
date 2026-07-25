import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const readinessCss = read("src/nara-v9-readiness.css");
const authority = read("src/studio-responsive-v23.css");
const runtime = read("src/studio-runtime-v23.js");
const secure = read("src/StudioSecure.jsx");
const commandCenter = read("src/nara-command-center-bridge.js");
const assistant = read("src/NaraAssistant.jsx");

test("Nara stays visible with healthy or degraded providers", () => {
  assert.match(secure, /dataset\.naraReady/);
  assert.match(secure, /dataset\.naraImageReady/);
  assert.match(runtime, /button\.hidden = false/);
  assert.match(runtime, /button\.disabled = false/);
  assert.match(authority, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(authority, /\.nara-floating-button[\s\S]*z-index: 2147483000 !important/);
});

test("models intelligence camera photo files voice image prompts memory QR and plugins remain in the interface", () => {
  for (const marker of [
    "Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara", "Jelaskan gambar",
  ]) assert.ok(assistant.includes(marker), marker);
  for (const marker of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector"]) {
    assert.ok(commandCenter.includes(marker), marker);
  }
  assert.match(readinessCss, /must never remove/);
  assert.doesNotMatch(commandCenter, /removeInactiveOptions/);
});

test("readiness and the single v23 authority load before React", () => {
  assert.match(index, /href="\/src\/nara-v9-readiness\.css"/);
  assert.match(index, /href="\/src\/studio-responsive-v23\.css"/);
  assert.ok(index.indexOf("nara-v9-readiness.css") < index.indexOf('/src/main.jsx'));
  assert.ok(index.indexOf("studio-responsive-v23.css") < index.indexOf('/src/main.jsx'));
  assert.match(index, /href="\/src\/studio-v14-authority\.css"[^>]+media="not all"/);
  assert.doesNotMatch(index, /<link[^>]+studio-v10-authority\.css|<script[^>]+nara-availability-bridge\.js/);
});
