import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-sidebar-brand-v246.js");
const css = read("src/studio-sidebar-brand-v246.css");
const studio = read("src/StudioNext.jsx");
const native248 = read("src/studio-native-stability-v248.js");
const nativeCss248 = read("src/studio-native-stability-v248.css");

const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v246 source remains recoverable but is not an active duplicate chrome", () => {
  assert.doesNotMatch(entry, /import "\.\/studio-sidebar-brand-v246\.js"/);
  assert.ok(entry.indexOf('import "./studio-sidebar-brand-v246.css"') >= 0);
  assert.ok(entry.indexOf('import "./studio-native-stability-v248.css"') > entry.indexOf('import "./studio-sidebar-brand-v246.css"'));
  assert.match(runtime, /studio-sidebar-brand-toggle-v246-20260803/);
  assert.match(native248, /restoreReactChrome/);
  assert.match(nativeCss248, /#ngeblogging-studio-chrome-v244/);
});

test("historical brand and toggle implementation is retained for rollback", () => {
  assert.match(runtime, /nText\.textContent/);
  assert.match(runtime, /Ngeblogging/);
  assert.match(runtime, /desktopExpanded = !desktopExpanded/);
  assert.match(runtime, /mobileOpen = !mobileOpen/);
  assert.match(css, /\.v244-internal-n::after/);
  assert.match(css, /content:"n"!important/);
  assert.match(css, /\.v244-brand-row>strong/);
});

test("v248 now owns large and small sidebar geometry", () => {
  assert.match(nativeCss248, /--v248-sidebar-open:248px/);
  assert.match(nativeCss248, /--v248-sidebar-rail:70px/);
  assert.match(nativeCss248, /data-studio-v248-sidebar="expanded"[\s\S]*margin-left:var\(--v248-sidebar-open\)!important/);
  assert.match(nativeCss248, /data-studio-v248-sidebar="collapsed"[\s\S]*margin-left:var\(--v248-sidebar-rail\)!important/);
  assert.match(nativeCss248, /data-studio-v248-family="small"[\s\S]*margin-left:0!important/);
});

test("required menus remain available in native React source", () => {
  for (const label of menu) assert.ok(studio.includes(label), `missing ${label}`);
});
