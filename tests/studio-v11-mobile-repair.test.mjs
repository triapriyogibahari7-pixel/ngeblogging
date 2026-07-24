import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const repair = readFileSync(new URL("../src/studio-v11-mobile-repair.css", import.meta.url), "utf8");
const availability = readFileSync(new URL("../src/nara-availability-bridge.js", import.meta.url), "utf8");
const navigation = readFileSync(new URL("../src/studio-mobile-navigation.js", import.meta.url), "utf8");
const guard = readFileSync(new URL("../src/studio-production-guard.js", import.meta.url), "utf8");
const assistant = readFileSync(new URL("../src/NaraAssistant.jsx", import.meta.url), "utf8");

test("v11 repair is loaded after every older Studio authority", () => {
  const v10 = index.indexOf("studio-v10-authority.css");
  const v11 = index.indexOf("studio-v11-mobile-repair.css");
  assert.ok(v10 > -1 && v11 > v10);
});

test("native camera image and text inputs never leak into the visible Nara UI", () => {
  assert.match(repair, /\.nara-composer input\[type="file"\][\s\S]*display: none !important/);
  assert.match(availability, /input\.hidden = true/);
  assert.match(availability, /nara-native-file-input/);
  assert.doesNotMatch(availability, /\.nara-composer input[^\n]+hidden = false/);
});

test("closing the mobile drawer does not cancel the intended Nara or content click", () => {
  assert.match(navigation, /same tap must still open the floating Nara assistant/);
  assert.doesNotMatch(navigation, /event\.preventDefault\(\)/);
  assert.doesNotMatch(navigation, /event\.stopPropagation\(\)/);
});

test("production guard no longer observes attributes that it mutates itself", () => {
  assert.match(guard, /Watching attributes created a[\s\S]*feedback loop/);
  assert.match(guard, /childList: true/);
  assert.doesNotMatch(guard, /attributeFilter:/);
  assert.doesNotMatch(guard, /attributes: true/);
});

test("mobile layout keeps a compact icon rail and a full-width usable Nara composer", () => {
  assert.match(repair, /--sn-phone-rail: 56px !important/);
  assert.match(repair, /width: calc\(100vw - var\(--sn-phone-rail\)\) !important/);
  assert.match(repair, /\.nara-composer-tools[\s\S]*grid-template-columns:/);
  assert.match(repair, /\.nara-assistant-layer[\s\S]*z-index: 30000 !important/);
});

test("all requested Nara capabilities remain in source", () => {
  for (const marker of [
    "Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara",
  ]) assert.ok(assistant.includes(marker), marker);
  for (const marker of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "requestQrScan", "openNaraWorkspace"]) {
    assert.ok(guard.includes(marker), marker);
  }
});
