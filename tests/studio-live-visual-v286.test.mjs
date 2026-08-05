import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v286 live visual authority is reachable from active v285 runtime", async () => {
  const runtime = await read("src/studio-responsive-lock-v285.js");
  const next = await read("src/studio-live-visual-v286.js");
  const css = await read("src/studio-live-visual-v286.css");
  assert.match(runtime, /import\("\.\/studio-live-visual-v286\.js"\)/);
  assert.match(next, /studio-live-visual-v286-20260805/);
  assert.match(css, /data-v286-family="large"/);
  assert.match(css, /data-v286-family="small"/);
});

test("v286 preserves required Studio controls and non-modal Nara", async () => {
  const studio = await read("src/StudioNext.jsx");
  const nara = await read("src/NaraAssistant.jsx");
  const css = await read("src/studio-live-visual-v286.css");
  for (const label of ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"]) assert.ok(studio.includes(label), `missing ${label}`);
  for (const label of ["Kamera","Foto","File","Nara Mini","Nara Writer","Nara Vision","Nara Max","Instan","Sedang","Tinggi"]) assert.ok(nara.includes(label), `missing ${label}`);
  assert.match(css, /nara-floating-button\{position:fixed!important/);
  assert.match(css, /data-v286-interaction="nonmodal"/);
  assert.match(css, /nara-attachment-menu/);
});

test("v286 keeps theme code editor and layout map responsive", async () => {
  const theme = await read("src/ThemeStudio.jsx");
  const themeSystem = await read("src/theme-system.js");
  const layout = await read("src/studio-theme-layout-v264.js");
  const css = await read("src/studio-live-visual-v286.css");
  assert.match(theme, /THEME_COUNT/);
  assert.match(themeSystem, /THEME_COUNT/);
  assert.match(layout, /AREAS/);
  assert.match(css, /tn-layout-map-v264/);
  assert.match(css, /grid-template-areas:"code preview"/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
});

test("v286 does not add destructive auth behavior", async () => {
  const runtime = await read("src/studio-live-visual-v286.js");
  const auth = await read("src/lib/supabase.js");
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/);
});
