import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import "./studio-stable-source-shell-v244.test.mjs";
import "./studio-sidebar-brand-v246.test.mjs";
import "./studio-screenshot-lock-v247.test.mjs";
import "./studio-source-stability-v252.test.mjs";
import "./studio-shell-nara-v253.test.mjs";
import "./studio-shell-interaction-v255.test.mjs";
import "./studio-production-order-v256.test.mjs";
import "./studio-visual-native-v257.test.mjs";
import "./studio-theme-right4-v258.test.mjs";
import "./studio-six-mode-authority-v259.test.mjs";
import "./studio-v263-regression.test.mjs";
import "./studio-shell-v265.test.mjs";
import "./studio-editor-navigation-v266.test.mjs";
import "./studio-fixed-chrome-v267.test.mjs";
import "./studio-scroll-chrome-v270.test.mjs";
import "./nara-global-authority-v271.test.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-real-device-v236.js");
const css = read("src/studio-real-device-v236.css");
const v235 = read("src/studio-production-v235.js");
const widgetSystem = read("src/widget-system.js");
const themeCatalog = read("src/theme-catalog.js");
const auth = read("src/lib/supabase.js");
const editor = read("src/ContentEditor.jsx");
const nara = read("src/NaraAssistant.jsx");

const requiredMenu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v236 is the final Studio authority after v235", () => {
  const v235Index = entry.indexOf('import "./studio-production-v235-widget-target.js"');
  const v236Index = entry.indexOf('import "./studio-real-device-v236.js"');
  assert.ok(v235Index >= 0);
  assert.ok(v236Index > v235Index);
  assert.match(runtime, /studio-real-device-v236-20260803/);
});

test("mobile editor keeps Preview and publish as two readable full-width actions", () => {
  assert.match(editor, /> Preview<\/button>/);
  assert.match(editor, /"Jadikan draf"[\s\S]*"Terbitkan"/);
  assert.match(css, /grid-template-areas:"back file" "actions actions"/);
  assert.match(css, /\.ce-actions[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /\.ce-actions button[\s\S]*min-height:46px!important/);
  assert.match(css, /\.ce-tabs[\s\S]*overflow-x:auto!important/);
  assert.match(css, /\.ce-ribbon[\s\S]*overflow-x:auto!important/);
});

test("Domain small-device actions cannot collapse into vertical pills", () => {
  assert.match(runtime, /v236DomainAction/);
  assert.match(css, /\.sv124-free-domain>aside[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /\[data-v236-domain-action="true"\][\s\S]*width:100%!important/);
  assert.match(css, /white-space:nowrap!important/);
  assert.match(css, /writing-mode:horizontal-tb!important/);
});

test("theme library and Widget Studio are bounded instead of overlapping", () => {
  assert.match(css, /\.tn-category-tabs[\s\S]*overflow-x:auto!important/);
  assert.match(css, /\.tn-theme-grid[\s\S]*grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css, /\.tn-modal>header h2[\s\S]*white-space:normal!important/);
  assert.match(css, /\.tn-widget-summary[\s\S]*grid-template-columns:38px minmax\(0,1fr\) auto/);
  assert.match(css, /\.tn-widget-grid[\s\S]*repeat\(2,minmax\(0,1fr\)\)/);
});

test("100-theme architecture and all 26 real widgets remain preserved", () => {
  const families = [...themeCatalog.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themeCatalog.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.match(themeCatalog, /FAMILIES\.flatMap/);
  assert.match(widgetSystem, /export const BUILT_IN_WIDGETS = \[/);
  assert.match(widgetSystem, /id: "custom-html"/);
  assert.match(widgetSystem, /export const WIDGET_COUNT = BUILT_IN_WIDGETS\.length/);
  const widgetIds = [...widgetSystem.matchAll(/\{ id: "[^"]+", name:/g)].length;
  assert.equal(widgetIds, 26);
});

test("v235 layout map remains four left, content center and four right with real widget targeting", () => {
  for (const slot of ["sidebar-left-1","sidebar-left-2","sidebar-left-3","sidebar-left-4","content-main","sidebar-right-1","sidebar-right-2","sidebar-right-3","sidebar-right-4"]) {
    assert.ok(v235.includes(`"${slot}"`), `missing ${slot}`);
  }
  assert.match(v235, /v235-layout-popover/);
  assert.match(v235, /HTML \/ JavaScript/);
});

test("Nara keeps native Camera Photo File plus model and intelligence, with viewport-safe portal", () => {
  assert.match(nara, /<Camera \/>[\s\S]*<b>Kamera<\/b>/);
  assert.match(nara, /<ImageIcon \/>[\s\S]*<b>Foto<\/b>/);
  assert.match(nara, /<File \/>[\s\S]*<b>File teks<\/b>/);
  assert.match(nara, /intelligenceOptions/);
  assert.match(nara, /modelOptions/);
  assert.match(v235, /v235-nara-attachment-portal/);
  assert.match(css, /\.v235-nara-attachment-portal[\s\S]*position:fixed!important[\s\S]*pointer-events:auto!important/);
});

test("profile menu receives explicit add-site action while Profile and Settings stay separate", () => {
  assert.match(runtime, /data-action = "create-site"|dataset\.action = "create-site"/);
  assert.match(runtime, /\+ Tambahkan situs/);
  assert.match(v235, /data-action="profile"/);
  assert.match(v235, /data-action="settings"/);
  assert.match(v235, /data-action="logout"/);
  assert.match(runtime, /openSiteManager/);
});

test("session persistence is still mandatory and no v236 logout/clear-storage regression exists", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.doesNotMatch(runtime, /localStorage\.clear|sessionStorage\.clear|signOut\(/);
});

test("all required sidebar labels remain in the production Studio source", () => {
  const studio = read("src/StudioNext.jsx");
  for (const label of requiredMenu) assert.ok(studio.includes(label), `missing sidebar label ${label}`);
});
