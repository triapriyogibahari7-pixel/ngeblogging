import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const studio = read("src/StudioNext.jsx");
const entry = read("src/Studio.jsx");
const device = read("src/studio-device-mode-v140.js");
const shell = read("src/studio-shell-controller-v147.js");
const nara = read("src/nara-size-authority-v144.js");
const css = read("src/studio-interface-authority-v147.css");

test("required Studio navigation remains complete", () => {
  const labels = [
    "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media",
    "Analitik", "Anggota", "Komentar", "Domain", "API Keys",
    "Pengaturan", "Keluar",
  ];
  for (const label of labels) assert.ok(studio.includes(label), `${label} harus tetap ada`);
});

test("six responsive families and large-screen variants remain declared", () => {
  const modes = ["application", "phone", "mobile", "compact", "tablet", "desktop"];
  for (const mode of modes) assert.ok(device.includes(`"${mode}"`));
  assert.ok(device.includes('"laptop"'));
  assert.ok(device.includes('"computer"'));
  assert.ok(device.includes("interactive-widget=resizes-content"));
});

test("sidebar contracts remain present", () => {
  assert.ok(css.includes("width:min(82vw,360px)!important"));
  assert.ok(css.includes("--sn-v147-sidebar-open"));
  assert.ok(css.includes("--sn-v147-sidebar-closed"));
  assert.ok(css.includes("sn-sidebar-edge-toggle-v147"));
});

test("profile dropdown and Nara window modes remain present", () => {
  for (const label of [">Profil<", ">Pengaturan<", ">Keluar<"]) assert.ok(shell.includes(label));
  for (const size of ["small", "medium", "full"]) assert.ok(nara.includes(`"${size}"`));
  for (const label of ["Kecil", "Medium", "Penuh", "Instan", "Sedang", "Tinggi"]) assert.ok(nara.includes(label));
  assert.ok(nara.includes("speechSynthesis"));
  assert.ok(nara.includes("nara-speech-action-v147"));
});

test("v147 stylesheet loads after the previous authority", () => {
  const previous = entry.lastIndexOf('import "./studio-layout-authority-v145.css"');
  const current = entry.lastIndexOf('import "./studio-interface-authority-v147.css"');
  assert.ok(previous >= 0);
  assert.ok(current > previous);
});

test("interface stylesheet blocks are balanced", () => {
  const opening = (css.match(/{/g) || []).length;
  const closing = (css.match(/}/g) || []).length;
  assert.equal(opening, closing);
});
