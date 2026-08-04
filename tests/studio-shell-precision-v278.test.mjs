import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const retired = read("src/studio-sidebar-recovery-v276.js");
const runtime = read("src/studio-shell-precision-v278.js");
const css = read("src/studio-shell-precision-v278.css");
const studio = read("src/StudioNext.jsx");
const profile = read("src/studio-profile-menu-v268.js");
const nara = read("src/NaraAssistant.jsx");
const themes = read("src/theme-catalog.js");
const widgets = read("src/widget-system.js");
const layout = read("src/studio-theme-layout-v264.js");
const auth = read("src/lib/supabase.js");

const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v278 loads last and retires the competing v276 capture listener", () => {
  assert.ok(entry.indexOf('import "./studio-shell-precision-v278.js";') > entry.indexOf('import "./studio-interaction-authority-v277.css";'));
  assert.ok(entry.indexOf('import "./studio-shell-precision-v278.css";') > entry.indexOf('import "./studio-shell-precision-v278.js";'));
  assert.match(runtime, /studio-shell-precision-v278-20260804/);
  assert.doesNotMatch(retired, /document\.addEventListener\("click",\s*activateLogo/);
  assert.doesNotMatch(retired, /new MutationObserver/);
  assert.match(runtime, /window\.addEventListener\("pointerdown",\s*stopLegacyPointer,\s*true\)/);
  assert.match(runtime, /window\.addEventListener\("click",\s*activateLogo,\s*true\)/);
});

test("sidebar has all mandatory items and both large/small geometries", () => {
  for (const label of menu) assert.ok(studio.includes(label), `missing sidebar item ${label}`);
  assert.match(css, /data-device-mode="large"[\s\S]*#ngeblogging-studio-sidebar\.collapsed/);
  assert.match(css, /collapsed[\s\S]*--v278-side-rail/);
  assert.match(css, /data-device-mode="small"[\s\S]*#ngeblogging-studio-sidebar:not\(\.mobile-open\)/);
  assert.match(css, /mobile-open[\s\S]*height:100dvh!important/);
  assert.match(css, /\.sn-logo-mark strong[\s\S]*place-items:center!important/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*background:transparent!important/);
});

test("profile and Nara remain usable without a modal lock in small/medium", () => {
  for (const action of ["Profil","Tambahkan situs","Pengaturan","Nara AI","Keluar"]) assert.ok(profile.includes(action));
  assert.match(css, /\.sn-top \.sn-avatar[\s\S]*visibility:visible!important/);
  assert.match(css, /\.nara-floating-button[\s\S]*position:fixed!important/);
  assert.match(css, /data-nara-interaction="nonmodal"[\s\S]*pointer-events:none!important/);
  assert.match(css, /\.nara-attachment-menu[\s\S]*bottom:calc\(100% \+ 8px\)!important/);
  assert.match(nara, /cameraInput\.current\?\.click\(\)/);
  assert.match(nara, /imageInput\.current\?\.click\(\)/);
  assert.match(nara, /fileInput\.current\?\.click\(\)/);
  assert.match(nara, /SpeechRecognition/);
  assert.match(nara, /speechSynthesis/);
});

test("Theme Studio keeps 100 themes, 26 widgets, centered post and responsive code preview", () => {
  const families = [...themes.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themes.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.equal([...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length, 26);
  for (const area of ["sidebar-left-1","sidebar-left-2","sidebar-left-3","sidebar-left-4","sidebar-right-1","sidebar-right-2","sidebar-right-3","sidebar-right-4"]) assert.ok(layout.includes(area));
  assert.match(css, /grid-template-areas:"code preview"!important/);
  assert.match(css, /grid-template-areas:"preview" "code"!important/);
  assert.match(css, /\.tn-layout-content-v264[\s\S]*grid-template-columns/);
  assert.match(runtime, /data-max-lines", "10000/);
});

test("v278 keeps persisted authentication non-destructive", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.doesNotMatch(runtime, /signOut\(|localStorage\.clear|sessionStorage\.clear|location\.reload\(/);
});
