import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const studio = readFileSync(new URL("../src/Studio.jsx", import.meta.url), "utf8");
const studioNext = readFileSync(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/studio-shell-v263.css", import.meta.url), "utf8");
const hotfix = readFileSync(new URL("../src/studio-shell-v263-hotfix.css", import.meta.url), "utf8");
const runtime = readFileSync(new URL("../src/studio-runtime-v263.js", import.meta.url), "utf8");
const nara = readFileSync(new URL("../src/NaraAssistant.jsx", import.meta.url), "utf8");
const theme = readFileSync(new URL("../src/ThemeStudio.jsx", import.meta.url), "utf8");
const supabase = readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8");
const authModal = readFileSync(new URL("../src/AuthModal.jsx", import.meta.url), "utf8");

const indexOf = (source, marker) => {
  const index = source.indexOf(marker);
  assert.notEqual(index, -1, `missing ${marker}`);
  return index;
};

test("v263 is the last Studio shell authority", () => {
  const v260 = indexOf(studio, 'import "./studio-stability-v260-hotfix.css"');
  const runtime263 = indexOf(studio, 'import "./studio-runtime-v263.js"');
  const css263 = indexOf(studio, 'import "./studio-shell-v263.css"');
  const hotfix263 = indexOf(studio, 'import "./studio-shell-v263-hotfix.css"');
  assert.ok(runtime263 > v260);
  assert.ok(css263 > runtime263);
  assert.ok(hotfix263 > css263);
});

test("large family has one internal n and mobile has one drawer trigger", () => {
  assert.match(css, /@media \(min-width:761px\)[\s\S]*?\.sn-sidebar-toggle\{display:none!important\}/);
  assert.match(css, /\.sn-logo \.sn-logo-mark\{[\s\S]*?display:grid!important/);
  assert.match(css, /body\.sn-mobile-sidebar-open \.sn-top>\.sn-sidebar-toggle/);
  assert.match(css, /\.sn-side\.mobile-open \.sn-logo \.sn-logo-mark/);
  assert.match(runtime, /aria-controls", "ngeblogging-studio-sidebar/);
  assert.match(runtime, /aria-expanded/);
  assert.match(hotfix, /#ngeblogging-studio-sidebar \.sn-logo-mark/);
});

test("all required Studio navigation remains in React source", () => {
  for (const label of [
    "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
    "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
  ]) assert.match(studioNext, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(studioNext, /sn-account-footer/);
  assert.match(studioNext, /sn-side-backdrop/);
});

test("profile and settings are rendered as distinct account surfaces", () => {
  assert.match(runtime, /sn-account-view-profile-v263/);
  assert.match(runtime, /sn-account-view-settings-v263/);
  assert.match(runtime, /Profil & avatar/);
  assert.match(runtime, /Pengaturan situs/);
  assert.match(css, /sn-account-view-profile-v263 \.sn-settings-grid>section:nth-child\(2\)/);
  assert.match(css, /sn-account-view-settings-v263 \.sn-settings-grid>section:nth-child\(1\)/);
});

test("Nara small and medium stay non-modal while full owns the viewport", () => {
  assert.match(runtime, /const full = size === "full"/);
  assert.match(runtime, /layer\.setAttribute\("aria-modal", String\(full\)\)/);
  assert.match(runtime, /backdrop\.hidden = !full/);
  assert.match(css, /data-nara-v263-modal="false"/);
  assert.match(css, /data-nara-v263-modal="true"/);
  assert.match(css, /nara-assistant-shell\[data-nara-size="small"\]/);
  assert.match(css, /nara-assistant-shell\[data-nara-size="medium"\]/);
  assert.match(css, /nara-assistant-shell\[data-nara-size="full"\]/);
  assert.match(runtime, /nara-composer-tools > button\.listening/);
  assert.match(runtime, /speechSynthesis/);
  assert.match(hotfix, /data-nara-v263-modal="false"/);
});

test("Nara retains attachments microphone speaker models and intelligence", () => {
  for (const marker of ["Kamera", "Foto", "File teks", "Mic", "SpeakerIcon", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) {
    assert.ok(nara.includes(marker), `Nara missing ${marker}`);
  }
  assert.match(nara, /model: requestModel/);
  assert.match(nara, /intelligence: requestIntelligence/);
  assert.match(nara, /capture="environment"/);
});

test("Theme Studio keeps 100-theme system, eight previews, widgets, code and responsive map", () => {
  assert.match(theme, /THEME_COUNT/);
  for (const label of ["Aplikasi", "Handphone", "Mobile", "Perangkat kecil", "Tablet", "Laptop", "Situs desktop", "Komputer"]) {
    assert.ok(theme.includes(label), `Theme preview missing ${label}`);
  }
  for (const marker of ["LayoutMap", "WidgetStudio", "CodeEditor", "HTML", "CSS", "JavaScript", "Edit HTML", "Preview"]) {
    assert.ok(theme.includes(marker), `Theme Studio missing ${marker}`);
  }
  assert.match(css, /tn-code-workspace/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(runtime, /10_000/);
  assert.match(runtime, /tn-code-gutter-v263/);
  assert.match(runtime, /Pilih dari 26 widget/);
  assert.match(runtime, /Custom HTML \/ CSS \/ JavaScript/);
  assert.match(hotfix, /v259-code-gutter/);
});

test("mobile editor and Domain surfaces are protected from clipping", () => {
  assert.match(css, /\.ce-titlebar\{display:grid!important/);
  assert.match(css, /\.ce-actions\{grid-area:actions!important;display:grid!important;grid-template-columns:1fr 1fr!important/);
  assert.match(css, /\.ce-tabs,.ce-ribbon\{overflow-x:auto!important/);
  assert.match(css, /\.sv124-free-domain>aside\{display:grid!important;grid-template-columns:1fr!important/);
  assert.match(css, /\.sv124-domain-register form\{display:grid!important;grid-template-columns:1fr!important/);
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
