import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const studio = readFileSync("src/Studio.jsx", "utf8");
const runtime = readFileSync("src/studio-interface-v148.js", "utf8");
const css = readFileSync("src/studio-interface-v148.css", "utf8");
const next = readFileSync("src/StudioNext.jsx", "utf8");
const nara = readFileSync("src/NaraAssistant.jsx", "utf8");

const menuLabels = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];

const responsiveModes = ["application", "phone", "mobile", "compact", "tablet", "desktop"];

test("Studio imports the v148 authority after legacy layers", () => {
  assert.match(studio, /studio-interface-v148\.js/);
  assert.match(studio, /studio-interface-v148\.css/);
  assert.ok(studio.indexOf("studio-interface-authority-v147.css") < studio.indexOf("studio-interface-v148.css"));
});

test("all requested sidebar entries remain React-owned and are protected", () => {
  for (const label of menuLabels) {
    assert.ok(next.includes(`>${label}<`) || runtime.includes(`"${label}"`), `missing ${label}`);
  }
  assert.match(runtime, /menuComplete/);
  assert.doesNotMatch(runtime, /\.remove\(\).*sn-side|sn-side.*\.remove\(/);
});

test("six responsive surfaces and laptop-computer variants are represented", () => {
  for (const mode of responsiveModes) assert.ok(runtime.includes(`${mode}:`) || runtime.includes(`"${mode}"`), `missing ${mode}`);
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop", "laptop", "computer"]) {
    assert.ok(css.includes(mode), `CSS missing ${mode}`);
  }
});

test("Nara keeps attachments, microphone, models, intelligence and adds stable sizing plus voice", () => {
  for (const marker of ["cameraInput", "imageInput", "fileInput", "startVoice", "modelOptions", "intelligenceOptions"]) {
    assert.ok(nara.includes(marker), `Nara feature missing ${marker}`);
  }
  for (const size of ["small", "medium", "full"]) assert.ok(runtime.includes(`"${size}"`), `size missing ${size}`);
  assert.match(runtime, /NARA_SIZE_KEY/);
  assert.match(runtime, /NARA_VOICE_KEY/);
  assert.match(css, /nara-assistant-shell\[data-nara-size="full"\]/);
});

test("mobile page and theme code-preview layouts cannot overflow the viewport", () => {
  assert.match(css, /overflow-x:clip/);
  assert.match(css, /grid-template-rows:minmax\(320px,1fr\) minmax\(320px,1fr\)/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
});

test("authority styles have balanced blocks", () => {
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);
});
