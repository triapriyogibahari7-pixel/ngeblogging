import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v287 is loaded after v286 and retires the old profile capture owner", async () => {
  const v286 = await read("src/studio-live-visual-v286.js");
  const bridge = await read("src/studio-sidebar-single-toggle-v267.js");
  const runtime = await read("src/studio-react-shell-v287.js");
  assert.match(v286, /import\("\.\/studio-react-shell-v287\.js"\)/);
  assert.match(runtime, /studio-react-shell-v287-20260805/);
  assert.match(bridge, /backup: import "\.\/studio-profile-menu-v268\.js"/);
  assert.doesNotMatch(bridge.split("\n").filter((line) => !line.trim().startsWith("//")).join("\n"), /studio-profile-menu-v268\.js/);
});

test("v287 owns one n interaction and a five-item profile menu", async () => {
  const runtime = await read("src/studio-react-shell-v287.js");
  const css = await read("src/studio-react-shell-v287.css");
  for (const label of ["Profil", "Tambahkan situs", "Pengaturan", "Nara AI", "Keluar"]) assert.ok(runtime.includes(label), `missing ${label}`);
  assert.match(runtime, /#ngeblogging-studio-sidebar \.sn-logo-mark/);
  assert.match(runtime, /reactToggle\(\)/);
  assert.doesNotMatch(runtime, /stopImmediatePropagation/);
  assert.match(css, /data-device-mode="large"/);
  assert.match(css, /data-device-mode="small"/);
  assert.match(css, /sn-profile-menu-v287/);
});

test("v287 keeps Nara non-modal and responsive Theme Studio geometry", async () => {
  const css = await read("src/studio-react-shell-v287.css");
  const nara = await read("src/NaraAssistant.jsx");
  for (const label of ["Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) assert.ok(nara.includes(label), `missing ${label}`);
  assert.match(css, /nara-floating-button\{position:fixed!important/);
  assert.match(css, /data-nara-interaction="nonmodal"/);
  assert.match(css, /nara-attachment-menu/);
  assert.match(css, /tn-layout-map-v264/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
  assert.match(css, /grid-template-areas:"code preview"/);
});

test("v287 preserves auth persistence and does not add destructive logout", async () => {
  const runtime = await read("src/studio-react-shell-v287.js");
  const auth = await read("src/lib/supabase.js");
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/);
});
