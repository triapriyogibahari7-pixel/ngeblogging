import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studio = read("src/Studio.jsx");
const device = read("src/studio-device-mode-v140.js");
const runtime = read("src/studio-shell-v265.js");
const css = read("src/studio-shell-v265.css");
const source = read("src/StudioNext.jsx");
const nara = read("src/NaraAssistant.jsx");

test("v265 final shell loads after screenshot/theme authorities and v263 observer is retired", () => {
  const screenshotCss = studio.indexOf('import "./studio-screenshot-authority-v265.css";');
  const runtime265 = studio.indexOf('import "./studio-shell-v265.js";');
  const css265 = studio.indexOf('import "./studio-shell-v265.css";');
  assert.ok(screenshotCss >= 0);
  assert.ok(runtime265 > screenshotCss);
  assert.ok(css265 > runtime265);
  assert.doesNotMatch(studio, /^import "\.\/studio-runtime-v263\.js";/m);
  assert.match(studio, /v263 JS is kept as backup/);
});

test("physical Android desktop-site detection does not depend on a 900px viewport", () => {
  assert.match(device, /DESKTOP_SITE_MIN_LAYOUT = 620/);
  assert.match(device, /DESKTOP_SITE_WIDTH_RATIO = 1\.38/);
  assert.match(device, /view\.layoutWidth \/ physical >= DESKTOP_SITE_WIDTH_RATIO/);
  assert.match(device, /export function currentStudioDeviceMode\(\)[\s\S]*return detectStudioDeviceMode\(\)/);
  assert.match(device, /export function currentStudioResponsiveMode\(\)[\s\S]*return detectStudioResponsiveMode\(\)/);
});

test("large family always exposes one internal sidebar and centered collapsed icons", () => {
  assert.match(css, /html\.studio-v265-large #ngeblogging-studio-sidebar\{[\s\S]*display:flex!important[\s\S]*position:fixed!important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.collapsed :is\(\.sn-new,nav>button,\.sn-account-footer>button\)>span\{display:none!important\}/);
  assert.match(css, /#ngeblogging-studio-sidebar\.collapsed :is\(nav>button,\.sn-account-footer>button\)\{justify-content:center!important/);
  assert.match(css, /\.sn-sidebar-edge-toggle-v147[\s\S]*display:none!important/);
  for (const label of ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"]) {
    assert.ok(source.includes(label), `missing sidebar label ${label}`);
  }
});

test("small family has one n trigger and a bounded full-height drawer without blur", () => {
  assert.match(css, /html\.studio-v265-small \.sn-sidebar-toggle\{[\s\S]*display:grid!important/);
  assert.match(css, /html\.studio-v265-small #ngeblogging-studio-sidebar\{[\s\S]*translate3d\(-105%,0,0\)!important/);
  assert.match(css, /html\.studio-v265-small #ngeblogging-studio-sidebar\.mobile-open\{[\s\S]*translate3d\(0,0,0\)!important/);
  assert.match(css, /html\.studio-v265-small \.sn-side-backdrop\{[\s\S]*background:transparent!important[\s\S]*backdrop-filter:none!important/);
  assert.match(css, /body\.sn-mobile-sidebar-open \.sn-sidebar-toggle\{display:none!important/);
});

test("home content cannot overlap its section heading on compact devices", () => {
  assert.match(css, /\.sn-home-grid>section>header\{[\s\S]*position:static!important/);
  assert.match(css, /\.sn-home-grid>section>header h2\{position:static!important/);
  assert.match(css, /\.sn-home-grid>section>button\{[\s\S]*position:relative!important[\s\S]*width:100%!important/);
});

test("Nara stays fixed, non-modal in small and medium, and keeps attachment tools", () => {
  assert.match(css, /\.nara-floating-button\{[\s\S]*position:fixed!important[\s\S]*bottom:var\(--v265-safe-bottom\)!important/);
  assert.match(css, /\.nara-assistant-layer\{[\s\S]*pointer-events:none!important/);
  assert.match(runtime, /const full = size === "full"/);
  assert.match(runtime, /backdrop\.hidden = !full/);
  assert.doesNotMatch(runtime, /launcher\.hidden = false/);
  assert.match(css, /\.nara-attachment-menu\{[\s\S]*bottom:calc\(100% \+ 8px\)!important/);
  for (const marker of ["Kamera", "Foto", "File teks", "Mic", "SpeakerIcon", "Instan", "Sedang", "Tinggi"]) assert.ok(nara.includes(marker), `Nara missing ${marker}`);
});

test("Theme code editor uses real line-number gutter and responsive split geometry", () => {
  assert.match(runtime, /Math\.min\(10_000/);
  assert.match(runtime, /tn-code-gutter-v265/);
  assert.match(css, /html\.studio-v265-large \.tn-code-workspace\{[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css, /html\.studio-v265-small \.tn-code-workspace\{[\s\S]*grid-template-columns:1fr!important/);
  assert.match(css, /\.tn-code-pane textarea\{[\s\S]*white-space:pre!important[\s\S]*overflow:auto!important/);
});

test("v265 shell contains no automatic logout, storage wipe, or forced reload", () => {
  for (const text of [runtime, css]) {
    assert.doesNotMatch(text, /localStorage\.clear\s*\(/);
    assert.doesNotMatch(text, /sessionStorage\.clear\s*\(/);
    assert.doesNotMatch(text, /signOut\s*\(/);
    assert.doesNotMatch(text, /location\.reload\s*\(/);
  }
});
