import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const authority = read("src/studio-v14-authority.css");
const responsive = read("src/studio-responsive-v21.css");
const secure = read("src/StudioSecure.jsx");
const sidebar = read("src/studio-sidebar-v21.js");
const commandCenter = read("src/nara-command-center-bridge.js");
const assistant = read("src/NaraAssistant.jsx");

test("v21 responsive authority is the final Studio layout authority", () => {
  assert.match(index, /studio-v14-authority\.css/);
  assert.match(index, /studio-responsive-v21\.css/);
  assert.ok(index.indexOf("studio-responsive-v21.css") > index.indexOf("studio-v14-authority.css"));
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
  ]) assert.doesNotMatch(index, new RegExp(legacy.replaceAll(".", "\\.")));
});

test("native camera image and text inputs never leak into the visible Nara UI", () => {
  const hiddenRule = authority.match(/\[hidden\],[\s\S]*?\.nara-composer input\[type="file"\],[\s\S]*?\}/)?.[0] || "";
  assert.match(hiddenRule, /display: none !important/);
  assert.match(hiddenRule, /visibility: hidden !important/);
  assert.match(hiddenRule, /pointer-events: none !important/);
  assert.doesNotMatch(hiddenRule, /display: block/);
  assert.match(assistant, /ref=\{cameraInput\}/);
  assert.match(assistant, /ref=\{imageInput\}/);
  assert.match(assistant, /ref=\{fileInput\}/);
  assert.match(assistant, /type="file"/);
});

test("closing the phone drawer does not cancel the selected navigation action", () => {
  assert.match(sidebar, /function closeAfterMobileSelection\(event\)/);
  assert.match(sidebar, /requestAnimationFrame\(\(\) => toggle\.click\(\)\)/);
  assert.match(sidebar, /if \(side && toggle && !side\.classList\.contains\("collapsed"\)\)/);
  assert.doesNotMatch(sidebar.match(/function closeAfterMobileSelection[\s\S]*?\n\}/)?.[0] || "", /event\.preventDefault\(\)/);
  assert.doesNotMatch(sidebar.match(/function closeAfterMobileSelection[\s\S]*?\n\}/)?.[0] || "", /event\.stopPropagation\(\)/);
  assert.doesNotMatch(secure, /closeAfterSelection/);
});

test("Studio observers watch mounted nodes without a class-mutation feedback loop", () => {
  assert.match(secure, /new MutationObserver\(sync\)/);
  assert.match(secure, /childList: true, subtree: true/);
  assert.match(sidebar, /new MutationObserver\(\(mutations\) =>/);
  assert.doesNotMatch(secure, /attributeFilter:/);
  assert.doesNotMatch(secure, /attributes: true/);
});

test("mobile layout keeps a compact icon rail and a full-width usable Nara composer", () => {
  assert.match(responsive, /--sn-v21-mobile-rail: 64px/);
  assert.match(responsive, /\.sn-main,[\s\S]*width: calc\(100% - var\(--sn-v21-mobile-rail\)\) !important/);
  assert.match(responsive, /\.nara-composer-tools[\s\S]*grid-template-columns:/);
  assert.match(responsive, /\.nara-assistant-layer[\s\S]*z-index: 2147483100 !important/);
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
