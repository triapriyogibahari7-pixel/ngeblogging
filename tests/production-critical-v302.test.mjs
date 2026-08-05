import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const REQUIRED_MENU = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v302 keeps the complete sidebar and hard-locks correct small/large geometry", async () => {
  const [studio, lock, css] = await Promise.all([
    read("src/StudioNext.jsx"),
    read("src/studio-sidebar-hard-lock-v301.js"),
    read("src/studio-sidebar-hard-lock-v301.css"),
  ]);
  for (const label of REQUIRED_MENU) assert.ok(studio.includes(label), `sidebar missing ${label}`);
  for (const marker of ["studio-sidebar-hard-lock-v301-20260805", "54px", "78vw", "336px", "220px", "70px", "marginLeft: \"0\"", "width: \"100%\""]) assert.ok(lock.includes(marker), `hard-lock missing ${marker}`);
  assert.match(css, /data-studio-device-mode="small"/);
  assert.match(css, /data-studio-device-mode="large"/);
  assert.match(css, /\.sn-profile-menu-v298/);
});

test("v302 preserves six responsive classifier modes and eight Theme preview labels", async () => {
  const [device, theme] = await Promise.all([
    read("src/studio-device-mode-v140.js"),
    read("src/ThemeStudio.jsx"),
  ]);
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) assert.ok(device.includes(`"${mode}"), `mode missing ${mode}`);
  for (const label of ["Aplikasi","Handphone","Mobile","Perangkat kecil","Tablet","Laptop","Situs desktop","Komputer"]) assert.ok(theme.includes(label), `preview missing ${label}`);
});

test("v302 preserves persistent auth and v292 startup without destructive redirects", async () => {
  const [auth, startup, gate] = await Promise.all([
    read("src/lib/supabase.js"),
    read("src/studio-startup-v292.js"),
    read("src/StudioOnboardingGate.jsx"),
  ]);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /appUrl\("\/\?auth=callback"\)/);
  assert.match(startup, /window\.__ngebloggingVerifiedSession = verified/);
  assert.match(startup, /\/rest\/v1\/site_members/);
  assert.match(gate, /STARTUP_DATA_TIMEOUT_MS = 11_000/);
  for (const source of [startup, gate]) assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
});

test("v302 removes the Nara v271 build breaker while retaining all requested controls", async () => {
  const [nara, shell] = await Promise.all([
    read("src/NaraAssistant.jsx"),
    read("src/studio-shell-authority-v298.js"),
  ]);
  assert.doesNotMatch(nara, /NARA_GLOBAL_AUTHORITY_V271|new MutationObserver|observer\?\.observe/);
  for (const marker of ["Kamera","Foto","File teks","SpeechRecognition","speechSynthesis","nara-mini","nara-writer","nara-vision","nara-max","Instan","Sedang","Tinggi","Maksimal","requestModel","requestIntelligence","/api/nara","small", "medium", "full"]) assert.ok(nara.includes(marker), `Nara missing ${marker}`);
  assert.match(shell, /function normalizeNaraState\(\)/);
  assert.match(shell, /layer\.dataset\.naraInteraction = full \? "modal" : "nonmodal"/);
});

test("v302 keeps exactly 100 generated theme variants and 26 real widget definitions", async () => {
  const [catalog, widgets, release] = await Promise.all([
    read("src/theme-catalog.js"),
    read("src/widget-system.js"),
    read("public/release-v296.json"),
  ]);
  const familyCount = [...catalog.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositionCount = [...catalog.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  assert.equal(familyCount, 20);
  assert.equal(compositionCount, 5);
  assert.equal(familyCount * compositionCount, 100);
  assert.equal([...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length, 26);
  assert.match(widgets, /id: "custom-html"/);
  assert.match(release, /"result": 100/);
});

test("v302 preserves shared Post/Page editor, 5000-word publication guard and code-line contract", async () => {
  const [studio, editor, authority] = await Promise.all([
    read("src/StudioNext.jsx"),
    read("src/ContentEditor.jsx"),
    read("src/studio-final-authority-v293.js"),
  ]);
  assert.match(studio, /<ContentEditor doc=\{active\}/);
  for (const marker of ["SEO title", "Meta description", "Focus keyword", "Canonical URL"]) assert.ok(editor.includes(marker) || authority.includes(marker), `editor missing ${marker}`);
  assert.match(authority, /CONTENT_WORD_LIMIT = 5_000/);
  assert.match(authority, /CONTENT_WORD_WARNING = 4_500/);
  assert.match(authority, /CODE_LINE_LIMIT = 10_000/);
  assert.match(authority, /guardPublish/);
});

test("v302 keeps production analytics and public comment mood/reaction contracts", async () => {
  const [analytics, comments] = await Promise.all([
    read("src/studio-analytics-v41.js"),
    read("public/comments-v93.js"),
  ]);
  assert.match(analytics, /DATA PRODUKSI NYATA/);
  assert.match(analytics, /SIMULASI TAMPILAN — BUKAN DATA PRODUKSI/);
  assert.match(comments, /PRIMARY_MOODS = \["😀","😃","😄","😁","😊","😍","🥰","😎","🤩","😂"\]/);
  assert.match(comments, /REACTIONS = \["😀","😊","😍","😂","😮","😢","😡","👍","❤️","🎉"\]/);
  assert.match(comments, /Belum ada komentar\. Jadilah yang pertama membuka diskusi\./);
});

test("v302 never claims untested capacity, device matrix or live deployment", async () => {
  const release = await read("public/release-v302.json");
  assert.match(release, /"cloudflareProductionDeploymentClaimed": false/);
  assert.match(release, /"realDeviceMatrixClaimed": false/);
  assert.match(release, /"capacityClaimed": false/);
  assert.doesNotMatch(release, /900juta|900 juta|100% berhasil/i);
});
