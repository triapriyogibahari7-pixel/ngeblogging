import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const authority = read("src/studio-v14-authority.css");
const secure = read("src/StudioSecure.jsx");
const commandCenter = read("src/nara-command-center-bridge.js");
const assistant = read("src/NaraAssistant.jsx");

test("v14 authority is the only final Studio layout authority", () => {
  assert.match(index, /studio-v14-authority\.css/);
  for (const legacy of ["studio-v10-authority.css", "studio-v11-mobile-repair.css", "studio-production-guard.js", "studio-mobile-navigation.js"]) {
    assert.doesNotMatch(index, new RegExp(legacy.replaceAll(".", "\\.")));
  }
});

test("native camera image and text inputs never leak into the visible Nara UI", () => {
  const hiddenRule = authority.match(/\[hidden\],[\s\S]*?\.nara-composer input\[type="file"\],[\s\S]*?\}/)?.[0] || "";
  assert.match(hiddenRule, /display: none !important/);
  assert.doesNotMatch(hiddenRule, /display: block/);
  assert.match(assistant, /ref=\{cameraInput\}/);
  assert.match(assistant, /ref=\{imageInput\}/);
  assert.match(assistant, /ref=\{fileInput\}/);
  assert.match(assistant, /type="file"/);
});

test("closing the phone drawer does not cancel the selected navigation action", () => {
  assert.match(secure, /const closeAfterSelection = \(event\) =>/);
  assert.match(secure, /requestAnimationFrame\(\(\) =>/);
  assert.match(secure, /if \(side && toggle && !side\.classList\.contains\("collapsed"\)\) toggle\.click\(\)/);
  assert.doesNotMatch(secure, /event\.preventDefault\(\)/);
  assert.doesNotMatch(secure, /event\.stopPropagation\(\)/);
});

test("Studio observers watch mounted nodes without a class-mutation feedback loop", () => {
  assert.match(secure, /new MutationObserver\(sync\)/);
  assert.match(secure, /childList: true, subtree: true/);
  assert.doesNotMatch(secure, /attributeFilter:/);
  assert.doesNotMatch(secure, /attributes: true/);
});

test("mobile layout keeps a compact icon rail and a full-width usable Nara composer", () => {
  assert.match(authority, /--sn-phone-rail: 58px/);
  assert.match(authority, /width: calc\(100vw - var\(--sn-phone-rail\)\) !important/);
  assert.match(authority, /\.nara-composer-tools[\s\S]*grid-template-columns:/);
  assert.match(authority, /\.nara-assistant-layer[\s\S]*z-index: 30000 !important/);
});

test("all requested Nara capabilities remain in source and one command center owns them", () => {
  for (const marker of [
    "Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara", "Jelaskan gambar",
  ]) assert.ok(assistant.includes(marker), marker);
  for (const marker of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector", "dedupe(shell)"]) {
    assert.ok(commandCenter.includes(marker), marker);
  }
  assert.match(commandCenter, /node !== owner\) node\.remove\(\)/);
});
