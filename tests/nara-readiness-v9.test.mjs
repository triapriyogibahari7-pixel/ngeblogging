import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const css = read("src/nara-v9-readiness.css");
const authority = read("src/studio-v14-authority.css");
const secure = read("src/StudioSecure.jsx");
const commandCenter = read("src/nara-command-center-bridge.js");
const assistant = read("src/NaraAssistant.jsx");

test("Nara stays visible with healthy or degraded providers", () => {
  assert.match(secure, /dataset\.naraReady/);
  assert.match(secure, /dataset\.naraImageReady/);
  assert.match(secure, /button\.hidden = false/);
  assert.match(authority, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(authority, /\.nara-floating-button[\s\S]*z-index: 24000 !important/);
});

test("models intelligence camera photo files voice image prompts memory QR and plugins remain in the interface", () => {
  for (const marker of [
    "Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara", "Jelaskan gambar",
  ]) assert.ok(assistant.includes(marker), marker);
  for (const marker of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector"]) {
    assert.ok(commandCenter.includes(marker), marker);
  }
  assert.match(css, /must never remove/);
  assert.doesNotMatch(commandCenter, /removeInactiveOptions/);
});

test("readiness and the single v14 authority load before React", () => {
  assert.match(index, /href="\/src\/nara-v9-readiness\.css"/);
  assert.match(index, /href="\/src\/studio-v14-authority\.css"/);
  assert.ok(index.indexOf("nara-v9-readiness.css") < index.indexOf('/src/main.jsx'));
  assert.ok(index.indexOf("studio-v14-authority.css") < index.indexOf('/src/main.jsx'));
  assert.doesNotMatch(index, /studio-v10-authority\.css|nara-availability-bridge\.js/);
});
