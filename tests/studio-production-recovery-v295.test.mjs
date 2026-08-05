import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v298 retires v290 capture and v295 global click normalization while preserving visuals", async () => {
  const [native, v298] = await Promise.all([
    read("src/studio-native-controls-v290.js"),
    read("src/studio-shell-authority-v298.js"),
  ]);
  assert.match(native, /studio-native-capture-retired-v298-20260805/);
  assert.match(native, /studio-shell-authority-v298\.js/);
  assert.doesNotMatch(native, /function nativeToggle\s*\(|document\.addEventListener\("click",\s*nativeToggle|pointerdown|immediateNativeToggle|muteTimer|toggle\.disabled\s*=\s*true/);
  assert.doesNotMatch(native, /import\("\.\/studio-polish-v295\.js"\)/);
  assert.match(v298, /import "\.\/studio-polish-v295\.css"/);
  assert.match(v298, /studio-profile-menu-v298-20260805/);
});

test("v295 source profile menu remains as backup and only logs out explicitly", async () => {
  const runtime = await read("src/studio-polish-v295.js");
  for (const marker of ["Profil & avatar", "Tambah situs", "Ganti situs", "Pengaturan", "Bantuan Nara", "Keluar"])
    assert.match(runtime, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(runtime, /action === "logout"/);
  assert.match(runtime, /menuButton\("keluar"\)\?\.click\(\)/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
});

test("v295 visual CSS remains available while v298 owns nonblocking geometry", async () => {
  const [css, v298css] = await Promise.all([
    read("src/studio-polish-v295.css"),
    read("src/studio-shell-authority-v298.css"),
  ]);
  assert.match(css, /\.sn-profile-menu-v295/);
  assert.match(css, /\.nara-assistant-layer\[data-nara-interaction="nonmodal"\]/);
  assert.match(v298css, /\.sn-side-backdrop,body\.sn-mobile-sidebar-open \.sn-side-backdrop\{display:none!important/);
  assert.match(v298css, /\.nara-assistant-layer\[data-nara-interaction="nonmodal"\]/);
  assert.match(v298css, /\.nara-attachment-menu\{display:grid!important;position:absolute!important/);
  assert.match(v298css, /bottom:calc\(100% \+ 8px\)!important/);
  assert.doesNotMatch(v298css, /animation:[^;]*(blink|pulse)/i);
});

test("v295 preserves six responsive modes, v292 auth persistence, v293 theme and editor contracts", async () => {
  const [device, auth, v293, release] = await Promise.all([
    read("src/studio-device-mode-v140.js"),
    read("src/lib/supabase.js"),
    read("src/studio-final-authority-v293.js"),
    read("public/release-v295.json"),
  ]);
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) assert.match(device, new RegExp(`"${mode}"`));
  for (const marker of ["persistSession: true", "autoRefreshToken: true", 'appUrl("/?auth=callback")']) assert.match(auth, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const marker of ["studio-theme-layout-v264.css", "CONTENT_WORD_LIMIT = 5_000", "CODE_LINE_LIMIT = 10_000"]) assert.match(v293, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(release, /"themeCatalog100Preserved": true/);
  assert.match(release, /"themeLayout26AreaPreserved": true/);
  assert.match(release, /"capacityClaimed": false/);
  assert.match(release, /"realDeviceMatrixClaimed": false/);
});
