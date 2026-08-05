import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v302 retires the v271 Nara component observer that broke Vite bundling", async () => {
  const nara = await read("src/NaraAssistant.jsx");
  assert.doesNotMatch(nara, /NARA_GLOBAL_AUTHORITY_V271/);
  assert.doesNotMatch(nara, /new MutationObserver/);
  assert.doesNotMatch(nara, /observer\?\.observe/);
  assert.doesNotMatch(nara, /<style data-nara-global-authority-v271>/);
});

test("v302 preserves Nara attachment, voice, model and intelligence functions", async () => {
  const nara = await read("src/NaraAssistant.jsx");
  for (const marker of [
    "Kamera",
    "Foto",
    "File teks",
    "cameraInput.current?.click()",
    "imageInput.current?.click()",
    "fileInput.current?.click()",
    "SpeechRecognition",
    "speechSynthesis",
    "nara-mini",
    "nara-writer",
    "nara-vision",
    "nara-max",
    "Instan",
    "Sedang",
    "Tinggi",
    "Maksimal",
    "requestModel",
    "requestIntelligence",
    "/api/nara",
  ]) assert.ok(nara.includes(marker), `missing Nara function: ${marker}`);
});

test("v298-v301 remain the single responsive interaction authority for Nara", async () => {
  const [runtime, css, hardLock] = await Promise.all([
    read("src/studio-shell-authority-v298.js"),
    read("src/studio-shell-authority-v298.css"),
    read("src/studio-sidebar-hard-lock-v301.js"),
  ]);
  assert.match(runtime, /function normalizeNaraState\(\)/);
  assert.match(runtime, /layer\.dataset\.naraInteraction = full \? "modal" : "nonmodal"/);
  assert.match(runtime, /document\.body\.classList\.remove\("nara-fullscreen-open-v148"/);
  assert.match(css, /\.nara-assistant-layer\[data-nara-interaction="nonmodal"\]/);
  assert.match(css, /\.nara-attachment-menu\{display:grid!important;position:absolute!important/);
  assert.match(hardLock, /function pinSupportingSurfaces\(\)/);
  assert.match(hardLock, /important\(nara, "position", "fixed"\)/);
  assert.match(hardLock, /important\(nara, "animation", "none"\)/);
});

test("v302 keeps Nara size choices and explicit close control", async () => {
  const nara = await read("src/NaraAssistant.jsx");
  assert.match(nara, /\["small", "medium", "full"\]/);
  assert.match(nara, /title="Percakapan baru"/);
  assert.match(nara, /title="Tutup"/);
  assert.match(nara, /nara-auto-voice-v148/);
});
