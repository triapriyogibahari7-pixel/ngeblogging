import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import "./cloudflare-production-v253.test.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-shell-nara-v253.js");
const css = read("src/studio-shell-nara-v253.css");
const studio = read("src/StudioNext.jsx");
const nara = read("src/NaraAssistant.jsx");
const activation = read("scripts/activate-studio-native-v250.mjs");
const rotate = read("scripts/service-worker-v253-rotate.mjs");
const vite = read("vite.config.js");

const requiredMenu = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];

test("v253 is loaded after v252 and build activation preserves it last", () => {
  const v252Css = entry.indexOf('import "./studio-source-stability-v252.css";');
  const v253Js = entry.indexOf('import "./studio-shell-nara-v253.js";');
  const v253Css = entry.indexOf('import "./studio-shell-nara-v253.css";');
  assert.ok(v252Css >= 0);
  assert.ok(v253Js > v252Css);
  assert.ok(v253Css > v253Js);
  assert.match(activation, /SHELL_NARA_RELEASE/);
  assert.match(activation, /studio-shell-nara-v253\.js/);
  assert.match(activation, /studio-shell-nara-v253\.css/);
  assert.match(activation, /V253_SHELL_NARA_RUNTIME_ORDER_INVALID/);
  assert.match(activation, /V253_SHELL_NARA_CSS_ORDER_INVALID/);
});

test("large family sidebar can never disappear and content follows open or collapsed width", () => {
  assert.match(runtime, /data\.studioV253Family|dataset\.studioV253Family/);
  assert.match(runtime, /data\.studioV253Sidebar|dataset\.studioV253Sidebar/);
  assert.match(css, /data-studio-v253-family="large"\] \.sn-side[\s\S]*display:flex!important[\s\S]*visibility:visible!important[\s\S]*pointer-events:auto!important/);
  assert.match(css, /data-studio-v253-sidebar="expanded"\] \.sn-main[\s\S]*margin-left:var\(--v253-side-open\)/);
  assert.match(css, /data-studio-v253-sidebar="collapsed"\] \.sn-main[\s\S]*margin-left:var\(--v253-side-rail\)/);
  assert.match(css, /data-studio-v253-sidebar="expanded"\] \.sn-top[\s\S]*left:var\(--v253-side-open\)/);
  assert.match(css, /data-studio-v253-sidebar="collapsed"\] \.sn-top[\s\S]*left:var\(--v253-side-rail\)/);
});

test("small family keeps one n drawer with transparent non-blurring backdrop", () => {
  assert.match(css, /data-studio-v253-family="small"\] \.sn-sidebar-toggle[\s\S]*display:grid!important/);
  assert.match(css, /data-studio-v253-family="small"\] \.sn-side[\s\S]*translateX\(-105%\)/);
  assert.match(css, /data-studio-v253-family="small"\] \.sn-side\.mobile-open[\s\S]*translateX\(0\)/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*background:transparent!important[\s\S]*backdrop-filter:none!important/);
  assert.match(css, /data-studio-v253-sidebar="open"\] \.sn-sidebar-toggle[\s\S]*display:none!important/);
});

test("v254 hotfix keeps React device mode synchronized with the final v253 family", () => {
  assert.match(runtime, /studio-family-sync-v254-hotfix-20260804/);
  assert.match(runtime, /function synchronizeReactDeviceMode\(html, family\)/);
  assert.match(runtime, /const expected = family === "small" \? "small" : "large"/);
  assert.match(runtime, /html\.dataset\.studioDeviceMode = expected/);
  assert.match(runtime, /ngeblogging:studio-device-mode-change/);
  assert.match(runtime, /const desktopSitePhone = html\.dataset\.studioDesktopSitePhone === "true"/);
  assert.match(runtime, /if \(desktopSitePhone\) return "large"/);
  assert.match(runtime, /synchronizeReactDeviceMode\(html, family\)/);
});

test("all mandatory menu labels remain in React Studio source", () => {
  for (const label of requiredMenu) assert.ok(studio.includes(label), `missing ${label}`);
});

test("Nara launcher is fixed in lower-right safe area and does not blink", () => {
  assert.match(css, /\.nara-floating-button[\s\S]*position:fixed!important/);
  assert.match(css, /right:calc\(var\(--v253-safe-right\) \+ 2px\)!important/);
  assert.match(css, /bottom:calc\(var\(--v253-safe-bottom\) \+ 2px\)!important/);
  assert.match(css, /z-index:8800!important/);
  assert.match(css, /animation:none!important/);
  assert.match(css, /transition:none!important/);
  assert.match(runtime, /launcher\.hidden = true/);
  assert.match(runtime, /launcher\.hidden = false/);
});

test("Nara small and medium are non-modal floating windows while full is modal", () => {
  assert.match(runtime, /full \? "modal" : "nonmodal"/);
  assert.match(runtime, /backdrop\.hidden = !full/);
  assert.match(css, /data-v253-interaction="nonmodal"[\s\S]*pointer-events:none!important/);
  assert.match(css, /data-v253-interaction="nonmodal"[\s\S]*align-items:flex-end!important/);
  assert.match(css, /data-v253-size="small"[\s\S]*height:min\(580px,68dvh\)/);
  assert.match(css, /data-v253-size="medium"[\s\S]*height:min\(760px,84dvh\)/);
  assert.match(css, /data-v253-size="full"[\s\S]*width:100vw!important[\s\S]*height:100dvh!important/);
});

test("Nara header controls stay in one row and plus menu is not clipped", () => {
  assert.match(css, /\.nara-assistant-header[\s\S]*grid-template-columns:42px minmax\(72px,1fr\) auto 34px 34px 34px/);
  assert.match(css, /\.nara-size-controls-v147[\s\S]*display:flex!important/);
  assert.match(css, /\.nara-composer-tools[\s\S]*overflow:visible!important/);
  assert.match(css, /\.nara-attachment-menu[\s\S]*z-index:9200!important/);
  assert.match(nara, /<Camera \/>[\s\S]*<b>Kamera<\/b>/);
  assert.match(nara, /<ImageIcon \/>[\s\S]*<b>Foto<\/b>/);
  assert.match(nara, /<File \/>[\s\S]*<b>File teks<\/b>/);
  assert.match(nara, /intelligenceOptions/);
  assert.match(nara, /modelOptions/);
  assert.match(nara, /<MicOff \/>/);
  assert.match(nara, /SpeakerIcon/);
});

test("v253 service worker rotation runs after v250 without forced navigation or session destruction", () => {
  assert.match(vite, /rotateServiceWorkerV253/);
  assert.ok(vite.indexOf("rotateServiceWorkerV253()") > vite.indexOf("rotateServiceWorkerV250()"));
  assert.match(rotate, /ACTIVE_VERSION_V250/);
  assert.match(rotate, /ACTIVE_VERSION_V253/);
  assert.match(rotate, /studioShellNaraReleaseV253/);
  assert.match(rotate, /NGE_BLOGGING_UPDATE_AVAILABLE_V253/);
  assert.match(rotate, /V253_ROTATE_OLD_CACHE_CLEANUP_MISSING/);
  assert.match(rotate, /V253_ROTATE_AUTH_SURFACE_GUARD_MISSING/);
  assert.doesNotMatch(rotate, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});