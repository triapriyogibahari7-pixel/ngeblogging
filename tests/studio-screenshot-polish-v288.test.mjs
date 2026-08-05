import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v288 loads after the non-destructive v287 owner", async () => {
  const v286 = await read("src/studio-live-visual-v286.js");
  const runtime = await read("src/studio-screenshot-polish-v288.js");
  assert.match(v286, /import\("\.\/studio-react-shell-v287\.js"\)[\s\S]*then\(\(\) => import\("\.\/studio-screenshot-polish-v288\.js"\)\)/);
  assert.match(runtime, /studio-screenshot-polish-v288-20260805/);
  assert.doesNotMatch(runtime, /new MutationObserver|setInterval\s*\(|stopImmediatePropagation/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.(reload|replace)\s*\(/);
});

test("v288 keeps one-n sidebar mobile closing usable without a dark blocking backdrop", async () => {
  const runtime = await read("src/studio-screenshot-polish-v288.js");
  const css = await read("src/studio-screenshot-polish-v288.css");
  assert.match(runtime, /closeSmallDrawerAfterOutsideClick/);
  assert.match(runtime, /reactToggle\(\)/);
  assert.match(runtime, /#ngeblogging-studio-sidebar/);
  assert.match(css, /\.sn-shell\[data-device-mode="small"\] #ngeblogging-studio-sidebar\{position:fixed!important/);
  assert.match(css, /\.sn-side-backdrop\{background:transparent!important/);
  assert.match(css, /pointer-events:none!important/);
  assert.match(css, /\.sn-logo-mark strong\{display:grid!important;place-items:center!important/);
});

test("v288 adds a functional add-site entry to Ringkasan", async () => {
  const runtime = await read("src/studio-screenshot-polish-v288.js");
  const css = await read("src/studio-screenshot-polish-v288.css");
  assert.match(runtime, /ensureHomeAddSite/);
  assert.match(runtime, /\+ Tambahkan situs/);
  assert.match(runtime, /document\.querySelector\("\.sn-workspace"\)\?\.click\(\)/);
  assert.match(css, /\.sn-add-site-v288/);
});

test("v288 fixes Nara attachment geometry and preserves real native features", async () => {
  const runtime = await read("src/studio-screenshot-polish-v288.js");
  const css = await read("src/studio-screenshot-polish-v288.css");
  const nara = await read("src/NaraAssistant.jsx");
  assert.match(runtime, /nara-attachment-menu-wrap/);
  assert.match(runtime, /nara-select\.intelligence/);
  assert.match(runtime, /nara-select\.model/);
  assert.match(css, /\.nara-floating-button\{position:fixed!important/);
  assert.match(css, /\.nara-attachment-menu\{display:grid!important;position:absolute!important/);
  assert.match(css, /bottom:calc\(100% \+ 8px\)!important/);
  assert.match(css, /\.nara-assistant-header\{display:grid!important/);
  for (const marker of ["Kamera", "Foto", "File teks", "SpeechRecognition", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal", "/api/nara"]) {
    assert.ok(nara.includes(marker), `Nara marker missing: ${marker}`);
  }
});

test("v288 fits the real 26-slot Theme map to mobile and keeps code/preview responsive", async () => {
  const css = await read("src/studio-screenshot-polish-v288.css");
  const layout = await read("src/studio-theme-layout-v264.js");
  const controls = await read("src/studio-native-polish-v284.js");
  assert.match(css, /\.tn-layout-map-v264\{display:grid!important;width:min\(100%,760px\)!important;min-width:0!important/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*\.tn-layout-map-v264\{width:100%!important;min-width:0!important;max-width:100%!important/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
  assert.match(css, /grid-template-areas:"code preview"/);
  for (const area of ["sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4", "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"]) assert.ok(layout.includes(area), `Missing ${area}`);
  assert.match(layout, /Semua 26 widget/);
  assert.match(controls, /MAX_CODE_LINES = 10000/);
});

test("v288 keeps 100 themes and persistent auth source contracts", async () => {
  const catalog = await import(new URL("../src/theme-catalog.js", import.meta.url));
  const themeStudio = await read("src/ThemeStudio.jsx");
  const auth = await read("src/lib/supabase.js");
  assert.equal(catalog.THEME_COUNT, 100);
  for (const label of ["Aplikasi", "Handphone", "Mobile", "Perangkat kecil", "Tablet", "Laptop", "Situs desktop", "Komputer"]) assert.ok(themeStudio.includes(label), `Missing preview profile ${label}`);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /production-public-fallback/);
});
