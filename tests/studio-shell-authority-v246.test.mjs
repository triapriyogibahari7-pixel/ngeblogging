import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const runtime = read("src/studio-shell-authority-v246.js");
const css = read("src/studio-shell-authority-v246.css");
const entry = read("src/Studio.jsx");
const studio = read("src/StudioNext.jsx");
const auth = read("src/lib/supabase.js");

const menus = ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"];

test("v246 is the last Studio shell authority", () => {
  const oldCss = entry.indexOf('import "./studio-stable-shell-v244-final.css"');
  const runtimeIndex = entry.indexOf('import "./studio-shell-authority-v246.js"');
  const cssIndex = entry.indexOf('import "./studio-shell-authority-v246.css"');
  assert.ok(oldCss >= 0 && runtimeIndex > oldCss && cssIndex > runtimeIndex);
});

test("v246 keeps every required sidebar action and a single visible n per responsive family", () => {
  for (const label of menus) {
    assert.ok(runtime.includes(label), `runtime missing ${label}`);
    assert.ok(studio.includes(label), `React source missing ${label}`);
  }
  assert.match(runtime, /v246-mobile-n/);
  assert.match(runtime, /v246-internal-n/);
  assert.match(css, /data-family="large"[^\n]*\.v246-mobile-n\{display:none!important\}/);
  assert.match(css, /data-family="small"\]\[data-sidebar="open"\][^\n]*\.v246-mobile-n\{visibility:hidden!important/);
  assert.match(css, /v246-brand-row>strong[\s\S]*display:block!important/);
});

test("v246 preserves six responsive classes and large desktop behavior", () => {
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) assert.ok(runtime.includes(`\"${mode}\"`));
  for (const variant of ["tablet", "laptop", "computer"]) assert.ok(runtime.includes(`\"${variant}\"`));
  assert.match(css, /--v246-open:248px/);
  assert.match(css, /--v246-rail:70px/);
  assert.match(css, /width:calc\(100% - var\(--v246-open\)\)!important/);
  assert.match(css, /width:calc\(100% - var\(--v246-rail\)\)!important/);
});

test("mobile drawer stays transparent and page geometry is never shifted permanently", () => {
  assert.match(css, /v246-drawer-hitarea[\s\S]*background:transparent!important/);
  assert.match(css, /data-studio-v246-family="small"\] \.sn-main\{width:100%!important;max-width:100%!important;margin-left:0!important\}/);
  assert.match(css, /overflow-x:clip!important/);
  assert.doesNotMatch(css, /backdrop-filter:blur/);
});

test("profile and settings are separate and logout remains explicit", () => {
  for (const action of ["profile", "settings", "add-site", "view-site", "logout"]) assert.ok(runtime.includes(`data-account=\"${action}\"`));
  assert.match(runtime, /if \(action === "logout"\) delegateClick\(legacyButton\("Keluar"\)\)/);
  assert.doesNotMatch(runtime, /signOut\s*\(/);
});

test("Nara small and medium remain non-modal with attachment controls preserved", () => {
  assert.match(css, /nara-assistant-layer\[data-v244-mode="nonmodal"\][\s\S]*pointer-events:none!important/);
  assert.match(css, /nara-assistant-backdrop\{display:none!important/);
  assert.match(css, /nara-composer-tools/);
  assert.match(css, /nara-attachment-menu-wrap>button/);
  assert.match(css, /ngeblogging-nara-attachments-v244/);
});

test("v245 production authentication remains persistent and configured", () => {
  for (const marker of [
    "PRODUCTION_SUPABASE_URL_V245",
    "PRODUCTION_SUPABASE_PUBLISHABLE_KEY_V245",
    'flowType: "pkce"',
    "persistSession: true",
    "autoRefreshToken: true",
    "gatewayFirstV190",
  ]) assert.ok(auth.includes(marker), `auth missing ${marker}`);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});
