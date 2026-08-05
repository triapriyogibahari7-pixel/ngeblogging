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

test("v298 retires the old v290 capture owner and loads one lightweight shell authority", async () => {
  const runtime = await read("src/studio-native-controls-v290.js");
  const v298 = await read("src/studio-shell-authority-v298.js");
  const legacy = await read("src/studio-react-shell-v287.js");
  assert.match(runtime, /studio-native-controls-v290-20260805/);
  assert.match(runtime, /studio-auth-sidebar-v291-20260805/);
  assert.match(runtime, /studio-native-capture-retired-v298-20260805/);
  assert.match(runtime, /import\("\.\/studio-shell-authority-v298\.js"\)/);
  assert.doesNotMatch(runtime, /function nativeToggle\s*\(|document\.addEventListener\("click",\s*nativeToggle|nativeToggleKeyboard|v291SingleOwnerToggle/);
  assert.match(v298, /studio-single-n-owner-v298-20260805/);
  assert.match(v298, /function toggleN\(event\)/);
  assert.match(v298, /reactToggle\(\)/);
  assert.doesNotMatch(v298, /new MutationObserver|setInterval\s*\(|stopImmediatePropagation/);
  assert.match(legacy, /Sidebar n ownership was retired in v291/);
  assert.doesNotMatch(legacy, /const reactToggle/);
  for (const source of [runtime, v298]) {
    assert.doesNotMatch(source, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
  }
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

test("v294 mobile browsers cannot inherit the desktop rail from transient viewport width", async () => {
  const device = await read("src/studio-device-mode-v140.js");
  const release = await read("public/release-v294.json");
  const patch = await read("scripts/patch-service-worker-v294.mjs");

  assert.match(device, /studio-mobile-classifier-v294-20260805/);
  assert.match(device, /function explicitMobileBrowserSignal\(\)/);
  assert.match(device, /const widenedLayout = !explicitMobileBrowser/);
  assert.match(device, /const widenedVisual = !explicitMobileBrowser/);
  assert.match(device, /const wideTouchDesktopSurface =[\s\S]*navigator\.userAgentData\?\.mobile === false/);
  assert.match(device, /if \(desktopSiteLock && explicitMobileBrowserSignal\(\)\) desktopSiteLock = false/);
  assert.match(device, /export function detectStudioResponsiveMode\(\) \{\s*ensureViewportMeta\(\);/);
  assert.match(device, /function applyDeviceMode\(\) \{\s*frame = 0;\s*ensureViewportMeta\(\);/);
  assert.match(device, /studioMobileClassifierV294/);
  assert.match(release, /studio-mobile-classifier-cache-v294/);
  assert.match(patch, /STUDIO_MOBILE_CLASSIFIER_RELEASE_V294/);
  assert.doesNotMatch(device, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
});
