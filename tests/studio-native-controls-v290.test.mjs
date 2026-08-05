import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v290 loads auth handoff and native controls from the active Auth entry", async () => {
  const entry = await read("src/auth-provider-gateway-v250.js");
  assert.match(entry, /import "\.\/auth-studio-handoff-v290\.js"/);
  assert.match(entry, /import "\.\/studio-native-controls-v290\.js"/);
});

test("v290 sends OAuth, email links and registration callbacks straight to Studio", async () => {
  const auth = await read("src/auth-studio-handoff-v290.js");
  assert.match(auth, /auth-studio-handoff-v290-20260805/);
  assert.match(auth, /\/studio\?auth=callback/);
  assert.match(auth, /signInWithOAuth/);
  assert.match(auth, /signInWithOtp/);
  assert.match(auth, /signUp/);
  assert.match(auth, /resend/);
  assert.match(auth, /resetPasswordForEmail/);
  assert.match(auth, /moveCallbackPathToStudio/);
  assert.doesNotMatch(auth, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
});

test("v290 keeps the n responsive without adding observer churn or destructive session behavior", async () => {
  const runtime = await read("src/studio-native-controls-v290.js");
  assert.match(runtime, /studio-native-controls-v290-20260805/);
  assert.match(runtime, /pointerdown/);
  assert.match(runtime, /immediateNativeToggle/);
  assert.match(runtime, /reactToggle\(\)/);
  assert.match(runtime, /ngeblogging:auth-session-ready/);
  assert.match(runtime, /ngeblogging:auth-callback-complete/);
  assert.doesNotMatch(runtime, /new MutationObserver|setInterval\s*\(|stopImmediatePropagation/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
});

test("v290 retires the body-wide StudioSecure observers that caused repeated DOM churn", async () => {
  const secure = await read("src/StudioSecure.jsx");
  assert.match(secure, /studio-secure-event-sync-v290-20260805/);
  assert.match(secure, /installSettledSync/);
  assert.match(secure, /ngeblogging:studio-device-mode-change/);
  assert.match(secure, /ngeblogging:auth-session-ready/);
  assert.doesNotMatch(secure, /new MutationObserver/);
  assert.doesNotMatch(secure, /setInterval\s*\(/);
});

test("v290 mobile drawer is transparent and click-through while Nara stays fixed and non-modal", async () => {
  const css = await read("src/studio-native-controls-v290.css");
  assert.match(css, /body\.sn-mobile-sidebar-open \.sn-side-backdrop/);
  assert.match(css, /pointer-events:none!important/);
  assert.match(css, /\.nara-floating-button\{/);
  assert.match(css, /position:fixed!important/);
  assert.match(css, /data-nara-interaction="nonmodal"/);
  assert.match(css, /\.nara-assistant-shell\[data-nara-size="small"\]/);
  assert.match(css, /\.nara-attachment-menu\{/);
  assert.match(css, /\.domain-actions/);
});

test("v290 keeps real Supabase persistence and all six responsive classifications", async () => {
  const supabase = await read("src/lib/supabase.js");
  const device = await read("src/studio-device-mode-v140.js");
  assert.match(supabase, /persistSession:\s*true/);
  assert.match(supabase, /autoRefreshToken:\s*true/);
  for (const provider of ["google", "github", "linkedin_oidc"]) assert.ok(supabase.includes(`"${provider}"`));
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) assert.ok(device.includes(`"${mode}"`), `missing ${mode}`);
});
