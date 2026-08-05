import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v289 loads after v288 without adding a second interaction owner", async () => {
  const v288 = await read("src/studio-screenshot-polish-v288.js");
  const runtime = await read("src/studio-final-pass-v289.js");
  assert.match(v288, /import\("\.\/studio-final-pass-v289\.js"\)/);
  assert.match(runtime, /studio-final-pass-v289-20260805/);
  assert.doesNotMatch(runtime, /addEventListener\("click"[^\n]*capture|stopImmediatePropagation|new MutationObserver|setInterval\s*\(/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(?:reload|replace)\s*\(/);
});

test("v289 makes the six-mode sidebar deterministic, persistent and complete", async () => {
  const css = await read("src/studio-final-pass-v289.css");
  const runtime = await read("src/studio-final-pass-v289.js");
  const studio = await read("src/StudioNext.jsx");
  const device = await read("src/studio-device-mode-v140.js");
  assert.match(css, /data-studio-device-mode="large"/);
  assert.match(css, /data-studio-device-mode="small"/);
  assert.match(css, /--v289-side-open:248px/);
  assert.match(css, /--v289-side-rail:72px/);
  assert.match(css, /collapsed~\.sn-main/);
  assert.match(css, /not\(\.mobile-open\)>\.sn-logo/);
  assert.match(css, /body\.sn-mobile-sidebar-open \.sn-side-backdrop/);
  assert.match(css, /pointer-events:auto!important/);
  assert.match(runtime, /dataset\.studioDeviceMode/);
  assert.match(runtime, /ngeblogging-studio-sidebar-state-v289/);
  assert.match(runtime, /safeSet\(SIDEBAR_KEY/);
  assert.match(runtime, /reactToggle\(\)/);
  for (const label of ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"]) {
    assert.ok(studio.includes(label), `missing sidebar item ${label}`);
  }
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) assert.ok(device.includes(`"${mode}"`));
});

test("v289 keeps the profile visible and profile/settings separated", async () => {
  const css = await read("src/studio-final-pass-v289.css");
  const profile = await read("src/studio-react-shell-v287.js");
  assert.match(css, /\.sn-main>\.sn-top \.sn-avatar\{display:grid!important/);
  assert.match(css, /sn-profile-menu-v287/);
  for (const label of ["Profil", "Ganti avatar", "Tambahkan situs", "Pengaturan", "Nara AI", "Keluar"]) assert.ok(profile.includes(label), `missing ${label}`);
});

test("v289 keeps Nara fixed and non-modal except in full screen", async () => {
  const css = await read("src/studio-final-pass-v289.css");
  const runtime = await read("src/studio-final-pass-v289.js");
  const nara = await read("src/NaraAssistant.jsx");
  assert.match(css, /\.nara-floating-button\{position:fixed!important/);
  assert.match(css, /data-nara-interaction="nonmodal"/);
  assert.match(css, /\.nara-attachment-menu\{position:absolute!important/);
  assert.match(runtime, /full \? "modal" : "nonmodal"/);
  for (const marker of ["Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) assert.ok(nara.includes(marker), `Nara missing ${marker}`);
});

test("v289 preserves the 26-area Theme map but makes mobile labels readable", async () => {
  const css = await read("src/studio-final-pass-v289.css");
  const layout = await read("src/studio-theme-layout-v264.js");
  const polish = await read("src/studio-native-polish-v284.js");
  assert.match(css, /\.tn-layout-map-v264\{display:block!important;width:100%!important/);
  assert.match(css, /min-width:520px!important/);
  assert.match(css, /\.tn-layout-slot-v264>span\{font-size:10\.5px!important/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
  assert.match(css, /grid-template-areas:"code preview"/);
  for (const slot of ["sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4", "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"]) assert.ok(layout.includes(slot), `missing ${slot}`);
  assert.match(layout, /Semua 26 widget/);
  assert.match(polish, /MAX_CODE_LINES = 10000/);
  assert.match(polish, /lineNumberText\(count\)/);
});

test("v289 restores the existing real analytics dashboard instead of the placeholder", async () => {
  const runtime = await read("src/studio-final-pass-v289.js");
  const analytics = await read("src/studio-analytics-v41.js");
  assert.match(runtime, /import \{ loadAnalytics \} from "\.\/studio-analytics-v41\.js"/);
  assert.match(runtime, /loadAnalytics\(view, 30, false\)/);
  assert.match(runtime, /studioAnalyticsV289 = "production-first"/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(analytics, /7 hari/);
  assert.match(analytics, /30 hari/);
  assert.match(analytics, /90 hari/);
  assert.match(analytics, /Manusia dan bot/);
  assert.match(analytics, /Distribusi perangkat/);
  assert.match(analytics, /Referrer teratas/);
  assert.match(analytics, /Lokasi agregat/);
  assert.match(analytics, /Performa konten/);
});

test("v289 keeps Domain and mobile editor inside the viewport", async () => {
  const css = await read("src/studio-final-pass-v289.css");
  assert.match(css, /sv124-domain-page \.sv124-free-domain>aside/);
  assert.match(css, /white-space:nowrap!important/);
  assert.match(css, /\.ce-ribbon-tabs,\.ce-toolbar,\.ce-ribbon/);
  assert.match(css, /overflow-x:auto!important/);
  assert.match(css, /\.ce-paper\{width:100%!important/);
});

test("v289 does not weaken persistent authentication or invent production data", async () => {
  const auth = await read("src/lib/supabase.js");
  const modal = await read("src/AuthModal.jsx");
  const runtime = await read("src/studio-final-pass-v289.js");
  const css = await read("src/studio-final-pass-v289.css");
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  for (const provider of ["google", "github", "linkedin_oidc"]) assert.ok(auth.includes(`"${provider}"`));
  assert.match(modal, /signInWithPassword/);
  assert.match(modal, /signInWithMagicLink/);
  for (const source of [runtime, css]) assert.doesNotMatch(source, /900juta|999 pageviews|100% berhasil|super canggih/i);
});
