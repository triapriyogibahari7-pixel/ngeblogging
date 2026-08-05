import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v287 is chained after v286 and owns final responsive stability", async () => {
  const v286 = await read("src/studio-live-visual-v286.js");
  const runtime = await read("src/studio-stable-ui-v287.js");
  const css = await read("src/studio-stable-ui-v287.css");

  assert.match(v286, /import\("\.\/studio-stable-ui-v287\.js"\)/);
  assert.match(runtime, /studio-stable-ui-v287-20260805/);
  assert.match(runtime, /stableFamily\(\)/);
  assert.match(runtime, /dataset\.studioDeviceMode/);
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) {
    assert.match(runtime, new RegExp(`"${mode}"`));
  }

  assert.match(css, /data-v287-family="large"/);
  assert.match(css, /data-v287-family="small"/);
  assert.match(css, /--v287-side-open:252px/);
  assert.match(css, /--v287-side-rail:76px/);
  assert.match(css, /\.nara-floating-button\{position:fixed!important/);
  assert.match(css, /\.nara-floating-button>b,\.nara-floating-button>small\{display:none!important/);
  assert.match(css, /grid-template-areas:"code preview"/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
});

test("v287 keeps one internal n, complete navigation, and five-function profile menu", async () => {
  const runtime = await read("src/studio-stable-ui-v287.js");
  const studio = await read("src/StudioNext.jsx");
  const css = await read("src/studio-stable-ui-v287.css");

  assert.match(runtime, /\.sn-logo-mark/);
  assert.match(runtime, /letter\.textContent = "n"/);
  assert.match(css, /\.sn-main>\.sn-top>\.sn-sidebar-toggle/);
  for (const label of ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"]) {
    assert.ok(studio.includes(label), `Navigation label missing: ${label}`);
  }
  for (const action of ["profile", "add-site", "view-site", "settings", "logout"]) {
    assert.ok(runtime.includes(`data-v287-profile-action="${action}"`), `Profile action missing: ${action}`);
  }
  assert.match(runtime, /event\.stopPropagation\(\)/);
});

test("Nara controls are real and v287 keeps small/medium non-modal", async () => {
  const nara = await read("src/NaraAssistant.jsx");
  const runtime = await read("src/studio-stable-ui-v287.js");
  const css = await read("src/studio-stable-ui-v287.css");

  for (const marker of ["Kamera", "Foto", "File teks", "SpeechRecognition", "webkitSpeechRecognition", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal", "/api/nara"]) {
    assert.ok(nara.includes(marker), `Nara marker missing: ${marker}`);
  }
  assert.match(nara, /model:\s*requestModel/);
  assert.match(nara, /intelligence:\s*requestIntelligence/);
  assert.match(runtime, /full \? "modal" : "nonmodal"/);
  assert.match(css, /data-v287-interaction="nonmodal"/);
  assert.match(css, /pointer-events:none!important/);
  assert.match(css, /\.nara-attachment-menu\{display:grid!important/);
});

test("Theme Studio retains 100 themes, eight preview profiles, 26-slot map and code editor", async () => {
  const themeStudio = await read("src/ThemeStudio.jsx");
  const layout = await read("src/studio-theme-layout-v264.js");
  const controls = await read("src/studio-native-polish-v284.js");
  const catalog = await import(new URL("../src/theme-catalog.js", import.meta.url));

  for (const label of ["Aplikasi", "Handphone", "Mobile", "Perangkat kecil", "Tablet", "Laptop", "Situs desktop", "Komputer"]) {
    assert.ok(themeStudio.includes(label), `Preview profile missing: ${label}`);
  }
  assert.match(themeStudio, /THEME_COUNT/);
  assert.equal(catalog.THEME_COUNT, 100);
  for (const area of ["sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4", "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4", "before-content", "after-content"]) {
    assert.ok(layout.includes(area), `Layout area missing: ${area}`);
  }
  assert.match(layout, /Semua 26 widget/);
  assert.match(layout, /Edit HTML \/ CSS \/ JavaScript/);
  assert.match(controls, /MAX_CODE_LINES = 10000/);
});

test("authentication persistence remains production-safe", async () => {
  const runtime = await read("src/studio-stable-ui-v287.js");
  const auth = await read("src/lib/supabase.js");

  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /production-public-fallback/);
  assert.match(auth, /directAuthFirstV263/);
  assert.match(auth, /signInWithPassword/);
  assert.match(auth, /signInWithProvider/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/);
});
