import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v292 hands every valid Supabase session to Studio without logging out", async () => {
  const startup = await read("src/studio-startup-v292.js");
  const provider = await read("src/auth-provider-gateway-v250.js");
  const auth = await read("src/lib/supabase.js");
  assert.match(startup, /auth-session-handoff-v292-20260805/);
  assert.match(startup, /window\.__ngebloggingVerifiedSession = verified/);
  assert.match(startup, /ngeblogging:auth-session-ready/);
  assert.match(startup, /SIGNED_IN/);
  assert.match(startup, /TOKEN_REFRESHED/);
  assert.match(provider, /import "\.\/studio-startup-v292\.js"/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  for (const source of [startup, provider]) assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
});

test("v292 reads membership directly first and keeps the existing client as fallback", async () => {
  const startup = await read("src/studio-startup-v292.js");
  assert.match(startup, /startup-membership-direct-first-v292-20260805/);
  assert.match(startup, /\/rest\/v1\/site_members/);
  assert.match(startup, /authorization: `Bearer \$\{session\.access_token\}`/);
  assert.match(startup, /cache: "no-store"/);
  assert.match(startup, /return await directMembership\(userId\)/);
  assert.match(startup, /listUserSites\(userId\)/);
  assert.match(startup, /FALLBACK_TIMEOUT_MS/);
});

test("v292 startup gate does not force remote auth verification and cannot spin forever", async () => {
  const gate = await read("src/StudioOnboardingGate.jsx");
  assert.match(gate, /studio-startup-v292\.js/);
  assert.match(gate, /listUserSitesStartupV292/);
  assert.match(gate, /STARTUP_DATA_TIMEOUT_MS = 11_000/);
  assert.match(gate, /getVerifiedSession\(\)/);
  assert.doesNotMatch(gate, /getVerifiedSession\(\{\s*force:\s*true\s*\}\)/);
  assert.doesNotMatch(gate, /STARTUP_RETRY_DELAYS/);
  assert.match(gate, /ngeblogging-active-site-snapshot-v292/);
  assert.match(gate, /Data Studio belum merespons dalam batas waktu/);
});

test("v292 resumes known sites immediately and isolates snapshots by user", async () => {
  const fast = await read("src/StudioFastGate.jsx");
  assert.match(fast, /studio-fast-entry-v292-20260805/);
  assert.match(fast, /ngeblogging-active-site-snapshot-v292/);
  assert.match(fast, /snapshot\.__userId === userId/);
  assert.match(fast, /resume-known-site-v292/);
});

test("v292 auth is preserved while v298 owns the single n interaction", async () => {
  const native = await read("src/studio-native-controls-v290.js");
  const v298 = await read("src/studio-shell-authority-v298.js");
  assert.match(native, /studio-auth-sidebar-v291-20260805/);
  assert.match(native, /studio-native-capture-retired-v298-20260805/);
  assert.match(native, /import\("\.\/studio-shell-authority-v298\.js"\)/);
  assert.doesNotMatch(native, /function nativeToggle\s*\(|document\.addEventListener\("click",\s*nativeToggle|nativeToggleKeyboard/);
  assert.match(v298, /studio-single-n-owner-v298-20260805/);
  assert.match(v298, /function toggleN\(event\)/);
});

test("v292 release metadata does not invent device or capacity proof", async () => {
  const release = await read("public/release-v292.json");
  assert.match(release, /studio-startup-direct-data-v292-20260805/);
  assert.match(release, /"realDeviceMatrixClaimed": false/);
  assert.match(release, /"capacityClaimed": false/);
  assert.doesNotMatch(release, /900juta|900 juta|100% berhasil/i);
});

test("v293 completes UI recovery without replacing v292 login startup", async () => {
  const runtime = await read("src/studio-final-authority-v293.js");
  const css = await read("src/studio-final-authority-v293.css");
  const native = await read("src/studio-native-controls-v290.js");
  const device = await read("src/studio-device-mode-v140.js");
  const theme = await read("src/ThemeStudio.jsx");
  const nara = await read("src/NaraAssistant.jsx");
  const release = await read("public/release-v293.json");
  assert.match(runtime, /studio-final-authority-v293-20260805/);
  assert.match(runtime, /studio-theme-layout-v264\.css/);
  assert.match(runtime, /CONTENT_WORD_LIMIT = 5_000/);
  assert.match(runtime, /CONTENT_WORD_WARNING = 4_500/);
  assert.match(runtime, /CODE_LINE_LIMIT = 10_000/);
  assert.match(runtime, /guardPublish/);
  assert.doesNotMatch(runtime, /new MutationObserver|setInterval\s*\(|signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
  assert.match(native, /import\("\.\/studio-final-authority-v293\.js"\)/);
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) assert.ok(device.includes(`"${mode}"), `missing layout mode ${mode}`);
  for (const preview of ["Aplikasi", "Handphone", "Mobile", "Perangkat kecil", "Tablet", "Laptop", "Situs desktop", "Komputer"]) assert.ok(theme.includes(preview), `missing preview ${preview}`);
  for (const capability of ["Kamera", "Foto", "nara-mini", "nara-writer", "nara-vision", "nara-max"]) assert.ok(nara.includes(capability), `missing Nara ${capability}`);
  assert.match(css, /--v293-side-open:220px/);
  assert.match(css, /--v293-side-rail:70px/);
  assert.match(css, /grid-template-areas:"code preview"/);
  assert.match(css, /\.tn-code-gutter-v293/);
  assert.match(release, /studio-final-authority-cache-v293/);
  assert.match(release, /studio-startup-direct-data-v292-20260805/);
});
