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

test("v291 leaves one repeatable sidebar n interaction owner", async () => {
  const legacy = await read("src/studio-react-shell-v287.js");
  const native = await read("src/studio-native-controls-v290.js");
  assert.match(legacy, /Sidebar n ownership was retired in v291/);
  assert.doesNotMatch(legacy, /const reactToggle/);
  assert.match(native, /function nativeToggle\(event\)/);
  assert.match(native, /document\.addEventListener\("click", nativeToggle, true\)/);
  assert.match(native, /nativeToggleKeyboard/);
  assert.match(native, /v291SingleOwnerToggle/);
  assert.doesNotMatch(native, /pointerdown|immediateNativeToggle|toggle\.disabled\s*=\s*true|muteTimer/);
});

test("v291 keeps the six responsive modes, fixed Nara and full feature sources", async () => {
  const device = await read("src/studio-device-mode-v140.js");
  const css = await read("src/studio-native-controls-v290.css");
  const nara = await read("src/NaraAssistant.jsx");
  const theme = await read("src/ThemeStudio.jsx");
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) assert.ok(device.includes(`"${mode}"`), `missing ${mode}`);
  assert.match(css, /\.nara-floating-button\{/);
  assert.match(css, /position:fixed!important/);
  assert.match(css, /data-nara-interaction="nonmodal"/);
  for (const label of ["Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) assert.ok(nara.includes(label), `missing ${label}`);
  assert.match(theme, /100/);
  assert.match(theme, /HTML/);
  assert.match(theme, /CSS/);
  assert.match(theme, /JavaScript/);
});

test("v291 rotates service worker without forced logout or reload", async () => {
  const patch = await read("scripts/patch-service-worker-v291.mjs");
  const release = await read("public/release-v291.json");
  assert.match(patch, /studio-auth-sidebar-v291-20260805/);
  assert.match(patch, /studio-auth-sidebar-cache-v291/);
  assert.match(patch, /NGE_BLOGGING_UPDATE_AVAILABLE_V291/);
  assert.match(release, /studio-auth-sidebar-v291-20260805/);
  assert.doesNotMatch(patch, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
});
