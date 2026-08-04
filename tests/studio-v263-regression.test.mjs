import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./studio-theme-layout-v264.test.mjs";
import "./studio-screenshot-authority-v265.test.mjs";

const studio = readFileSync(new URL("../src/Studio.jsx", import.meta.url), "utf8");
const studioNext = readFileSync(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");
const legacyCss = readFileSync(new URL("../src/studio-shell-v263.css", import.meta.url), "utf8");
const legacyHotfix = readFileSync(new URL("../src/studio-shell-v263-hotfix.css", import.meta.url), "utf8");
const retiredRuntime = readFileSync(new URL("../src/studio-runtime-v263.js", import.meta.url), "utf8");
const shell265 = readFileSync(new URL("../src/studio-shell-v265.js", import.meta.url), "utf8");
const shellCss265 = readFileSync(new URL("../src/studio-shell-v265.css", import.meta.url), "utf8");
const finalCss265 = readFileSync(new URL("../src/studio-shell-v265-final-hotfix.css", import.meta.url), "utf8");
const screenshot265 = readFileSync(new URL("../src/studio-screenshot-authority-v265.js", import.meta.url), "utf8");
const nara = readFileSync(new URL("../src/NaraAssistant.jsx", import.meta.url), "utf8");
const theme = readFileSync(new URL("../src/ThemeStudio.jsx", import.meta.url), "utf8");
const supabase = readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8");
const authModal = readFileSync(new URL("../src/AuthModal.jsx", import.meta.url), "utf8");

const indexOf = (source, marker) => {
  const index = source.indexOf(marker);
  assert.notEqual(index, -1, `missing ${marker}`);
  return index;
};

test("v263 observer is retired while v264 and live v265 authorities load in final order", () => {
  const retired = indexOf(studio, 'v265 retirement marker; v263 JS is kept as backup');
  const css263 = indexOf(studio, 'import "./studio-shell-v263.css"');
  const hotfix263 = indexOf(studio, 'import "./studio-shell-v263-hotfix.css"');
  const v264 = indexOf(studio, 'import "./studio-theme-layout-v264.js"');
  const screenshot = indexOf(studio, 'import "./studio-screenshot-authority-v265.js"');
  const shell = indexOf(studio, 'import "./studio-shell-v265.js"');
  const shellCss = indexOf(studio, 'import "./studio-shell-v265.css"');
  const finalHotfix = indexOf(studio, 'import "./studio-shell-v265-final-hotfix.css"');
  assert.ok(css263 > retired);
  assert.ok(hotfix263 > css263);
  assert.ok(v264 > hotfix263);
  assert.ok(screenshot > v264);
  assert.ok(shell > screenshot);
  assert.ok(shellCss > shell);
  assert.ok(finalHotfix > shellCss);
  assert.doesNotMatch(studio, /^import "\.\/studio-runtime-v263\.js";/m);
});

test("large family has one internal n and small family has one React drawer trigger", () => {
  assert.match(shell265, /currentStudioDeviceMode/);
  assert.match(shell265, /studio-v265-large/);
  assert.match(shell265, /studio-v265-small/);
  assert.match(shell265, /aria-controls", "ngeblogging-studio-sidebar/);
  assert.match(screenshot265, /document\.querySelector\("\.sn-top \.sn-sidebar-toggle"\)\?\.click\(\)/);
  assert.match(shellCss265, /html\.studio-v265-large \.sn-sidebar-toggle\{display:none!important/);
  assert.match(shellCss265, /html\.studio-v265-small \.sn-sidebar-toggle/);
  assert.match(finalCss265, /html\.studio-v265-large #ngeblogging-studio-sidebar/);
});

test("all required Studio navigation remains in React source", () => {
  for (const label of [
    "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
    "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
  ]) assert.match(studioNext, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(studioNext, /sn-account-footer/);
  assert.match(studioNext, /sn-side-backdrop/);
});

test("profile and settings stay distinct under the active v265 account surface", () => {
  assert.match(shell265, /sn-account-view-profile-v263/);
  assert.match(shell265, /sn-account-view-settings-v263/);
  assert.match(screenshot265, /Profil & avatar/);
  assert.match(screenshot265, /Pengaturan situs/);
  assert.match(shellCss265, /sn-account-view-profile-v263 \.sn-settings-grid>section:nth-child\(2\)/);
  assert.match(shellCss265, /sn-account-view-settings-v263 \.sn-settings-grid>section:nth-child\(1\)/);
});

test("Nara small and medium are non-modal and full alone owns the viewport", () => {
  assert.match(shell265, /const full = size === "full"/);
  assert.match(shell265, /layer\.setAttribute\("aria-modal", String\(full\)\)/);
  assert.match(shell265, /backdrop\.hidden = !full/);
  assert.match(shellCss265, /data-nara-v265-interaction="nonmodal"/);
  assert.match(shellCss265, /nara-assistant-shell\[data-nara-size="small"\]/);
  assert.match(shellCss265, /nara-assistant-shell\[data-nara-size="medium"\]/);
  assert.match(shellCss265, /nara-assistant-shell\[data-nara-size="full"\]/);
  assert.match(finalCss265, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
  assert.match(legacyHotfix, /data-nara-v263-modal="false"/);
});

test("Nara retains attachments microphone speaker models and intelligence", () => {
  for (const marker of ["Kamera", "Foto", "File teks", "Mic", "SpeakerIcon", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) {
    assert.ok(nara.includes(marker), `Nara missing ${marker}`);
  }
  assert.match(nara, /model: requestModel/);
  assert.match(nara, /intelligence: requestIntelligence/);
  assert.match(nara, /capture="environment"/);
});

test("Theme Studio keeps 100 themes, eight previews, 26-area layout and final code gutter", () => {
  assert.match(theme, /THEME_COUNT/);
  for (const label of ["Aplikasi", "Handphone", "Mobile", "Perangkat kecil", "Tablet", "Laptop", "Situs desktop", "Komputer"]) {
    assert.ok(theme.includes(label), `Theme preview missing ${label}`);
  }
  for (const marker of ["LayoutMap", "WidgetStudio", "CodeEditor", "HTML", "CSS", "JavaScript", "Edit HTML", "Preview"]) {
    assert.ok(theme.includes(marker), `Theme Studio missing ${marker}`);
  }
  assert.match(shell265, /10_000/);
  assert.match(shell265, /tn-code-gutter-v265/);
  assert.match(shellCss265, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(finalCss265, /tn-layout-map-v264/);
  assert.match(retiredRuntime, /Pilih dari 26 widget/);
});

test("mobile editor and Domain surfaces remain protected from clipping", () => {
  assert.match(shellCss265, /html\.studio-v265-small \.sn-content-tools/);
  assert.match(finalCss265, /html\.studio-v265-small \.tn-code-workspace/);
  assert.match(finalCss265, /\.sn-site-manager/);
  assert.match(legacyCss, /\.ce-titlebar\{display:grid!important/);
  assert.match(legacyCss, /\.ce-tabs,.ce-ribbon\{overflow-x:auto!important/);
  assert.match(legacyCss, /\.sv124-free-domain>aside\{display:grid!important/);
});

test("auth is direct-first, persistent, bounded and keeps verified session handoff", () => {
  assert.match(supabase, /AUTH_DIRECT_FIRST_RELEASE_V263/);
  assert.match(supabase, /auth-direct-first-v263-20260804/);
  assert.match(supabase, /async function directAuthFirstV263/);
  assert.match(supabase, /if \(authProxyV190\) return directAuthFirstV263\(input, init, authProxyV190\)/);
  assert.match(supabase, /direct-supabase-primary/);
  assert.match(supabase, /same-origin-gateway-fallback/);
  assert.match(supabase, /persistSession: true/);
  assert.match(supabase, /autoRefreshToken: true/);
  assert.match(supabase, /GATEWAY_DEADLINE_MS_V259/);
  assert.match(supabase, /DIRECT_DEADLINE_MS_V259/);
  assert.match(authModal, /settleAuthenticatedSession/);
  assert.match(authModal, /ngeblogging:auth-session-ready/);
  assert.doesNotMatch(supabase, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(supabase, /sessionStorage\.clear\s*\(/);
  assert.doesNotMatch(authModal, /localStorage\.clear\s*\(/);
});
