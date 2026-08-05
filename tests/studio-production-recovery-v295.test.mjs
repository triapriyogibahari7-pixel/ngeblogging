import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v295 keeps one n owner and removes the production v290 pointerdown freeze", async () => {
  const native = await read("src/studio-native-controls-v290.js");
  assert.match(native, /function nativeToggle\(event\)/);
  assert.match(native, /document\.addEventListener\("click", nativeToggle, true\)/);
  assert.doesNotMatch(native, /pointerdown|immediateNativeToggle|muteTimer|toggle\.disabled\s*=\s*true/);
  assert.match(native, /studio-polish-v295\.js/);
});

test("v295 profile menu is separate from settings and only logs out explicitly", async () => {
  const runtime = await read("src/studio-polish-v295.js");
  for (const marker of ["Profil & avatar", "Tambah situs", "Ganti situs", "Pengaturan", "Bantuan Nara", "Keluar"])
    assert.match(runtime, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(runtime, /action === "logout"/);
  assert.match(runtime, /menuButton\("keluar"\)\?\.click\(\)/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
});

test("v295 mobile drawer stays interactive and Nara small medium stay non-modal", async () => {
  const css = await read("src/studio-polish-v295.css");
  assert.match(css, /\.sn-side-backdrop,body\.sn-mobile-sidebar-open \.sn-side-backdrop\{display:none!important/);
  assert.match(css, /#ngeblogging-studio-sidebar:not\(\.mobile-open\)/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open/);
  assert.match(css, /\.nara-assistant-layer\[data-nara-interaction="nonmodal"\]/);
  assert.match(css, /\.nara-assistant-shell\[data-nara-size="small"\]/);
  assert.match(css, /\.nara-assistant-shell\[data-nara-size="medium"\]/);
  assert.match(css, /\.nara-attachment-menu\{/);
  assert.match(css, /bottom:calc\(100% \+ 8px\)!important/);
  assert.doesNotMatch(css, /animation:[^;]*(blink|pulse)/i);
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
