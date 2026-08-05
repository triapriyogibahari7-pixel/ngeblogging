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
  for (const source of [startup, provider]) {
    assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
  }
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

test("v292 preserves the v291 single n owner and the v289 UI authorities", async () => {
  const native = await read("src/studio-native-controls-v290.js");
  const v289 = await read("src/studio-final-pass-v289.js");
  assert.match(native, /studio-auth-sidebar-v291-20260805/);
  assert.match(native, /function nativeToggle\(event\)/);
  assert.match(native, /document\.addEventListener\("click", nativeToggle, true\)/);
  assert.match(native, /nativeToggleKeyboard/);
  assert.doesNotMatch(native, /pointerdown|immediateNativeToggle|toggle\.disabled\s*=\s*true|muteTimer/);
  assert.match(v289, /syncAnalytics/);
  assert.match(v289, /syncThemeStudio/);
  assert.match(v289, /syncNara/);
});

test("v292 release metadata does not invent device or capacity proof", async () => {
  const release = await read("public/release-v292.json");
  assert.match(release, /studio-startup-direct-data-v292-20260805/);
  assert.match(release, /"realDeviceMatrixClaimed": false/);
  assert.match(release, /"capacityClaimed": false/);
  assert.doesNotMatch(release, /900juta|900 juta|100% berhasil/i);
});
