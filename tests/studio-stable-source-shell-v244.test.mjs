import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const legacyRuntime = read("src/studio-stable-shell-v244.js");
const legacyCss = read("src/studio-stable-shell-v244-final.css");
const v248 = read("src/studio-regression-guard-v248.js");
const studio = read("src/StudioNext.jsx");

const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v244 files remain as backup but the duplicate chrome is no longer active", () => {
  assert.doesNotMatch(entry, /studio-stable-shell-v244\.js/);
  assert.doesNotMatch(entry, /studio-stable-shell-v244-final\.css/);
  assert.match(legacyRuntime, /ngeblogging-studio-chrome-v244/);
  assert.match(legacyCss, /v244/);
  assert.match(v248, /document\.getElementById\("ngeblogging-studio-chrome-v244"\)\?\.remove\(\)/);
});

test("React keeps every required menu after v244 retirement", () => {
  for (const label of menu) assert.ok(studio.includes(label), `missing ${label}`);
});

test("v248 explicitly preserves v234-v242 rather than replacing product features", () => {
  for (const marker of ["studio-production-v234.js","studio-production-v235-widget-target.js","studio-react-safe-v240.js","studio-visual-stability-v241.js","studio-shell-rescue-v242.js","studio-regression-guard-v248.js"])
    assert.ok(entry.includes(marker), `missing ${marker}`);
});
