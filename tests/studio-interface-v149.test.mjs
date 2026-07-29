import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const theme = readFileSync("src/ThemeStudio.jsx", "utf8");
const themeCss = readFileSync("src/theme-interface-v149.css", "utf8");
const studio = readFileSync("src/StudioNext.jsx", "utf8");
const nara = readFileSync("src/NaraAssistant.jsx", "utf8");

const requestedDevices = [
  "application", "phone", "mobile", "compact", "tablet", "laptop", "desktop", "computer",
];

const requiredSidebarLabels = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];

test("Theme Studio exposes all requested responsive previews", () => {
  for (const device of requestedDevices) {
    assert.match(theme, new RegExp(`id: \\"${device}\\"`), `missing ${device}`);
  }
  assert.match(theme, /Delapan mode pratinjau perangkat/);
  assert.match(theme, /data-preview-mode/);
  assert.match(themeCss, /--tn-preview-width/);
});

test("layout map and selected-widget checks are real React features", () => {
  assert.match(theme, /function LayoutMap/);
  assert.match(theme, /normalizeWidgetState\(widgets\)/);
  assert.match(theme, /WIDGET TERPILIH/);
  assert.match(theme, /<Check\/>/);
  assert.match(theme, /onOpenWidgets/);
  assert.match(themeCss, /\.tn-layout-canvas/);
});

test("code editor and live preview remain a stable split workspace", () => {
  assert.match(theme, /tn-code-preview-pane/);
  assert.match(theme, /PREVIEW LANGSUNG/);
  assert.match(theme, /onDeviceChange/);
  assert.match(themeCss, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(themeCss, /grid-template-rows:minmax\(340px,1fr\) minmax\(340px,1fr\)/);
});

test("existing Theme Studio functions are preserved", () => {
  for (const marker of ["customize", "code", "widgets", "history", "preview", "importFile", "backup", "saveHtml", "publishThemeDraft", "restoreThemeVersion"]) {
    assert.ok(theme.includes(marker), `missing ${marker}`);
  }
});

test("all sidebar pages remain present", () => {
  for (const label of requiredSidebarLabels) assert.ok(studio.includes(`>${label}<`), `missing ${label}`);
});

test("Nara controls are React-owned without removing attachments, microphone, models or intelligence", () => {
  for (const marker of [
    "cameraInput", "imageInput", "fileInput", "startVoice", "modelOptions", "intelligenceOptions",
    "nara-floating-button", "data-nara-native-size=\"v149\"", "nara-native-size-controls-v149",
    "nara-speech-action-v149", "SpeakerIcon", "Instan", "Sedang", "Tinggi", "Maksimal",
  ]) {
    assert.ok(nara.includes(marker), `missing ${marker}`);
  }
  for (const size of ["small", "medium", "full"]) assert.ok(nara.includes(`\"${size}\"`), `missing Nara size ${size}`);
  assert.match(nara, /writePreference\(NARA_SIZE_KEY/);
  assert.match(nara, /SpeechSynthesisUtterance/);
});

test("v149 stylesheet blocks are balanced", () => {
  assert.equal((themeCss.match(/{/g) || []).length, (themeCss.match(/}/g) || []).length);
});
