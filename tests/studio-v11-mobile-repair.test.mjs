import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const repair = readFileSync(new URL("../src/studio-v14-authority.css", import.meta.url), "utf8");
const naraAuthority = readFileSync(new URL("../src/nara-interaction-authority.css", import.meta.url), "utf8");
const secure = readFileSync(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");
const commandCenter = readFileSync(new URL("../src/nara-command-center-bridge.js", import.meta.url), "utf8");
const assistant = readFileSync(new URL("../src/NaraAssistant.jsx", import.meta.url), "utf8");


test("v14 repair replaces every older Studio authority", () => {
  const v14 = index.indexOf("studio-v14-authority.css");
  const nara = index.indexOf("nara-interaction-authority.css");
  assert.ok(v14 > -1 && nara > v14);
  assert.doesNotMatch(index, /studio-v10-authority\.css|studio-v11-mobile-repair\.css/);
});


test("native camera image and text inputs never leak into the visible Nara UI", () => {
  assert.match(repair, /\.nara-composer input\[type="file"\][\s\S]*display: none !important/);
  assert.match(repair, /\.nara-native-file-input/);
  assert.match(naraAuthority, /\.nara-native-file-input/);
  assert.match(naraAuthority, /display:\s*none\s*!important/);
});


test("closing the mobile drawer does not cancel the intended Nara or content click", () => {
  assert.match(secure, /closeAfterSelection/);
  assert.match(secure, /requestAnimationFrame\(\(\) =>/);
  assert.doesNotMatch(secure, /event\.preventDefault\(\)/);
  assert.doesNotMatch(secure, /event\.stopPropagation\(\)/);
});


test("Studio observer no longer watches attributes it mutates itself", () => {
  assert.match(secure, /observer\.observe\(document\.body, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(secure, /attributeFilter:/);
  assert.doesNotMatch(secure, /attributes: true/);
});


test("mobile layout keeps a compact icon rail and a full-width usable Nara composer", () => {
  assert.match(repair, /--sn-phone-rail: 58px/);
  assert.match(repair, /width: calc\(100vw - var\(--sn-phone-rail\)\) !important/);
  assert.match(repair, /\.nara-composer-tools[\s\S]*grid-template-columns:/);
  assert.match(repair, /\.nara-assistant-layer[\s\S]*z-index: 30000 !important/);
});


test("all requested Nara capabilities remain in source", () => {
  for (const marker of [
    "Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara",
  ]) assert.ok(assistant.includes(marker), marker);
  for (const marker of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector", "openWorkspace"]) {
    assert.ok(commandCenter.includes(marker), marker);
  }
});
