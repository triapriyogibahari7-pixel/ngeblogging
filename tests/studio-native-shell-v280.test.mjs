import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-native-shell-v280.js");
const css = read("src/studio-native-shell-v280.css");
const v279 = read("src/studio-live-shell-v279.js");
const studio = read("src/StudioNext.jsx");
const modes = read("src/studio-device-mode-v140.js");
const profile = read("src/studio-profile-menu-v268.js");
const nara = read("src/NaraAssistant.jsx");
const themes = read("src/theme-catalog.js");
const widgets = read("src/widget-system.js");
const layout = read("src/studio-theme-layout-v264.js");
const auth = read("src/lib/supabase.js");
const domain = read("src/DomainPanelV124.jsx");

const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v280 is the final shell layer and removes scroll-time DOM churn", () => {
  assert.ok(entry.indexOf('import "./studio-native-shell-v280.js";') > entry.indexOf('import "./studio-live-shell-v279.css";'));
  assert.ok(entry.indexOf('import "./studio-native-shell-v280.css";') > entry.indexOf('import "./studio-native-shell-v280.js";'));
  assert.match(runtime, /studio-native-shell-v280-20260804/);
  assert.doesNotMatch(runtime, /addEventListener\("scroll"/);
  assert.doesNotMatch(runtime, /visualViewport\?\.addEventListener\("scroll"/);
  assert.doesNotMatch(v279, /addEventListener\("scroll"/);
  assert.doesNotMatch(v279, /visualViewport\?\.addEventListener\("scroll"/);
  assert.match(runtime, /window\.addEventListener\("ngeblogging:studio-device-mode-change", schedule\)/);
});

test("six responsive classes and complete single sidebar remain intact", () => {
  for (const label of menu) assert.ok(studio.includes(label), `missing sidebar item ${label}`);
  for (const mode of ["application","phone","mobile","compact","tablet","desktop"]) assert.ok(modes.includes(`"${mode}"`));
  assert.match(css, /data-device-mode="small"[\s\S]*#ngeblogging-studio-sidebar:not\(\.mobile-open\)/);
  assert.match(css, /data-device-mode="small"[\s\S]*#ngeblogging-studio-sidebar\.mobile-open/);
  assert.match(css, /data-device-mode="large"[\s\S]*#ngeblogging-studio-sidebar\.collapsed/);
  assert.match(css, /--v280-side-rail:72px/);
  assert.match(css, /\.sn-logo-mark strong[\s\S]*place-items:center!important/);
  assert.match(css, /\.sn-side-close[\s\S]*pointer-events:none!important/);
  assert.match(css, /\.sn-account-footer[\s\S]*margin-top:auto!important/);
});

test("profile and persisted auth remain real and separate from automatic logout", () => {
  for (const action of ["Profil","Tambahkan situs","Pengaturan","Nara AI","Keluar"]) assert.ok(profile.includes(action));
  assert.match(css, /\.sn-main>\.sn-top \.sn-avatar[\s\S]*visibility:visible!important/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.doesNotMatch(runtime, /signOut\(|localStorage\.clear|sessionStorage\.clear|location\.reload\(/);
});

test("Nara stays fixed, nonmodal and preserves attachments, microphone, speaker, models and intelligence", () => {
  assert.match(css, /\.nara-floating-button[\s\S]*position:fixed!important/);
  assert.match(css, /data-nara-interaction="nonmodal"[\s\S]*pointer-events:none!important/);
  assert.match(css, /\.nara-attachment-menu[\s\S]*bottom:calc\(100% \+ 9px\)!important/);
  assert.match(nara, /cameraInput\.current\?\.click\(\)/);
  assert.match(nara, /imageInput\.current\?\.click\(\)/);
  assert.match(nara, /fileInput\.current\?\.click\(\)/);
  assert.match(nara, /SpeechRecognition/);
  assert.match(nara, /speechSynthesis/);
  for (const label of ["Nara Mini","Nara Writer","Nara Vision","Nara Max","Instan","Sedang","Tinggi","Maksimal"]) assert.ok(nara.includes(label));
});

test("Theme Studio keeps 100 real variants, 26 areas and 4+4 side slots", () => {
  const families = [...themes.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themes.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.equal([...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length, 26);
  for (const area of ["sidebar-left-1","sidebar-left-2","sidebar-left-3","sidebar-left-4","sidebar-right-1","sidebar-right-2","sidebar-right-3","sidebar-right-4"]) assert.ok(layout.includes(area));
  assert.match(entry, /studio-theme-layout-v264\.js/);
});

test("mobile summary and Domain keep readable responsive actions", () => {
  assert.match(css, /\.sn-metrics[\s\S]*repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.sv124-free-domain>aside[\s\S]*grid-template-columns:1fr!important/);
  assert.match(css, /\.sv124-free-domain>aside :is\(button,a\)[\s\S]*white-space:nowrap!important/);
  assert.match(domain, /Jadikan draf/);
  assert.match(domain, /Terbitkan/);
});
