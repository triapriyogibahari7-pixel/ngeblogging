import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v298 is the single lightweight n/profile shell authority", async () => {
  const runtime = await read("src/studio-shell-authority-v298.js");
  const v281 = await read("src/studio-native-controls-v281.js");
  const v284 = await read("src/studio-native-polish-v284.js");
  const v285 = await read("src/studio-responsive-lock-v285.js");
  const native = await read("src/studio-native-controls-v290.js");

  assert.match(runtime, /studio-shell-authority-v298-20260805/);
  assert.match(runtime, /studio-single-n-owner-v298-20260805/);
  assert.match(runtime, /function toggleN\(event\)/);
  assert.match(runtime, /reactToggle\(\)/);
  assert.match(runtime, /sn-profile-menu-v298/);
  assert.match(runtime, /ngeblogging-studio-sidebar-state-v298/);
  for (const entry of ["profile", "add-site", "switch-site", "settings", "help", "logout"]) assert.ok(runtime.includes(`"${entry}"`));

  assert.match(v281, /studio-native-controls-v281-retired-by-v298-20260805/);
  assert.doesNotMatch(v281, /document\.addEventListener|window\.addEventListener/);

  assert.match(v284, /studio-native-polish-v284-retired-by-v298-20260805/);
  assert.match(v284, /__NGE_STUDIO_V298_SINGLE_OWNER/);
  assert.match(v284, /import\("\.\/studio-final-authority-v293\.js"\)/);
  assert.match(v284, /import\("\.\/studio-theme-catalog-v296\.js"\)/);
  assert.match(v284, /import\("\.\/studio-shell-authority-v298\.js"\)/);
  assert.doesNotMatch(v284, /window\.addEventListener|document\.addEventListener\("click"/);

  assert.match(v285, /studio-responsive-lock-v285-retired-by-v298-20260805/);
  assert.doesNotMatch(v285, /mark\.addEventListener|window\.addEventListener|document\.addEventListener/);

  assert.match(native, /studio-native-capture-retired-v298-20260805/);
  assert.doesNotMatch(native, /function nativeToggle\s*\(|document\.addEventListener\("click",\s*nativeToggle/);

  for (const source of [runtime, v281, v284, v285, native]) {
    assert.doesNotMatch(source, /new MutationObserver|setInterval\s*\(|stopImmediatePropagation/);
    assert.doesNotMatch(source, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
  }
});

test("v298 geometry follows shell data-mode and removes the mobile desktop rail", async () => {
  const css = await read("src/studio-shell-authority-v298.css");
  assert.match(css, /--v298-side-open:220px/);
  assert.match(css, /--v298-side-rail:70px/);
  assert.match(css, /\.sn-shell\[data-device-mode="small"\]/);
  assert.match(css, /\.sn-shell\[data-device-mode="large"\]/);
  assert.match(css, />#ngeblogging-studio-sidebar:not\(\.mobile-open\)/);
  assert.match(css, /width:54px!important/);
  assert.match(css, /width:min\(78vw,336px\)!important/);
  assert.match(css, /margin-left:0!important/);
  assert.match(css, /width:100%!important/);
  assert.match(css, /\.sn-side-backdrop[^]*pointer-events:none!important/);
  assert.match(css, /collapsed~\.sn-main/);
});

test("v298 keeps Nara fixed, compact and non-modal except full", async () => {
  const css = await read("src/studio-shell-authority-v298.css");
  const nara = await read("src/NaraAssistant.jsx");
  assert.match(css, /\.nara-floating-button\{position:fixed!important/);
  assert.match(css, /data-nara-interaction="nonmodal"/);
  assert.match(css, /\.nara-assistant-shell\[data-nara-size="small"\]/);
  assert.match(css, /\.nara-assistant-shell\[data-nara-size="medium"\]/);
  assert.match(css, /data-nara-size="full"/);
  assert.match(css, /\.nara-assistant-shell \.nara-attachment-menu\{display:grid!important;position:absolute!important/);
  assert.match(css, /bottom:calc\(100% \+ 8px\)!important/);
  for (const marker of ["Kamera", "Foto", "File", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) assert.ok(nara.includes(marker), `missing ${marker}`);
});

test("v298 keeps Theme Studio and editor guarantees", async () => {
  const css = await read("src/studio-shell-authority-v298.css");
  const editor = await read("src/studio-final-authority-v293.js");
  const release = await read("public/release-v298.json");
  assert.match(css, /grid-template-areas:"code preview"/);
  assert.match(css, /grid-template-areas:"code" "preview"/);
  assert.match(css, /\.tn-layout-map-v264/);
  assert.match(css, /\.ce-ribbon,.ce-tabs,.ce-toolbar,.ce-mobile-tabs/);
  assert.match(editor, /editor-only-v298-20260805/);
  assert.match(editor, /CONTENT_WORD_LIMIT = 5_000/);
  assert.match(editor, /CONTENT_WORD_WARNING = 4_500/);
  assert.match(editor, /CODE_LINE_LIMIT = 10_000/);
  assert.match(editor, /guardPublish/);
  assert.doesNotMatch(editor, /document\.addEventListener\("click",\s*\(\)\s*=>|new MutationObserver|setInterval\s*\(|stopImmediatePropagation/);
  assert.match(release, /"themeCatalogCount": 100/);
  assert.match(release, /"postPageWordLimit": 5000/);
  assert.match(release, /"codeLineLimit": 10000/);
});

test("v298 owns real analytics instead of the old dashboard placeholder", async () => {
  const runtime = await read("src/studio-shell-authority-v298.js");
  const analytics = await read("src/studio-analytics-v41.js");
  assert.match(runtime, /studio-analytics-production-owner-v298-20260805/);
  assert.match(runtime, /loadAnalytics\(view, 30, false\)/);
  assert.match(runtime, /dataset\.studioAnalyticsV298 = "production-first"/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(analytics, /7 hari/);
  assert.match(analytics, /30 hari/);
  assert.match(analytics, /90 hari/);
});

test("v298 preserves six responsive classes and persistent auth", async () => {
  const device = await read("src/studio-device-mode-v140.js");
  const auth = await read("src/lib/supabase.js");
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) assert.ok(device.includes(`"${mode}"`), `missing ${mode}`);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /appUrl\("\/\?auth=callback"\)/);
});
