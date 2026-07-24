import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/nara-v9-readiness.css", import.meta.url), "utf8");
const authority = readFileSync(new URL("../src/studio-v14-authority.css", import.meta.url), "utf8");
const naraAuthority = readFileSync(new URL("../src/nara-interaction-authority.css", import.meta.url), "utf8");
const secure = readFileSync(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");
const commandCenter = readFileSync(new URL("../src/nara-command-center-bridge.js", import.meta.url), "utf8");
const assistant = readFileSync(new URL("../src/NaraAssistant.jsx", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");


test("Nara stays visible while readiness follows real provider health", () => {
  assert.match(secure, /dataset\.naraReady = String\(health\.nara === true\)/);
  assert.match(secure, /dataset\.naraImageReady = String\(health\.imageGeneration === true\)/);
  assert.match(secure, /\.sn-top-actions \.sn-nara-button/);
  assert.match(secure, /button\.hidden = false/);
  assert.match(authority, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(naraAuthority, /\.nara-floating-button[\s\S]*z-index: 2147483000 !important/);
});


test("models intelligence camera photo files voice image prompts memory QR and plugins remain in the interface", () => {
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara", "Jelaskan gambar"]) {
    assert.ok(assistant.includes(marker), marker);
  }
  for (const marker of ["Baca QR", "Projects", "Memori", "Buat gambar", "Plugins", "BarcodeDetector", "openWorkspace"]) {
    assert.ok(commandCenter.includes(marker), marker);
  }
  assert.match(css, /must never remove/);
  assert.doesNotMatch(index, /nara-availability-bridge\.js/);
});


test("readiness and v14 authorities load before the React application", () => {
  assert.match(index, /href="\/src\/nara-v9-readiness\.css"/);
  assert.match(index, /href="\/src\/studio-v14-authority\.css"/);
  assert.match(index, /href="\/src\/nara-interaction-authority\.css"/);
  assert.ok(index.indexOf("nara-v9-readiness.css") < index.indexOf('/src/main.jsx'));
  assert.ok(index.indexOf("studio-v14-authority.css") < index.indexOf('/src/main.jsx'));
  assert.ok(index.indexOf("nara-interaction-authority.css") < index.indexOf('/src/main.jsx'));
  assert.ok(index.indexOf("nara-interaction-authority.css") > index.indexOf("studio-v14-authority.css"));
});
