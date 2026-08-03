import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const legacyRuntime = read("src/studio-sidebar-brand-v246.js");
const v248 = read("src/studio-regression-guard-v248.js");
const v248Css = read("src/studio-regression-guard-v248.css");
const studio = read("src/StudioNext.jsx");

const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v246 remains available as history but no longer owns live clicks", () => {
  assert.match(legacyRuntime, /studio-sidebar-brand-toggle-v246-20260803/);
  assert.match(legacyRuntime, /desktopExpanded = !desktopExpanded/);
  assert.match(legacyRuntime, /mobileOpen = !mobileOpen/);
  assert.doesNotMatch(entry, /studio-sidebar-brand-v246\.js/);
  assert.doesNotMatch(entry, /studio-sidebar-brand-v246\.css/);
  assert.match(v248, /normalizeSidebar/);
});

test("v248 has one centered n and large content follows sidebar width", () => {
  assert.match(v248Css, /--v248-open:248px/);
  assert.match(v248Css, /--v248-rail:70px/);
  assert.match(v248Css, /\.sn-logo-mark[\s\S]*place-items:center!important/);
  assert.match(v248Css, /data-v248-family="large"[\s\S]*margin-left:var\(--v248-open\)!important/);
  assert.match(v248Css, /\.collapsed\+\.sn-main[\s\S]*margin-left:var\(--v248-rail\)!important/);
});

test("required menus remain available", () => {
  for (const label of menu) assert.ok(studio.includes(label), `missing ${label}`);
});
