import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const bridge = read("src/studio-sidebar-single-toggle-v267.js");
const v276 = read("src/studio-sidebar-recovery-v276.js");
const runtime = read("src/studio-interaction-authority-v277.js");
const css = read("src/studio-interaction-authority-v277.css");
const studio = read("src/StudioNext.jsx");
const profile = read("src/studio-profile-menu-v268.js");
const nara = read("src/NaraAssistant.jsx");
const themeCatalog = read("src/theme-catalog.js");
const widgets = read("src/widget-system.js");
const layout = read("src/studio-theme-layout-v264.js");
const auth = read("src/lib/supabase.js");

const requiredMenu = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];

test("v277 is the last Studio authority while v276 owns the single n click", () => {
  assert.ok(entry.indexOf('import "./studio-interaction-authority-v277.js";') > entry.indexOf('import "./studio-sidebar-recovery-v276.css";'));
  assert.ok(entry.indexOf('import "./studio-interaction-authority-v277.css";') > entry.indexOf('import "./studio-interaction-authority-v277.js";'));
  assert.doesNotMatch(bridge, /^import "\.\/studio-final-stability-v275\.js";/m);
  assert.match(bridge, /studio-final-stability-v275\.js/);
  assert.match(v276, /function activateLogo/);
  assert.match(v276, /stopImmediatePropagation\(\)/);
  assert.doesNotMatch(runtime, /function activateLogo/);
  assert.match(runtime, /studio-interaction-authority-v277-20260804/);
});

test("all sidebar items remain and large collapsed rail keeps icons visible", () => {
  for (const label of requiredMenu) assert.ok(studio.includes(label), `missing sidebar item: ${label}`);
  assert.match(css, /data-device-mode="large"[\s\S]*#ngeblogging-studio-sidebar\.collapsed/);
  assert.match(css, /collapsed>nav>button[\s\S]*width:48px!important/);
  assert.match(css, /data-device-mode="small"[\s\S]*#ngeblogging-studio-sidebar:not\(\.mobile-open\)/);
  assert.match(css, /mobile-open[\s\S]*height:100dvh!important/);
});

test("profile, Nara and compact interaction surfaces remain usable", () => {
  for (const action of ["Profil", "Tambahkan situs", "Pengaturan", "Nara AI", "Keluar"]) assert.ok(profile.includes(action));
  assert.match(runtime, /normalizeProfile/);
  assert.match(css, /\.sn-top \.sn-avatar[\s\S]*visibility:visible!important/);
  assert.match(css, /\.nara-floating-button[\s\S]*position:fixed!important/);
  assert.match(css, /data-nara-interaction="nonmodal"[\s\S]*pointer-events:none!important/);
  assert.match(css, /\.nara-attachment-menu[\s\S]*bottom:calc\(100% \+ 8px\)!important/);
  assert.match(nara, /cameraInput\.current\?\.click\(\)/);
  assert.match(nara, /imageInput\.current\?\.click\(\)/);
  assert.match(nara, /fileInput\.current\?\.click\(\)/);
});

test("Theme and code editor contracts remain intact", () => {
  const families = [...themeCatalog.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themeCatalog.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.equal([...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length, 26);
  for (const area of ["sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4", "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"]) assert.ok(layout.includes(area));
  assert.match(runtime, /MAX_CODE_LINES = 10000/);
  assert.match(css, /grid-template-areas:"code preview"!important/);
  assert.match(css, /grid-template-areas:"code" "preview"!important/);
  assert.match(css, /\.v277-code-lines/);
});

test("v277 does not sign users out or destroy persisted sessions", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.doesNotMatch(runtime, /signOut\(|localStorage\.clear|sessionStorage\.clear|location\.reload\(/);
});
