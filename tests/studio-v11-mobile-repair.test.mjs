import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const responsive = read("src/studio-responsive-v23.css");
const secure = read("src/StudioSecure.jsx");
const runtime = read("src/studio-runtime-v23.js");
const commandCenter = read("src/nara-command-center-bridge.js");
const assistant = read("src/NaraAssistant.jsx");

test("v23 responsive authority is the only active Studio layout authority", () => {
  assert.match(index, /studio-responsive-v23\.css/);
  assert.match(index, /studio-runtime-v23\.js/);
  for (const disabled of ["studio-v14-authority.css", "studio-responsive-v21.css", "studio-responsive-v22.css", "studio-v22-final.css"]) {
    assert.match(index, new RegExp(`${disabled.replaceAll(".", "\\.")}[^>]+media="not all"`));
  }
  for (const legacy of [
    "studio-v10-authority.css",
    "studio-v11-mobile-repair.css",
    "studio-production-guard.js",
    "studio-mobile-navigation.js",
    "studio-mobile-v15.css",
    "studio-mobile-v16.css",
    "studio-mobile-v17.css",
    "studio-mobile-v18.css",
    "studio-mobile-v19.css",
    "studio-mobile-v20.css",
  ]) assert.doesNotMatch(index, new RegExp(`<script[^>]+${legacy.replaceAll(".", "\\.")}|<link[^>]+${legacy.replaceAll(".", "\\.")}`));
});

test("native camera image and text inputs never leak into the visible Nara UI", () => {
  assert.match(responsive, /\.nara-composer input\[type="file"\][\s\S]*display: none !important/);
  assert.match(assistant, /ref=\{cameraInput\}/);
  assert.match(assistant, /ref=\{imageInput\}/);
  assert.match(assistant, /ref=\{fileInput\}/);
  assert.match(assistant, /type="file"/);
});

test("closing the phone drawer does not cancel the selected navigation action", () => {
  const handler = runtime.match(/document\.addEventListener\("click",[\s\S]*?\}, true\);/)?.[0] || "";
  assert.match(handler, /requestAnimationFrame\(\(\) => toggle\.click\(\)\)/);
  assert.match(handler, /if \(side && toggle && !side\.classList\.contains\("collapsed"\)\)/);
  assert.doesNotMatch(handler, /event\.preventDefault\(\)/);
  assert.doesNotMatch(handler, /event\.stopPropagation\(\)/);
  assert.doesNotMatch(secure, /closeAfterSelection/);
});

test("Studio observers watch mounted nodes without a class-mutation feedback loop", () => {
  assert.match(secure, /new MutationObserver\(\(mutations\) =>/);
  assert.match(secure, /childList: true, subtree: true/);
  assert.match(runtime, /new MutationObserver\(\(mutations\) =>/);
  assert.match(runtime, /observe\(document\.documentElement, \{ childList: true, subtree: true \}\)/);
  assert.doesNotMatch(secure, /attributeFilter:/);
  assert.doesNotMatch(secure, /attributes: true/);
  assert.doesNotMatch(runtime, /attributeFilter:/);
  assert.doesNotMatch(runtime, /attributes: true/);
});

test("mobile layout keeps a compact icon rail and a full-width usable Nara composer", () => {
  assert.match(responsive, /--sn-v23-rail: 64px/);
  assert.match(responsive, /\.sn-side\.collapsed \+ \.sn-main,[\s\S]*width: calc\(100% - var\(--sn-v23-rail\)\) !important/);
  assert.match(responsive, /\.nara-composer-tools[\s\S]*display: flex !important/);
  assert.match(responsive, /\.nara-assistant-layer[\s\S]*z-index: 2147483600 !important/);
  assert.match(responsive, /\.nara-floating-button[\s\S]*display: grid !important/);
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
