import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const activeImports = (source) => source.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("import "));

test("v287 is loaded after v286 and retires legacy capture owners", async () => {
  const v286 = await read("src/studio-live-visual-v286.js");
  const bridge = await read("src/studio-sidebar-single-toggle-v267.js");
  const runtime = await read("src/studio-react-shell-v287.js");
  assert.match(v286, /import\("\.\/studio-react-shell-v287\.js"\)/);
  assert.match(runtime, /studio-react-shell-v287-20260805/);
  assert.match(bridge, /backup: import "\.\/studio-profile-menu-v268\.js"/);
  assert.doesNotMatch(bridge.split("\n").filter((line) => !line.trim().startsWith("//")).join("\n"), /studio-profile-menu-v268\.js/);
  assert.doesNotMatch(runtime, /stopImmediatePropagation/);
});

test("v287 retires stacked shell/Nara observers and the v208 hard reload", async () => {
  const entry = await read("src/Studio.jsx");
  const imports = new Set(activeImports(entry));
  for (const legacy of [
    'import "./nara-size-authority-v144.js";',
    'import "./studio-interface-v148.js";',
    'import "./studio-recovery-v150.js";',
    'import "./studio-screenshot-stability-v177.js";',
    'import "./studio-finalization-v178.js";',
    'import "./studio-mobile-runtime-v179.js";',
    'import "./studio-production-mobile-v189-account.js";',
    'import "./studio-mobile-flicker-v200.js";',
    'import "./studio-production-v201.js";',
    'import "./studio-production-v202.js";',
    'import "./studio-production-v203.js";',
    'import "./studio-production-v204.js";',
    'import "./studio-production-v205.js";',
    'import "./studio-production-v205-hotfix.js";',
    'import "./studio-production-v207.js";',
    'import "./studio-production-v208.js";',
    'import "./studio-production-v209.js";',
    'import "./studio-production-v210.js";',
    'import "./studio-production-v222.js";',
    'import "./studio-production-v231.js";',
    'import "./studio-production-v232.js";',
    'import "./studio-production-v234.js";',
  ]) assert.equal(imports.has(legacy), false, `${legacy} must stay retired`);

  const recovery = await read("src/studio-production-v206.js");
  assert.match(recovery, /studio-auth-recovery-v287-20260805/);
  assert.doesNotMatch(recovery, /new MutationObserver/);
  assert.doesNotMatch(recovery, /location\.(reload|replace)\s*\(/);
});

test("v287 owns one n interaction and a viewport-safe profile menu", async () => {
  const runtime = await read("src/studio-react-shell-v287.js");
  const css = await read("src/studio-react-shell-v287.css");
  for (const label of ["Profil", "Ganti avatar", "Tambahkan situs", "Pengaturan", "Nara AI", "Keluar"]) assert.ok(runtime.includes(label), `missing ${label}`);
  assert.match(runtime, /__ngebloggingOpenAvatarPicker/);
  assert.match(runtime, /#ngeblogging-studio-sidebar \.sn-logo-mark/);
  assert.match(runtime, /reactToggle\(\)/);
  assert.match(css, /data-device-mode="large"/);
  assert.match(css, /data-device-mode="small"/);
  assert.match(css, /sn-profile-menu-v287/);
  assert.match(css, /collapsed~\.sn-main/);
});

test("v287 keeps Nara native, non-modal and responsive", async () => {
  const css = await read("src/studio-react-shell-v287.css");
  const nara = await read("src/NaraAssistant.jsx");
  const legacy = await read("src/nara-controls-v135.js");
  for (const label of ["Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) assert.ok(nara.includes(label), `missing ${label}`);
  assert.match(css, /nara-floating-button\{position:fixed!important/);
  assert.match(css, /data-nara-interaction="nonmodal"/);
  assert.match(css, /nara-attachment-menu/);
  assert.match(legacy, /nara-controls-v135-compat-v287-20260805/);
  assert.doesNotMatch(legacy, /new MutationObserver|createElement\("button"\)|nara-fullscreen-v135/);
});

test("v287 keeps responsive Theme Studio geometry", async () => {
  const css = await read("src/studio-react-shell-v287.css");
  assert.match(css, /tn-layout-map-v264/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
  assert.match(css, /grid-template-areas:"code preview"/);
});

test("v287 retains avatar upload without the old drawer/Nara observer", async () => {
  const avatar = await read("src/studio-mobile-stability-v176.js");
  assert.match(avatar, /studio-profile-avatar-compat-v287-20260805/);
  assert.match(avatar, /squareAvatarBlob/);
  assert.match(avatar, /site-public-media/);
  assert.match(avatar, /__ngebloggingOpenAvatarPicker/);
  assert.doesNotMatch(avatar, /new MutationObserver/);
  assert.doesNotMatch(avatar, /syncDrawer|syncNara/);
});

test("v287 default build does not replay historical UI patchers", async () => {
  const pkg = JSON.parse(await read("package.json"));
  assert.match(pkg.scripts.build, /patch-service-worker-v287\.mjs/);
  assert.doesNotMatch(pkg.scripts.build, /patch-studio-mobile-v176|patch-nara-native-v177|run-patch-screenshot-stability-v177/);
  assert.doesNotMatch(pkg.scripts["test:production"], /run-patch-screenshot-stability-v177|patch-studio-mobile-v176/);
});

test("v287 preserves auth persistence and does not add destructive logout", async () => {
  const runtime = await read("src/studio-react-shell-v287.js");
  const recovery = await read("src/studio-production-v206.js");
  const auth = await read("src/lib/supabase.js");
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  for (const source of [runtime, recovery]) assert.doesNotMatch(source, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(|location\.replace\s*\(/);
});
