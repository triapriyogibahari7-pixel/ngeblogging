import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-native-controls-v281.js");
const css = read("src/studio-native-controls-v281.css");
const clickOwner = read("src/studio-shell-precision-v278.js");
const studio = read("src/StudioNext.jsx");
const modes = read("src/studio-device-mode-v140.js");
const profile = read("src/studio-profile-menu-v268.js");
const nara = read("src/NaraAssistant.jsx");
const themes = read("src/theme-catalog.js");
const widgets = read("src/widget-system.js");
const layout = read("src/studio-theme-layout-v264.js");
const analytics = read("src/studio-analytics-v41.js");
const auth = read("src/lib/supabase.js");
const domain = read("src/DomainPanelV124.jsx");

const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v281 is final, lightweight and does not reintroduce scroll-time DOM churn", () => {
  assert.ok(entry.indexOf('import "./studio-native-controls-v281.js";') > entry.indexOf('import "./studio-native-shell-v280.css";'));
  assert.ok(entry.indexOf('import "./studio-native-controls-v281.css";') > entry.indexOf('import "./studio-native-controls-v281.js";'));
  assert.match(runtime, /studio-native-controls-v281-20260805/);
  assert.doesNotMatch(runtime, /addEventListener\("scroll"/);
  assert.doesNotMatch(runtime, /new MutationObserver/);
});

test("touch-safe single n click owns complete sidebar on six responsive families", () => {
  for (const label of menu) assert.ok(studio.includes(label), `missing sidebar item ${label}`);
  for (const mode of ["application","phone","mobile","compact","tablet","desktop"]) assert.ok(modes.includes(`"${mode}"`));
  assert.doesNotMatch(clickOwner, /window\.addEventListener\("pointerdown",\s*stopLegacyPointer,\s*true\)/);
  assert.match(clickOwner, /window\.addEventListener\("click",\s*activateLogo,\s*true\)/);
  assert.match(clickOwner, /POINTERDOWN_CAPTURE_RETIRED_BY/);
  assert.match(css, /data-device-mode="small"[\s\S]*#ngeblogging-studio-sidebar:not\(\.mobile-open\)/);
  assert.match(css, /data-device-mode="small"[\s\S]*#ngeblogging-studio-sidebar\.mobile-open/);
  assert.match(css, /data-device-mode="large"[\s\S]*#ngeblogging-studio-sidebar\.collapsed/);
  assert.match(css, /--v281-side-rail:72px/);
  assert.match(css, /\.sn-logo-mark strong[\s\S]*place-items:center!important/);
  assert.match(css, /body\.sn-mobile-sidebar-open[\s\S]*filter:none!important/);
});

test("profile remains visible and exposes five separate account actions", () => {
  for (const action of ["Profil","Tambahkan situs","Pengaturan","Nara AI","Keluar"]) assert.ok(profile.includes(action));
  assert.match(css, /\.sn-main>\.sn-top \.sn-avatar[\s\S]*visibility:visible!important/);
  assert.match(css, /\.sn-profile-menu-v150[\s\S]*position:fixed!important/);
});

test("Nara stays fixed and non-modal while all requested controls remain present", () => {
  assert.match(css, /\.nara-floating-button[\s\S]*position:fixed!important/);
  assert.match(css, /data-nara-interaction="nonmodal"[\s\S]*pointer-events:none!important/);
  assert.match(css, /\.nara-attachment-menu[\s\S]*bottom:calc\(100% \+ 9px\)!important/);
  assert.match(css, /max-width:350px[\s\S]*\.nara-select\.intelligence\{display:flex!important/);
  assert.match(nara, /cameraInput\.current\?\.click\(\)/);
  assert.match(nara, /imageInput\.current\?\.click\(\)/);
  assert.match(nara, /fileInput\.current\?\.click\(\)/);
  assert.match(nara, /SpeechRecognition/);
  assert.match(nara, /speechSynthesis/);
  for (const label of ["Nara Mini","Nara Writer","Nara Vision","Nara Max","Instan","Sedang","Tinggi","Maksimal"]) assert.ok(nara.includes(label));
});

test("Posts and Pages keep drafts but prevent publication above 5000 words", () => {
  assert.match(runtime, /MAX_CONTENT_WORDS = 5000/);
  assert.match(runtime, /CONTENT_WARNING_WORDS = 4500/);
  assert.match(runtime, /guardContentPublish/);
  assert.match(runtime, /Draf dan isi tidak dihapus/);
  assert.match(css, /\.ce-titlebar[\s\S]*grid-template-columns:42px minmax\(0,1fr\)/);
  assert.match(css, /\.ce-tabs[\s\S]*overflow-x:auto!important/);
});

test("Theme Studio keeps 100 themes, 26 real areas, centered post and readable mobile map", () => {
  const families = [...themes.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themes.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.equal([...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length, 26);
  for (const area of ["sidebar-left-1","sidebar-left-2","sidebar-left-3","sidebar-left-4","sidebar-right-1","sidebar-right-2","sidebar-right-3","sidebar-right-4"]) assert.ok(layout.includes(area));
  assert.match(layout, /tn-layout-popover-v264/);
  assert.match(layout, /Edit HTML \/ CSS \/ JavaScript/);
  assert.match(css, /\.tn-layout-map-v264\{display:grid!important;width:660px!important;min-width:660px!important/);
  assert.match(css, /\.tn-layout-content-v264\{grid-template-columns:145px 340px 145px!important/);
  assert.match(css, /\.tn-layout-post-v264[\s\S]*grid-column:2!important/);
});

test("code editor is 50:50 on large mode, preview-first stacked on small mode, and has one real numbered gutter", () => {
  assert.match(runtime, /MAX_CODE_LINES = 10000/);
  assert.match(runtime, /if \(v277 && v275\) v275\.remove\(\)/);
  assert.match(css, /data-device-mode="large"[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css, /grid-template-areas:"code preview"!important/);
  assert.match(css, /grid-template-areas:"preview" "code"!important/);
  assert.match(css, /\.tn-code-pane>\.v275-code-lines\{display:none!important\}/);
  assert.match(css, /\.tn-code-pane textarea[\s\S]*min-height:560px!important/);
});

test("production analytics and Domain stay real and responsive", () => {
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(analytics, /DATA PRODUKSI NYATA/);
  assert.match(css, /\.op41-line[\s\S]*min-height:300px!important/);
  assert.match(css, /\.op41-donut[\s\S]*max-width:240px!important/);
  assert.match(domain, /Jadikan draf/);
  assert.match(domain, /Terbitkan/);
  assert.match(css, /\.sv124-free-domain>aside :is\(button,a\)[\s\S]*white-space:nowrap!important/);
});

test("persisted auth remains non-destructive", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|location\.reload\s*\(/);
});
