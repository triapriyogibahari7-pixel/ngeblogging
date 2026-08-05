import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v291 keeps v290 UI after v289 but retires the callback-path monkey patch", async () => {
  const entry = await read("src/auth-provider-gateway-v250.js");
  const v289 = await read("src/studio-final-pass-v289.js");
  assert.doesNotMatch(entry, /import "\.\/auth-studio-handoff-v290\.js"/);
  assert.doesNotMatch(entry, /import "\.\/studio-native-controls-v290\.js"/);
  assert.match(entry, /auth-provider-navigation-v291-20260805/);
  assert.match(v289, /import\("\.\/studio-native-controls-v290\.js"\)/);
  assert.match(v289, /v290 must load after v289/);
});

test("v291 restores the known root callbacks instead of rewriting Supabase auth methods", async () => {
  const entry = await read("src/auth-provider-gateway-v250.js");
  const auth = await read("src/lib/supabase.js");
  const retired = await read("src/auth-studio-handoff-v290.js");
  assert.match(auth, /appUrl\("\/\?auth=callback"\)/);
  assert.match(auth, /appUrl\("\/\?auth=recovery"\)/);
  assert.doesNotMatch(entry, /auth-studio-handoff-v290/);
  assert.match(retired, /auth-studio-handoff-v290-20260805/);
  assert.doesNotMatch(entry, /patchMethod\(|moveCallbackPathToStudio/);
  assert.doesNotMatch(auth, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
});

test("v291 keeps exactly one repeatable n click owner without pointer-down muting", async () => {
  const runtime = await read("src/studio-native-controls-v290.js");
  const legacy = await read("src/studio-react-shell-v287.js");
  assert.match(runtime, /studio-native-controls-v290-20260805/);
  assert.match(runtime, /studio-auth-sidebar-v291-20260805/);
  assert.match(runtime, /function nativeToggle\(event\)/);
  assert.match(runtime, /document\.addEventListener\("click", nativeToggle, true\)/);
  assert.match(runtime, /nativeToggleKeyboard/);
  assert.match(runtime, /reactToggle\(\)/);
  assert.match(runtime, /v291SingleOwnerToggle/);
  assert.doesNotMatch(runtime, /pointerdown|immediateNativeToggle|toggle\.disabled\s*=\s*true|muteTimer/);
  assert.match(legacy, /Sidebar n ownership was retired in v291/);
  assert.doesNotMatch(legacy, /const reactToggle/);
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
  assert.match(css, /bottom:calc\(100% \+ 8px\)!important/);
  assert.match(css, /\.domain-actions/);
});

test("v290 locks desktop rail, mobile n and dashboard rows against screenshot regressions", async () => {
  const css = await read("src/studio-native-controls-v290.css");
  assert.match(css, /data-studio-device-mode="large"[^]*#ngeblogging-studio-sidebar/);
  assert.match(css, /width:248px!important/);
  assert.match(css, /collapsed~\.sn-main/);
  assert.match(css, /data-studio-device-mode="small"[^]*#ngeblogging-studio-sidebar:not\(\.mobile-open\)/);
  assert.match(css, /\.sn-home-grid>section>header\{/);
  assert.match(css, /position:relative!important/);
  assert.match(css, /\.sn-home-grid>section>button\{/);
  assert.match(css, /\.sn-main>\.sn-top \.sn-avatar\{/);
});

test("v290 keeps real Supabase persistence and all six responsive classifications", async () => {
  const supabase = await read("src/lib/supabase.js");
  const device = await read("src/studio-device-mode-v140.js");
  assert.match(supabase, /persistSession:\s*true/);
  assert.match(supabase, /autoRefreshToken:\s*true/);
  for (const provider of ["google", "github", "linkedin_oidc"]) assert.ok(supabase.includes(`"${provider}"`));
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) assert.ok(device.includes(`"${mode}"`), `missing ${mode}`);
});
