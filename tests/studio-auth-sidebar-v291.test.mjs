import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v291 restores root callback compatibility without losing persistent session", async () => {
  const provider = await read("src/auth-provider-gateway-v250.js");
  const supabase = await read("src/lib/supabase.js");
  assert.match(provider, /auth-provider-navigation-v291-20260805/);
  assert.doesNotMatch(provider, /auth-studio-handoff-v290/);
  assert.match(supabase, /appUrl\("\/\?auth=callback"\)/);
  assert.match(supabase, /appUrl\("\/\?auth=recovery"\)/);
  assert.match(supabase, /persistSession:\s*true/);
  assert.match(supabase, /autoRefreshToken:\s*true/);
  assert.match(supabase, /detectSessionInUrl:\s*false/);
});

test("v291 compatibility now delegates the one repeatable sidebar n owner to v298", async () => {
  const legacy = await read("src/studio-react-shell-v287.js");
  const native = await read("src/studio-native-controls-v290.js");
  const v298 = await read("src/studio-shell-authority-v298.js");
  assert.match(legacy, /Sidebar n ownership was retired in v291/);
  assert.doesNotMatch(legacy, /const reactToggle/);
  assert.match(native, /studio-native-capture-retired-v298-20260805/);
  assert.match(native, /import\("\.\/studio-shell-authority-v298\.js"\)/);
  assert.doesNotMatch(native, /function nativeToggle\s*\(|document\.addEventListener\("click",\s*nativeToggle|nativeToggleKeyboard|v291SingleOwnerToggle/);
  assert.match(v298, /studio-single-n-owner-v298-20260805/);
  assert.match(v298, /function toggleN\(event\)/);
  assert.doesNotMatch(v298, /pointerdown|immediateNativeToggle|toggle\.disabled\s*=\s*true|muteTimer|stopImmediatePropagation/);
});

test("v291 keeps six responsive classes, fixed Nara and full feature sources", async () => {
  const device = await read("src/studio-device-mode-v140.js");
  const css = await read("src/studio-shell-authority-v298.css");
  const nara = await read("src/NaraAssistant.jsx");
  const theme = await read("src/ThemeStudio.jsx");
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) assert.ok(device.includes(`"${mode}"), `missing ${mode}`);
  assert.match(css, /\.nara-floating-button\{position:fixed!important/);
  assert.match(css, /data-nara-interaction="nonmodal"/);
  for (const label of ["Kamera", "Foto", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) assert.ok(nara.includes(label), `missing ${label}`);
  assert.match(theme, /100/);
  assert.match(theme, /HTML/);
  assert.match(theme, /CSS/);
  assert.match(theme, /JavaScript/);
});

test("v291 service-worker compatibility never forces logout or reload", async () => {
  const patch = await read("scripts/patch-service-worker-v291.mjs");
  const release = await read("public/release-v291.json");
  assert.match(patch, /studio-auth-sidebar-v291-20260805/);
  assert.match(patch, /studio-auth-sidebar-cache-v291/);
  assert.match(patch, /NGE_BLOGGING_UPDATE_AVAILABLE_V291/);
  assert.match(release, /studio-auth-sidebar-v291-20260805/);
  assert.doesNotMatch(patch, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
});
