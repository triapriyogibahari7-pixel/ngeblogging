import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-sidebar-recovery-v276.js");
const css = read("src/studio-sidebar-recovery-v276.css");
const studio = read("src/StudioNext.jsx");

const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v276 loads after v275 as the final sidebar authority", () => {
  assert.ok(entry.indexOf('import "./studio-sidebar-recovery-v276.js";') > entry.indexOf('import "./studio-final-stability-v275.css";'));
  assert.ok(entry.indexOf('import "./studio-sidebar-recovery-v276.css";') > entry.indexOf('import "./studio-sidebar-recovery-v276.js";'));
  assert.match(runtime, /studio-sidebar-recovery-v276-20260804/);
});

test("device mode follows the React shell before html fallback", () => {
  const shellRead = runtime.indexOf("studioShell?.dataset?.deviceMode");
  const rootRead = runtime.indexOf("document.documentElement.dataset.studioDeviceMode");
  assert.ok(shellRead >= 0 && rootRead > shellRead);
  assert.match(runtime, /min-width: 761px/);
  assert.match(css, /\.sn-shell\[data-device-mode="large"\] > #ngeblogging-studio-sidebar/);
  assert.match(css, /\.sn-shell\[data-device-mode="small"\] > #ngeblogging-studio-sidebar:not\(\.mobile-open\)/);
});

test("large sidebar can never be translated or hidden off canvas", () => {
  assert.match(css, /data-device-mode="large"[\s\S]*display:flex!important/);
  assert.match(css, /data-device-mode="large"[\s\S]*visibility:visible!important/);
  assert.match(css, /data-device-mode="large"[\s\S]*transform:translate3d\(0,0,0\)!important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.collapsed[\s\S]*--v276-side-rail/);
  assert.match(css, /collapsed \+ \.sn-main[\s\S]*margin-left:var\(--v276-side-rail\)!important/);
});

test("all mandatory sidebar items remain in the React source", () => {
  for (const label of menu) assert.ok(studio.includes(label), `missing ${label}`);
  assert.match(studio, /id="ngeblogging-studio-sidebar"/);
  assert.match(studio, /className="sn-logo-mark"/);
});

test("small mode closed state exposes exactly the internal n shell", () => {
  assert.match(css, /data-device-mode="small"[\s\S]*:not\(\.mobile-open\) > \.sn-logo > :not\(\.sn-logo-mark\)/);
  assert.match(css, /Old external\/duplicate toggles stay retired/);
  assert.match(runtime, /reactToggle\(\)/);
  assert.match(runtime, /event\.stopImmediatePropagation\(\)/);
});
