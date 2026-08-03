import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-real-device-v236.js");
const css = read("src/studio-real-device-v236.css");
const v234 = read("src/studio-production-v234.js");
const v235 = read("src/studio-production-v235.js");
const v242 = read("src/studio-shell-rescue-v242.js");
const v248 = read("src/studio-regression-guard-v248.js");
const v248Css = read("src/studio-regression-guard-v248.css");
const authReadiness = read("src/auth-readiness-bridge.js");
const widgetSystem = read("src/widget-system.js");
const themeCatalog = read("src/theme-catalog.js");
const auth = read("src/lib/supabase.js");
const editor = read("src/ContentEditor.jsx");
const nara = read("src/NaraAssistant.jsx");
const finalizer = read("scripts/patch-production-v248.mjs");

const requiredMenu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v248 retires the duplicate v244-v247 chrome while keeping v234-v242 feature authorities", () => {
  for (const retired of [
    "studio-stable-shell-v244.js",
    "studio-stable-shell-v244-final.css",
    "studio-sidebar-brand-v246.js",
    "studio-sidebar-brand-v246.css",
    "studio-screenshot-lock-v247.css",
  ]) assert.doesNotMatch(entry, new RegExp(retired.replaceAll(".", "\\.")));

  for (const preserved of [
    "studio-production-v234.js",
    "studio-production-v235-widget-target.js",
    "studio-react-safe-v240.js",
    "studio-visual-stability-v241.js",
    "studio-shell-rescue-v242.js",
    "studio-regression-guard-v248.js",
  ]) assert.ok(entry.includes(preserved), `missing ${preserved}`);
  assert.ok(entry.indexOf("studio-regression-guard-v248.js") > entry.indexOf("studio-shell-rescue-v242.js"));
  assert.match(v248, /removeConflictingChrome/);
  assert.match(v248, /ngeblogging-studio-chrome-v244/);
  assert.match(v248Css, /data-v248-family="small"/);
  assert.match(v248Css, /data-v248-family="large"/);
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
  assert.match(v248Css, /\.sv124-free-domain>aside[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(v248Css, /white-space:nowrap!important/);
  assert.match(v248Css, /writing-mode:horizontal-tb!important/);
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

test("v234 layout map remains four left, content center and four right with real widget targeting", () => {
  for (const slot of ["sidebar-left-1","sidebar-left-2","sidebar-left-3","sidebar-left-4","content-main","sidebar-right-1","sidebar-right-2","sidebar-right-3","sidebar-right-4"]) {
    assert.ok(v234.includes(`"${slot}"`) || v235.includes(`"${slot}"`), `missing ${slot}`);
  }
  assert.match(v234, /GRID_PLACEMENT/);
  assert.match(v234, /v234-layout-popover/);
  assert.match(v234, /HTML \/ JavaScript/);
  assert.match(v234, /Buka semua 26 widget/);
  assert.match(v248Css, /\.tn-code-workspace[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(v248Css, /\.tn-code-preview-pane\{order:1/);
  assert.match(v248Css, /\.tn-code-pane\{order:2/);
});

test("Nara keeps Camera Photo File model intelligence and non-modal small/medium geometry", () => {
  assert.match(nara, /<Camera \/>[\s\S]*<b>Kamera<\/b>/);
  assert.match(nara, /<ImageIcon \/>[\s\S]*<b>Foto<\/b>/);
  assert.match(nara, /<File \/>[\s\S]*<b>File teks<\/b>/);
  assert.match(nara, /intelligenceOptions/);
  assert.match(nara, /modelOptions/);
  assert.match(v242, /v242-nara-attachment-menu/);
  assert.match(v242, /Kamera/);
  assert.match(v242, /Foto/);
  assert.match(v242, /File/);
  assert.match(v248Css, /data-nara-interaction="small"/);
  assert.match(v248Css, /data-nara-interaction="medium"/);
  assert.match(v248Css, /pointer-events:none!important/);
  assert.match(v248Css, /nara-assistant-header button\[title="Tutup"\]/);
});

test("profile and Settings remain separate while the profile surface keeps useful account actions", () => {
  for (const action of ["profile","settings","add-site","view-site","logout"]) assert.ok(v242.includes(`data-action="${action}"`), `missing profile action ${action}`);
  assert.match(v242, /Avatar, identitas, biografi, dan website/);
  assert.match(v242, /Konfigurasi situs aktif/);
  assert.match(v248, /Buka menu profil/);
});

test("health probe failures never hide or disable auth methods", () => {
  assert.match(authReadiness, /auth-readiness-nondestructive-v248/);
  assert.match(authReadiness, /Opsi login tetap aktif/);
  assert.doesNotMatch(authReadiness, /hideUnavailableEmailActions|leaveSignupMode/);
  assert.doesNotMatch(authReadiness, /\.hidden\s*=\s*true|\.disabled\s*=\s*true/);
  for (const marker of ["signInWithProvider","signInWithPassword","signInWithMagicLink","persistSession: true","autoRefreshToken: true"]) assert.ok(auth.includes(marker), `missing auth contract ${marker}`);
});

test("v248 build finalizer rotates cache without forced navigation or logout", () => {
  assert.match(finalizer, /ngeblogging-app-v248-auth-ui-regression-20260803/);
  assert.match(finalizer, /auth-ui-regression-cache-v248/);
  assert.match(finalizer, /NGE_BLOGGING_UPDATE_AVAILABLE_V248/);
  assert.match(finalizer, /V248_FORCED_NAVIGATION_REMAINS/);
  assert.doesNotMatch(v248, /localStorage\.clear|sessionStorage\.clear|signOut\(/);
});

test("all required sidebar labels remain in the production Studio source", () => {
  const studio = read("src/StudioNext.jsx");
  for (const label of requiredMenu) assert.ok(studio.includes(label), `missing sidebar label ${label}`);
});
