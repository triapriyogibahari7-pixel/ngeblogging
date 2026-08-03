import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-sidebar-brand-v246.js");
const css = read("src/studio-sidebar-brand-v246.css");
const studio = read("src/StudioNext.jsx");

const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v246 is loaded last", () => {
  assert.ok(entry.indexOf("studio-sidebar-brand-v246.js") > entry.indexOf("studio-stable-shell-v244-final.css"));
  assert.ok(entry.indexOf("studio-sidebar-brand-v246.css") > entry.indexOf("studio-sidebar-brand-v246.js"));
  assert.match(runtime, /studio-sidebar-brand-toggle-v246-20260803/);
});

test("brand and toggle are explicit", () => {
  assert.match(runtime, /nText\.textContent/);
  assert.match(runtime, /Ngeblogging/);
  assert.match(runtime, /desktopExpanded = !desktopExpanded/);
  assert.match(runtime, /mobileOpen = !mobileOpen/);
  assert.match(css, /\.v244-internal-n::after/);
  assert.match(css, /content:"n"!important/);
  assert.match(css, /\.v244-brand-row>strong/);
});

test("large layout follows sidebar width", () => {
  assert.match(css, /--v246-open:248px/);
  assert.match(css, /--v246-rail:70px/);
  assert.match(css, /data-studio-v246-sidebar="expanded"[\s\S]*margin-left:var\(--v246-open\)!important/);
  assert.match(css, /data-studio-v246-sidebar="collapsed"[\s\S]*margin-left:var\(--v246-rail\)!important/);
});

test("small drawer remains transparent and content does not shift", () => {
  assert.match(css, /data-v246-family="small"/);
  assert.match(css, /background:transparent!important/);
  assert.match(css, /data-studio-v246-family="small"[\s\S]*margin-left:0!important/);
});

test("required menus remain available", () => {
  for (const label of menu) assert.ok(studio.includes(label), `missing ${label}`);
});
