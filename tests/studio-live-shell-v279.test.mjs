import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-live-shell-v279.js");
const css = read("src/studio-live-shell-v279.css");
const v277Patch = read("scripts/patch-service-worker-v277.mjs");
const v278Patch = read("scripts/patch-service-worker-v278.mjs");
const studio = read("src/StudioNext.jsx");
const profile = read("src/studio-profile-menu-v268.js");
const nara = read("src/NaraAssistant.jsx");
const themes = read("src/theme-catalog.js");
const widgets = read("src/widget-system.js");
const auth = read("src/lib/supabase.js");

const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v279 loads last without adding a second n click owner", () => {
  assert.ok(entry.indexOf('import "./studio-live-shell-v279.js";') > entry.indexOf('import "./studio-shell-precision-v278.css";'));
  assert.ok(entry.indexOf('import "./studio-live-shell-v279.css";') > entry.indexOf('import "./studio-live-shell-v279.js";'));
  assert.match(runtime, /studio-live-shell-v279-20260804/);
  assert.doesNotMatch(runtime, /addEventListener\("click",\s*activateLogo/);
  assert.match(runtime, /window\.addEventListener\("scroll",\s*schedule/);
  assert.match(runtime, /contain", "none"/);
});

test("mobile n, desktop sidebar, profile and Nara remain viewport-fixed", () => {
  for (const label of menu) assert.ok(studio.includes(label), `missing sidebar item ${label}`);
  assert.match(css, /data-device-mode="small"[\s\S]*#ngeblogging-studio-sidebar:not\(\.mobile-open\)[\s\S]*position:fixed!important/);
  assert.match(css, /data-device-mode="large"[\s\S]*#ngeblogging-studio-sidebar[\s\S]*position:fixed!important/);
  assert.match(css, /collapsed[\s\S]*--v279-side-rail/);
  assert.match(css, /\.sn-main>\.sn-top \.sn-avatar[\s\S]*visibility:visible!important/);
  assert.match(css, /\.nara-floating-button[\s\S]*position:fixed!important/);
  assert.match(css, /data-nara-interaction="nonmodal"[\s\S]*pointer-events:none!important/);
  for (const action of ["Profil","Tambahkan situs","Pengaturan","Nara AI","Keluar"]) assert.ok(profile.includes(action));
});

test("Nara attachments and six-mode content foundations are preserved", () => {
  assert.match(nara, /cameraInput\.current\?\.click\(\)/);
  assert.match(nara, /imageInput\.current\?\.click\(\)/);
  assert.match(nara, /fileInput\.current\?\.click\(\)/);
  assert.match(nara, /SpeechRecognition/);
  assert.match(nara, /speechSynthesis/);
  const families = [...themes.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themes.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.equal([...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length, 26);
});

test("service-worker build gate no longer rejects an unused compatibility helper", () => {
  assert.doesNotMatch(v277Patch, /if \(\/refreshStaleWindow\|/);
  assert.doesNotMatch(v278Patch, /if \(\/refreshStaleWindow\|/);
  assert.ok(v277Patch.includes("/await\\s+refreshStaleWindow"));
  assert.ok(v278Patch.includes("/await\\s+refreshStaleWindow"));
  assert.match(v278Patch, /patch-service-worker-v279\.mjs/);
});

test("persisted authentication remains non-destructive", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.doesNotMatch(runtime, /signOut\(|localStorage\.clear|sessionStorage\.clear|location\.reload\(/);
});
