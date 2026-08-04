import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studio = read("src/Studio.jsx");
const runtime = read("src/studio-completion-v266.js");
const css = read("src/studio-completion-v266.css");
const theme = read("src/ThemeStudio.jsx");
const nara = read("src/NaraAssistant.jsx");
const analytics = read("src/studio-analytics-v41.js");
const sw = read("public/sw.js");

test("v266 loads after screenshot authority v265", () => {
  const v265 = studio.indexOf('import "./studio-screenshot-authority-v265.css";');
  const runtime266 = studio.indexOf('import "./studio-completion-v266.js";');
  const css266 = studio.indexOf('import "./studio-completion-v266.css";');
  assert.ok(v265 >= 0);
  assert.ok(runtime266 > v265);
  assert.ok(css266 > runtime266);
});

test("desktop sidebar state persists while small family remains drawer-owned", () => {
  assert.match(runtime, /SIDEBAR_KEY/);
  assert.match(runtime, /localStorage\.getItem/);
  assert.match(runtime, /localStorage\.setItem/);
  assert.match(runtime, /studio-v265-small/);
  assert.match(runtime, /side\.classList\.contains\("collapsed"\)/);
});

test("Analytics is production-first and simulation remains explicitly labeled", () => {
  assert.match(runtime, /loadAnalytics\(view, 30, false\)/);
  assert.match(analytics, /DATA PRODUKSI NYATA/);
  assert.match(analytics, /SIMULASI TAMPILAN — BUKAN DATA PRODUKSI/);
  assert.doesNotMatch(runtime, /simulationDashboard|Math\.random/);
  assert.match(css, /\.op41-line/);
  assert.match(css, /\.op41-donut/);
});

test("Theme editor preserves eight profiles and responsive code-preview layout", () => {
  for (const label of ["Aplikasi", "Handphone", "Mobile", "Perangkat kecil", "Tablet", "Laptop", "Situs desktop", "Komputer"]) {
    assert.ok(theme.includes(label), `missing Theme preview profile ${label}`);
  }
  assert.match(css, /studio-v265-large \.tn-code-workspace/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /studio-v265-small \.tn-code-workspace/);
  assert.match(css, /ui-monospace/);
  assert.match(css, /\.tn-layout-map-v264/);
});

test("Nara camera photo microphone speaker model and intelligence remain available", () => {
  for (const marker of ["Camera", "ImageIcon", "Mic", "SpeakerIcon", "intelligenceOptions", "modelOptions"]) {
    assert.ok(nara.includes(marker), `missing Nara marker ${marker}`);
  }
  assert.match(css, /\.nara-composer-tools/);
  assert.match(css, /grid-template-columns:40px 40px/);
});

test("Domain mobile actions are full width and readable", () => {
  assert.match(css, /\.sv124-free-domain>aside/);
  assert.match(css, /width:100%!important/);
  assert.match(css, /writing-mode:horizontal-tb!important/);
});

test("existing service worker protects auth surfaces from activation navigation", () => {
  assert.match(sw, /isAuthSurface\(url\)/);
  assert.match(sw, /reloadRequired: false/);
  const notify = sw.match(/async function notifyOpenWindows\([\s\S]*?\n\}/)?.[0] || "";
  assert.match(notify, /isAuthSurface\(url\)\) return/);
  assert.doesNotMatch(notify, /client\.navigate\(/);
});
