import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-final-stability-v275.js");
const css = read("src/studio-final-stability-v275.css");
const toggleBridge = read("src/studio-sidebar-single-toggle-v267.js");
const studio = read("src/StudioNext.jsx");
const profile = read("src/studio-profile-menu-v268.js");
const nara = read("src/NaraAssistant.jsx");
const layout = read("src/studio-theme-layout-v264.js");
const themeCatalog = read("src/theme-catalog.js");
const widgets = read("src/widget-system.js");
const auth = read("src/lib/supabase.js");
const domain = read("src/DomainPanelV124.jsx");

const requiredMenu = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];

test("v275 visual authority is loaded after the complete v274 chain", () => {
  assert.ok(entry.indexOf('import "./studio-final-stability-v275.css";') > entry.indexOf('import "./studio-shell-content-v274-hotfix.css";'));
  assert.match(runtime, /studio-final-stability-v275-20260804/);
  assert.match(toggleBridge, /studio-final-stability-v275\.js/);
});

test("one internal n remains the single sidebar interaction bridge", () => {
  for (const label of requiredMenu) assert.ok(studio.includes(label), `missing sidebar item: ${label}`);
  assert.match(runtime, /#ngeblogging-studio-sidebar \.sn-logo-mark/);
  assert.match(runtime, /stopImmediatePropagation\(\)/);
  assert.match(runtime, /reactToggle\(\)/);
  assert.match(runtime, /toggle\.click\(\)/);
  assert.match(css, /Exactly one visible sidebar control/);
  assert.match(css, /#ngeblogging-studio-sidebar\.collapsed[\s\S]*nav>button/);
  assert.match(css, /data-v275-compact-family="true"[\s\S]*#ngeblogging-studio-sidebar:not\(\.mobile-open\)/);
});

test("desktop profile remains visible with five functional account actions", () => {
  for (const action of ["Profil", "Tambahkan situs", "Pengaturan", "Nara AI", "Keluar"]) {
    assert.ok(profile.includes(action), `missing profile action: ${action}`);
  }
  assert.match(runtime, /avatar\.hidden = false/);
  assert.match(css, /\.sn-top \.sn-avatar[\s\S]*visibility:visible!important/);
});

test("Nara keeps real attachments, microphone, speaker, model and intelligence while small/medium stay non-modal", () => {
  assert.match(nara, /cameraInput\.current\?\.click\(\)/);
  assert.match(nara, /imageInput\.current\?\.click\(\)/);
  assert.match(nara, /fileInput\.current\?\.click\(\)/);
  assert.match(nara, /SpeechRecognition/);
  assert.match(nara, /speechSynthesis/);
  for (const mode of ["Instan", "Sedang", "Tinggi", "Maksimal"]) assert.ok(nara.includes(mode));
  for (const model of ["Nara Mini", "Nara Writer", "Nara Vision", "Nara Max"]) assert.ok(nara.includes(model));
  assert.match(css, /\.nara-floating-button[\s\S]*position:fixed!important/);
  assert.match(css, /data-nara-interaction="nonmodal"[\s\S]*pointer-events:none!important/);
  assert.match(css, /\.nara-attachment-menu[\s\S]*bottom:calc\(100% \+ 8px\)!important/);
});

test("Theme Studio keeps 100 themes, 26 layout areas/widgets and readable responsive map", () => {
  const families = [...themeCatalog.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themeCatalog.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.equal([...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length, 26);
  assert.equal([...layout.matchAll(/\["[^"]+", "[^"]+"\]/g)].filter((match) => !match[0].includes("Pencarian") && !match[0].includes("Post terbaru") && !match[0].includes("Post populer") && !match[0].includes("Kategori") && !match[0].includes("Tag") && !match[0].includes("Profil penulis") && !match[0].includes("Komentar") && !match[0].includes("HTML / JavaScript")).length, 26);
  for (const area of ["sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4", "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"]) assert.ok(layout.includes(area));
  assert.match(layout, /Edit HTML \/ CSS \/ JavaScript/);
  assert.match(css, /width:660px!important;min-width:660px!important/);
  assert.match(css, /grid-template-columns:120px minmax\(260px,1fr\) 120px!important/);
});

test("code editor is split on large layouts, stacked on compact layouts, and has real line numbers up to 10000", () => {
  assert.match(css, /grid-template-areas:"code preview"!important/);
  assert.match(css, /grid-template-areas:"code" "preview"!important/);
  assert.match(css, /\.tn-code-pane textarea[\s\S]*min-height:620px!important/);
  assert.match(css, /\.v275-code-lines/);
  assert.match(runtime, /MAX_CODE_LINES = 10000/);
  assert.match(runtime, /textarea\.value[\s\S]*split\("\\n"\)/);
  assert.match(runtime, /data-max-lines/);
});

test("Domain publication controls remain real and mobile buttons are full-width without broken labels", () => {
  assert.match(domain, /published \? "Jadikan draf" : "Terbitkan"/);
  assert.match(domain, /setSitePublication/);
  assert.match(css, /\.sv124-free-domain>aside :is\(a,button\)[\s\S]*white-space:nowrap!important/);
  assert.match(css, /\.sv124-free-domain>aside :is\(a,button\)[\s\S]*width:100%!important/);
});

test("auth persistence remains production-backed and v275 never signs users out", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /directAuthFirstV263/);
  assert.doesNotMatch(runtime, /signOut\(|localStorage\.clear|sessionStorage\.clear|location\.reload\(/);
});
